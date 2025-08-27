import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Difficulty, Mode, QuestionType, QuizQuestion } from '@/types/quiz';

// ---------- Gemini Setup ----------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Prefer Flash by default; allow override via GEMINI_MODEL
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
// Auto fallback list (simple): if primary is flash -> fallback to pro, else fallback to flash
const DEFAULT_FALLBACKS = PRIMARY_MODEL.includes('flash') ? ['gemini-1.5-pro'] : ['gemini-1.5-flash'];
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const hasGemini = !!genAI;

// Emit a clear server-side hint if the key is missing so developers see why fallback is used
if (!hasGemini) {
  console.warn('[AI] GEMINI_API_KEY not set. Using local fallback questions. Add it to .env.local and restart the dev server.');
}

function getGeminiModel(model: string) {
  if (!genAI) {
    throw new Error('Missing GEMINI_API_KEY. Please set it in your environment.');
  }
  return genAI.getGenerativeModel({ model });
}

// ---------- Schema Validation ----------
const QuestionSchema = z.object({
  id: z.string().optional(),
  topic: z.string(),
  mode: z.enum(['same', 'different']),
  type: z.enum(['mcq', 'true_false', 'short_answer']),
  question: z.string(),
  options: z.array(z.string()).optional(), // We'll validate and fix MCQ options ourselves
  answer: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard'])
});

const QuizResponseSchema = z.object({
  quiz: z.array(QuestionSchema)
});

function sanitizeJsonText(text: string): string {
  // First, strip markdown code fences if present
  let cleaned = text.replace(/^```json\s*|```$/gim, '').trim();
  
  // Handle case where the model outputs explanatory text before or after the JSON
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
    
    // Try to fix common JSON issues that Gemini might introduce
    
    // 1. Fix trailing commas in objects/arrays which are invalid JSON
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    
    // 2. Ensure property names are properly quoted
    cleaned = cleaned.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, '$1"$2":');
    
    // 3. Replace single quotes with double quotes for JSON compatibility
    cleaned = cleaned.replace(/(\w+)\'(\w+)/g, '$1\\\'$2'); // Preserve apostrophes
    cleaned = cleaned.replace(/'([^']*)'([\s\:\,\}])/g, '"$1"$2'); // Replace other singles
    
    return cleaned;
  }
  
  return text; // Return original if we couldn't identify JSON pattern
}

async function runGenerate(modelName: string, prompt: string): Promise<any> {
  const model = getGeminiModel(modelName);
  console.info(`[AI] Requesting content from ${modelName}...`);
  const res = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      topK: 40,
      topP: 0.95,
      responseMimeType: 'application/json'
    }
  });
  const raw = res.response.text();
  
  // Log a snippet of the raw response for debugging
  const snippet = raw.substring(0, 150) + (raw.length > 150 ? '...' : '');
  console.info(`[AI] Raw response from ${modelName} (snippet): ${snippet}`);
  
  const jsonText = sanitizeJsonText(raw);
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(`[AI] JSON parse error from ${modelName}:`, error);
    console.info(`[AI] Failed JSON text: ${jsonText.substring(0, 500)}...`);
    throw new Error(`Failed to parse JSON from ${modelName}`);
  }
}

