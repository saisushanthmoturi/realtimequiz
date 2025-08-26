import { NextRequest, NextResponse } from 'next/server';
import { SimpleDB, Quiz, QuizSession, Question, DB_KEYS } from '@/lib/database';
import { AIQuestionService } from '@/lib/ai-service';

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quizId = id;
    const quiz = SimpleDB.find<Quiz>(DB_KEYS.QUIZZES, quizId);

    if (!quiz) {
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    if (quiz.status === 'active') {
      return NextResponse.json(
        { success: false, message: 'Quiz is already active' },
        { status: 400 }
      );
    }

    // Generate session code
    const sessionCode = generateSessionCode();

    // Update quiz status
    SimpleDB.update(DB_KEYS.QUIZZES, quizId, { 
      status: 'active' as const,
      sessionCode 
    });

    // Create quiz session
    const session: QuizSession = {
      id: Date.now().toString(),
      quizId,
      sessionCode,
      isActive: true,
      participants: [],
      createdAt: new Date().toISOString()
    };

    SimpleDB.add(DB_KEYS.SESSIONS, session);

    return NextResponse.json({
      success: true,
      message: 'Quiz started successfully',
      sessionCode,
      quiz: { ...quiz, status: 'active', sessionCode }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to start quiz' },
      { status: 500 }
    );
  }
}
