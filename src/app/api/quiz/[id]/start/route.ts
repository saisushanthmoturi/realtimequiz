import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { nanoid } from 'nanoid';
import type { Session } from '@/types/quiz';

function generateSessionCode(): string {
  // Generate a more reliable 6-character code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quizId = id;
    
    // Get quiz from the consistent storage system
    const quiz = await storage.getQuiz(quizId);

    if (!quiz) {
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    if (quiz.status === 'launched') {
      return NextResponse.json(
        { success: false, message: 'Quiz is already active' },
        { status: 400 }
      );
    }

    // Generate unique session code
    let sessionCode = generateSessionCode();
    
    // Ensure session code is unique (check existing sessions)
    let attempts = 0;
    while (attempts < 10) {
      try {
        const existingSessions = await storage.listQuizzes();
        const codeExists = existingSessions.some(q => 
          q.status === 'launched' && q.questions.some(question => 
            question.metadata?.sessionCode === sessionCode
          )
        );
        if (!codeExists) break;
        sessionCode = generateSessionCode();
        attempts++;
      } catch {
        break; // If we can't check, proceed with current code
      }
    }

    // Update quiz status to launched
    await storage.updateQuizStatus(quizId, 'launched');

    // Create session
    const session: Session = {
      sessionId: 'session-' + nanoid(),
      quizId,
      teacherId: 'current-teacher', // You might want to get this from auth
      joinCode: sessionCode,
      status: 'running',
      participants: [],
      startedAt: new Date().toISOString()
    };

    await storage.saveSession(session);

    return NextResponse.json({
      success: true,
      message: 'Quiz started successfully',
      sessionCode,
      sessionId: session.sessionId,
      quiz: { ...quiz, status: 'launched' }
    });
  } catch (error) {
    console.error('Failed to start quiz:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to start quiz', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
