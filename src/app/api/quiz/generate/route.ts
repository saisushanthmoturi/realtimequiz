import { NextRequest } from 'next/server';
// Force Node.js runtime; Gemini SDK doesn't support Edge runtimes
export const runtime = 'nodejs';
import { generateQuiz } from '@/lib/ai-service';
import { storage } from '@/lib/storage';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { GeneratedQuiz } from '@/types/quiz';

const RequestSchema = z.object({
  topics: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  numQuestions: z
    .number({ required_error: 'numQuestions is required' })
    .int('numQuestions must be an integer')
    .min(1, 'At least 1 question')
    .max(50, 'At most 50 questions'),
  mode: z.enum(['same', 'different']),
  // When mode === 'different', how many distinct sets (papers) to create.
  numSets: z.number().int().min(1).max(50).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
  const { topics, difficulty, numQuestions, mode, numSets } = RequestSchema.parse(body);

    const questions = await generateQuiz({
      topics,
      difficulty,
      numQuestions,
      mode,
      numSets
    });

    const quiz: GeneratedQuiz = {
      id: 'quiz-' + nanoid(),
      topics,
      difficulty,
  mode,
      numQuestions,
  numSets: mode === 'different' ? (numSets ?? 1) : undefined,
  questionsPerSet: mode === 'different' ? numQuestions : undefined,
  poolSize: questions.length,
      questions,
      createdAt: new Date().toISOString(),
      status: 'draft'
    };

    await storage.saveQuiz(quiz);

    return Response.json(quiz);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate quiz' 
      }), 
      { status: 400 }
    );
  }
}