async function generateJSONWithFallback(modelNames: string[], prompt: string): Promise<any> {
  const errors: Array<{ model: string; error: unknown }> = [];
  for (const name of modelNames) {
    try {
      if (modelNames.length > 1) {
        console.info(`[AI] Trying Gemini model: ${name}`);
      }
      
      const result = await runGenerate(name, prompt);
      
      // Verify basic structure before returning
      if (!result || typeof result !== 'object' || !result.quiz || !Array.isArray(result.quiz)) {
        throw new Error(`Invalid response structure from ${name}: missing quiz array`);
      }
      
      if (result.quiz.length === 0) {
        throw new Error(`Empty quiz array from ${name}`);
      }
      
      console.info(`[AI] Successfully got valid response from ${name} with ${result.quiz.length} questions`);
      return result;
    } catch (err) {
      errors.push({ model: name, error: err });
      console.warn(`[AI] Model failed: ${name}. ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const message = errors
    .map(e => `${e.model}: ${e.error instanceof Error ? e.error.message : String(e.error)}`)
    .join(' | ');
  throw new Error(`All Gemini models failed. Attempts: ${message}`);
}

function toQuizQuestions(items: z.infer<typeof QuestionSchema>[], fallbackMode: Mode): QuizQuestion[] {
  return items.map((q, idx) => {
    const id = q.id && q.id.trim().length > 0 ? q.id : `q-${nanoid(12)}`;
    
    // Fix MCQ options if needed
    if (q.type === 'mcq') {
      // Create standard options array if missing or incomplete
      if (!q.options || q.options.length !== 4) {
        console.warn(`[AI] Fixing MCQ question ${id} with missing/incomplete options`);
        const existingOptions = q.options || [];
        q.options = [
          ...existingOptions,
          ...Array(4 - existingOptions.length).fill('')
            .map((_, i) => `Option ${String.fromCharCode(65 + existingOptions.length + i)}`)
        ].slice(0, 4);
        
        // If answer references a missing option, set it to the first option
        if (!q.options.includes(q.answer)) {
          q.answer = q.options[0];
        }
      }
    }
    
    return {
      id,
      topic: q.topic,
      mode: (q.mode as Mode) || fallbackMode,
      type: q.type as QuestionType,
      question: q.question,
      options: q.type === 'mcq' ? (q.options as [string, string, string, string]) : undefined,
      answer: q.answer,
      difficulty: q.difficulty as Difficulty,
      metadata: { idx }
    } satisfies QuizQuestion;
  });
}

// ---------- Public API ----------
export async function generateQuiz(params: {
  topics: string[];
  difficulty: Difficulty;
  numQuestions: number; // total (same) or per set (different)
  mode: Mode; // "same" | "different"
  numSets?: number; // when different, number of distinct sets (papers)
}): Promise<QuizQuestion[]> {
  const { topics, difficulty, numQuestions, mode, numSets } = params;
  const sets = mode === 'different' ? (numSets ?? 1) : 1;
  const poolSize = numQuestions * sets;

  // Helper: local generation used when key missing or Gemini fails
  const localGenerate = (): QuizQuestion[] => {
    const questions: QuizQuestion[] = Array.from({ length: poolSize }).map((_, i) => {
      const topic = topics[i % Math.max(1, topics.length)] || 'General';
      const qid = 'q-' + nanoid(12);
      const opts = [`Option A`, `Option B`, `Option C`, `Option D`] as [string, string, string, string];
      return {
        id: qid,
        topic,
        mode,
        type: 'mcq',
        question: `(${difficulty}) ${topic}: Sample question ${i + 1} of ${poolSize}?`,
        options: opts,
        answer: 'Option A',
        difficulty,
        metadata: { local: true, idx: i, setIndex: Math.floor(i / Math.max(1, numQuestions)) }
      } satisfies QuizQuestion;
    });
    return questions;
  };

  // Fallback: no Gemini key
  if (!hasGemini) {
    return localGenerate();
  }

  const modelChain = [PRIMARY_MODEL, ...DEFAULT_FALLBACKS];
  const prompt = `You are generating assessment questions for a timed quiz.
Return ONLY JSON with this exact shape (no markdown, no comments):
{
  "quiz": [
    {
      "id": "string",
      "topic": "string",
      "mode": "same" | "different",
      "type": "mcq" | "true_false" | "short_answer",
      "question": "string",
      "options": ["A","B","C","D"],  // EXACTLY 4 options for mcq type
      "answer": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Constraints:
- Generate exactly ${poolSize} items at ${difficulty} difficulty, covering topics: ${topics.join(', ')}.
- mode must be "${mode}" for all items.
- For "mcq" type, ALWAYS include EXACTLY 4 options array.
- For "true_false" type, answer must be "true" or "false".
- Treat the ${poolSize} items as ${sets} set(s) × ${numQuestions} each; keep coverage balanced within each set.
- No explanations, hints, rationales, or extra fields.
- IDs should be unique like "q-${nanoid(6)}-*" (you choose the suffix).`;

  try {
    const jsonData = await generateJSONWithFallback(modelChain, prompt);
    
    // Pre-validate and sanitize before passing to Zod
    if (!jsonData || !jsonData.quiz || !Array.isArray(jsonData.quiz)) {
      throw new Error('Invalid JSON structure: missing quiz array');
    }
    
    // Filter out obviously invalid questions and normalize structure
    jsonData.quiz = jsonData.quiz
      .filter((q: any) => q && typeof q === 'object' && q.question && q.type)
      .map((q: any) => {
        // Ensure required fields exist
        q.topic = q.topic || topics[0] || 'General';
        q.difficulty = q.difficulty || difficulty;
        q.mode = q.mode || mode;
        
        // Handle MCQ questions
        if (q.type === 'mcq') {
          // Ensure options is an array
          q.options = Array.isArray(q.options) ? q.options : [];
          
          // Ensure answer exists
          if (!q.answer && q.options.length > 0) {
            q.answer = q.options[0];
          } else if (!q.answer) {
            q.answer = 'Option A';
          }
        } else if (!q.answer) {
          // Default answer for non-MCQ
          q.answer = q.type === 'true_false' ? 'true' : 'Answer';
        }
        
        return q;
      });
    
    // Now validate with Zod
    const parsed = QuizResponseSchema.parse(jsonData);
    return toQuizQuestions(parsed.quiz, mode);
  } catch (err) {
    console.warn('[AI] Falling back to local question generation due to Gemini error:', err);
    return localGenerate();
  }
}

export async function refineQuestion(input: {
  question: QuizQuestion;
  change: { reword?: boolean; difficulty?: Difficulty; convertType?: QuestionType };
}): Promise<QuizQuestion> {
  const { question, change } = input;
  if (!hasGemini) {
    // Local fallback refinement
    let updated: QuizQuestion = { ...question };
    if (change.reword) {
      updated = { ...updated, question: updated.question.replace(/\?$/, '') + ' (reworded)?' };
    }
    if (change.difficulty) {
      updated = { ...updated, difficulty: change.difficulty };
    }
    if (change.convertType && change.convertType !== updated.type) {
      if (change.convertType === 'mcq') {
        updated = {
          ...updated,
          type: 'mcq',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 'Option A'
        };
      } else if (change.convertType === 'true_false') {
        updated = { ...updated, type: 'true_false', options: undefined, answer: 'true' };
      } else {
        updated = { ...updated, type: 'short_answer', options: undefined, answer: '' };
      }
    }
    return updated;
  }

  const modelChain = [PRIMARY_MODEL, ...DEFAULT_FALLBACKS];

  const changeLines: string[] = [];
  if (change.reword) changeLines.push('- Reword the question but keep the concept intact.');
  if (change.difficulty) changeLines.push(`- Adjust difficulty to: ${change.difficulty}.`);
  if (change.convertType) changeLines.push(`- Convert to type: ${change.convertType}.`);

  const prompt = `Refine the following quiz question according to the requested changes. Return ONLY JSON with the same schema.
Original question:
${JSON.stringify({ ...question, metadata: undefined }, null, 2)}

Requested changes:\n${changeLines.join('\n') || '- Keep structure; minor improvements allowed.'}

Schema (single item wrapped in quiz array):
{
  "quiz": [
    {
      "id": "string",
      "topic": "string",
      "mode": "same" | "different",
      "type": "mcq" | "true_false" | "short_answer",
      "question": "string",
      "options": ["A","B","C","D"],
      "answer": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}
- If type becomes mcq, include exactly 4 options.
- No extra text.`;

  try {
    const parsed = QuizResponseSchema.parse(await generateJSONWithFallback(modelChain, prompt));
    const updated = toQuizQuestions(parsed.quiz, question.mode)[0];
    // Preserve original id for stability
    return { ...updated, id: question.id };
  } catch (err) {
    console.warn('[AI] Falling back to local refinement due to Gemini error:', err);
    // Local fallback refinement
    let updated: QuizQuestion = { ...question };
    if (change.reword) {
      updated = { ...updated, question: updated.question.replace(/\?$/, '') + ' (reworded)?' };
    }
    if (change.difficulty) {
      updated = { ...updated, difficulty: change.difficulty };
    }
    if (change.convertType && change.convertType !== updated.type) {
      if (change.convertType === 'mcq') {
        updated = {
          ...updated,
          type: 'mcq',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 'Option A'
        };
      } else if (change.convertType === 'true_false') {
        updated = { ...updated, type: 'true_false', options: undefined, answer: 'true' };
      } else {
        updated = { ...updated, type: 'short_answer', options: undefined, answer: '' };
      }
    }
    return updated;
  }
}

export async function generateAdaptiveFollowups(args: {
  baseTopics: string[];
  recentPerformance: Array<{ topic: string; correctRate: number }>;
  targetDifficulty: Difficulty;
  count: number;
}): Promise<QuizQuestion[]> {
  const { baseTopics, recentPerformance, targetDifficulty, count } = args;
  if (!hasGemini) {
    const topics = baseTopics.length ? baseTopics : ['General'];
    return Array.from({ length: count }).map((_, i) => {
      const topic = topics[i % topics.length];
      return {
        id: 'q-' + nanoid(12),
        topic,
        mode: 'same',
        type: 'mcq',
        question: `(${targetDifficulty}) ${topic}: Adaptive follow-up ${i + 1}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
        difficulty: targetDifficulty,
        metadata: { local: true, idx: i }
      } as QuizQuestion;
    });
  }
  const modelChain = [PRIMARY_MODEL, ...DEFAULT_FALLBACKS];

  const perfLines = recentPerformance
    .map(p => `- ${p.topic}: ${(p.correctRate * 100).toFixed(0)}% correct`)
    .join('\n');

  const prompt = `Return ONLY valid JSON matching the schema below. Generate ${count} adaptive follow-up questions based on performance.

Adaptation rules:
- If topic correctRate >= 0.8: increase difficulty by one step.
- If topic correctRate <= 0.4: decrease difficulty by one step.
- Otherwise: keep difficulty at ${targetDifficulty}.

Base topics: ${baseTopics.join(', ')}
Recent performance:\n${perfLines}

Schema:
{
  "quiz": [
    {
      "id": "string",
      "topic": "string",
      "mode": "same" | "different",
      "type": "mcq" | "true_false" | "short_answer",
      "question": "string",
      "options": ["A","B","C","D"],
      "answer": "string",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}
- No explanations, JSON only.`;

  try {
    const parsed = QuizResponseSchema.parse(await generateJSONWithFallback(modelChain, prompt));
    return toQuizQuestions(parsed.quiz, 'same');
  } catch (err) {
    console.warn('[AI] Falling back to local follow-ups due to Gemini error:', err);
    const topics = baseTopics.length ? baseTopics : ['General'];
    return Array.from({ length: count }).map((_, i) => {
      const topic = topics[i % topics.length];
      return {
        id: 'q-' + nanoid(12),
        topic,
        mode: 'same',
        type: 'mcq',
        question: `(${targetDifficulty}) ${topic}: Adaptive follow-up ${i + 1}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
        difficulty: targetDifficulty,
        metadata: { local: true, idx: i }
      } as QuizQuestion;
    });
  }
}

// ---------- Compatibility helper for existing code paths ----------
export function generateFeedback(
  studentId: string,
  score: number,
  totalQuestions: number,
  detailedResults: Array<{ question?: string; isCorrect: boolean }>
): string {
  const percentage = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;
  const incorrect = detailedResults.filter(r => !r.isCorrect);

  let feedback = `Great work, Student ${studentId}! `;
  if (percentage >= 90) feedback += 'Excellent performance! You have a strong understanding of the topic. ';
  else if (percentage >= 80) feedback += "Good job! You're doing well with most concepts. ";
  else if (percentage >= 70) feedback += 'Fair performance. There\'s room for improvement in some areas. ';
  else feedback += 'Keep practicing! Focus on understanding the fundamental concepts. ';

  if (incorrect.length > 0) {
    feedback += `Review the explanations for ${incorrect.length} question(s) you missed. `;
  }
  feedback += 'Keep up the great work and continue learning!';
  return feedback;
}

// Keep legacy class name for minimal disruption where it may be referenced
export class AIQuestionService {
  static generateFeedback(
    studentId: string,
    score: number,
    totalQuestions: number,
    detailedResults: any[]
  ): string {
    return generateFeedback(studentId, score, totalQuestions, detailedResults);
  }
}
