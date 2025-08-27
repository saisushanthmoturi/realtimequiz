import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeneratedQuiz, Attempt } from '@/types/quiz';
import { computeQuizStats, computeStudentStats } from './analytics';

// Initialize Gemini only if key is present; otherwise we will fallback to plain text summaries.
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;
const model = genAI?.getGenerativeModel({ model: 'gemini-1.5-pro' });

export async function generateInsights(args: {
  quiz: GeneratedQuiz;
  attempts: Attempt[];
  perStudent?: boolean;
}): Promise<{ 
  general: string; 
  perStudent?: Record<string, string>;
}> {
  const { quiz, attempts, perStudent } = args;

  // Get overall stats
  const stats = computeQuizStats(quiz, attempts);

  // Generate general insights
  const generalPrompt = `
Analyze this quiz performance data and provide concise, actionable insights:

Quiz Topics: ${quiz.topics.join(', ')}
Difficulty: ${quiz.difficulty}
Average Score: ${stats.avgScore.toFixed(1)}
Median Score: ${stats.median.toFixed(1)}

Topic Performance:
  ${Object.entries(stats.topicBreakdown)
    .map(([topic, s]) => `${topic}: ${s.percent.toFixed(1)}% correct (${s.correct}/${s.total})`)
    .join('\n')}

Requirements:
1. Provide 2-3 key observations about overall performance
2. Identify strongest and weakest topics
3. Suggest one specific improvement action
4. Keep response under 200 words and focused on facts from the data
`;

  let general = '';
  if (model) {
    const generalResponse = await model.generateContent(generalPrompt);
    general = generalResponse.response.text();
  } else {
    general = `Average score: ${stats.avgScore.toFixed(1)}. Strong topics: ${Object.entries(stats.topicBreakdown)
      .sort((a, b) => b[1].percent - a[1].percent)
      .slice(0, 1)
      .map(([t]) => t)}. Weak topics: ${Object.entries(stats.topicBreakdown)
      .sort((a, b) => a[1].percent - b[1].percent)
      .slice(0, 1)
      .map(([t]) => t)}. Consider allocating more practice on weak areas.`;
  }

  // Generate per-student insights if requested
  let perStudentInsights: Record<string, string> | undefined;
  
  if (perStudent) {
    perStudentInsights = {};
    
    for (const attempt of attempts) {
      const studentStats = computeStudentStats(quiz, [attempt]);
      
      const studentPrompt = `
Analyze this student's quiz performance and provide personalized feedback:

Overall Accuracy: ${studentStats.accuracy.toFixed(1)}%
Average Time per Question: ${(studentStats.timePerQuestion / 1000).toFixed(1)}s

Topic Performance:
  ${Object.entries(studentStats.topicPerformance)
    .map(([topic, percent]) => `${topic}: ${percent.toFixed(1)}%`)
    .join('\n')}

Requirements:
1. Provide 1-2 specific strengths
2. Identify 1 area for improvement
3. Give one actionable study tip
4. Keep response under 100 words and based only on the data
`;

      if (model) {
        const studentResponse = await model.generateContent(studentPrompt);
        perStudentInsights[attempt.studentId] = studentResponse.response.text();
      } else {
        perStudentInsights[attempt.studentId] = `Accuracy ${studentStats.accuracy.toFixed(1)}%. Focus on topics with lower percent. Practice timed sets to improve speed.`;
      }
    }
  }

  return {
    general,
    perStudent: perStudentInsights
  };
}
