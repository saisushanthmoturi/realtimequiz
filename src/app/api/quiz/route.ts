import { NextRequest, NextResponse } from 'next/server';
import { SimpleDB, Quiz, QuizSession, DB_KEYS } from '@/lib/database';
import { AIQuestionService } from '@/lib/ai-service';

// Generate session code
function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const { title, topic, description, questionCount, type, timeLimit, createdBy } = await request.json();

    if (!title || !topic || !questionCount || !type || !createdBy) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const quiz: Quiz = {
      id: Date.now().toString(),
      title,
      topic,
      description: description || '',
      questionCount: parseInt(questionCount),
      type,
      status: 'draft',
      createdBy,
      createdAt: new Date().toISOString(),
      timeLimit: timeLimit || questionCount * 2 // 2 minutes per question by default
    };

    SimpleDB.add(DB_KEYS.QUIZZES, quiz);

    return NextResponse.json({
      success: true,
      message: 'Quiz created successfully',
      quiz
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create quiz' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const createdBy = searchParams.get('createdBy');

    let quizzes = SimpleDB.get<Quiz>(DB_KEYS.QUIZZES);

    if (createdBy) {
      quizzes = quizzes.filter(quiz => quiz.createdBy === createdBy);
    }

    return NextResponse.json({
      success: true,
      quizzes: quizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}
