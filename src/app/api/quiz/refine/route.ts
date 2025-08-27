import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
import { refineQuestion } from '@/lib/ai-service';
import { storage } from '@/lib/storage';
import { z } from 'zod';

const RequestSchema = z.object({
  quizId: z.string(),
  questionId: z.string(),
  change: z.object({
    reword: z.boolean().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    convertType: z.enum(['mcq', 'true_false', 'short_answer']).optional()
  })
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, questionId, change } = RequestSchema.parse(body);

    const quiz = await storage.getQuiz(quizId);
    if (!quiz) {
      return new Response(JSON.stringify({ error: 'Quiz not found' }), { status: 404 });
    }

    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) {
      return new Response(JSON.stringify({ error: 'Question not found' }), { status: 404 });
    }

    const refinedQuestion = await refineQuestion({ question, change });

    // Update the question in the quiz
    quiz.questions = quiz.questions.map(q => 
      q.id === questionId ? refinedQuestion : q
    );

    await storage.saveQuiz(quiz);

    return Response.json({ question: refinedQuestion });
  } catch (error) {
    console.error('Question refinement error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to refine question' 
      }), 
      { status: 400 }
    );
  }
}
