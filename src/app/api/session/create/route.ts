import { NextRequest } from 'next/server';
import { storage } from '@/lib/storage';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Session } from '@/types/quiz';

const RequestSchema = z.object({
  quizId: z.string(),
  teacherId: z.string()
});

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function generateUniqueJoinCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = generateJoinCode();
    const existing = await storage.getSessionByJoinCode(code);
    
    if (!existing || existing.status === 'ended') {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback to longer code if needed
  return Math.random().toString(36).substring(2, 12).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, teacherId } = RequestSchema.parse(body);

    const quiz = await storage.getQuiz(quizId);
    if (!quiz) {
      return new Response(JSON.stringify({ error: 'Quiz not found' }), { status: 404 });
    }

    const session: Session = {
      sessionId: 'session-' + nanoid(),
      quizId,
      teacherId,
      joinCode: await generateUniqueJoinCode(),
      status: 'ready',
      participants: []
    };

    await storage.saveSession(session);

    return Response.json({
      sessionId: session.sessionId,
      joinCode: session.joinCode
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create session' 
      }), 
      { status: 400 }
    );
  }
}
