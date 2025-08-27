import { NextRequest } from 'next/server';
import { storage } from '@/lib/storage';
import { z } from 'zod';

const RequestSchema = z.object({
  quizId: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId } = RequestSchema.parse(body);

    const quiz = await storage.getQuiz(quizId);
    if (!quiz) {
      return new Response(JSON.stringify({ error: 'Quiz not found' }), { status: 404 });
    }

    // Update quiz status to launched
    await storage.updateQuizStatus(quizId, 'launched');

    return Response.json({ success: true });
  } catch (error) {
    console.error('Quiz approval error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to approve quiz' 
      }), 
      { status: 400 }
    );
  }
}
