import { NextRequest, NextResponse } from 'next/server';
import { SimpleDB, Quiz, Question, DB_KEYS } from '@/lib/database';
import { AIQuestionService } from '@/lib/ai-service';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quizId = params.id;
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!quizId) {
      return NextResponse.json(
        { success: false, message: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Get quiz details
    const quiz = SimpleDB.find<Quiz>(DB_KEYS.QUIZZES, quizId);
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // For slip tests, allow access anytime. For live quizzes, check if active
    if (quiz.type === 'live' && quiz.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Live quiz is not currently active' },
        { status: 400 }
      );
    }

    // Generate unique questions for the student if studentId is provided
    let questions;
    if (studentId) {
      questions = await AIQuestionService.generateQuestionsForStudent(
        quiz.topic,
        quiz.questionCount,
        studentId,
        quiz.id
      );

      // Save questions to database
      questions.forEach(question => {
        SimpleDB.add(DB_KEYS.QUESTIONS, question);
      });
    } else {
      // Fallback to generating generic questions
      questions = await AIQuestionService.generateQuestionsForStudent(
        quiz.topic,
        quiz.questionCount,
        'anonymous',
        quiz.id
      );
    }

    // Return quiz data with questions
    const questionsForStudent = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topic: quiz.topic,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        questionCount: quiz.questionCount,
        type: quiz.type,
        questions: questionsForStudent
      }
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get quiz' },
      { status: 500 }
    );
  }
}
