import { NextRequest, NextResponse } from 'next/server';
import { SimpleDB, Quiz, QuizSession, Question, DB_KEYS } from '@/lib/database';
import { AIQuestionService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { sessionCode, studentId } = await request.json();

    if (!sessionCode || !studentId) {
      return NextResponse.json(
        { success: false, message: 'Missing session code or student ID' },
        { status: 400 }
      );
    }

    // Find active session
    const sessions = SimpleDB.get<QuizSession>(DB_KEYS.SESSIONS);
    const session = sessions.find(s => s.sessionCode === sessionCode.toUpperCase() && s.isActive);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid session code or session not active' },
        { status: 404 }
      );
    }

    // Get quiz details
    const quiz = SimpleDB.find<Quiz>(DB_KEYS.QUIZZES, session.quizId);
    if (!quiz || quiz.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'Quiz is not active' },
        { status: 400 }
      );
    }

    // Add student to participants if not already there
    if (!session.participants.includes(studentId)) {
      session.participants.push(studentId);
      SimpleDB.update(DB_KEYS.SESSIONS, session.id, { participants: session.participants });
    }

    // Generate unique questions for this student
    const questions = await AIQuestionService.generateQuestionsForStudent(
      quiz.topic,
      quiz.questionCount,
      studentId,
      quiz.id
    );

    // Save questions to database
    questions.forEach(question => {
      SimpleDB.add(DB_KEYS.QUESTIONS, question);
    });

    // Return quiz data with questions for the quiz interface
    const questionsForStudent = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer, // Include for results calculation
      explanation: q.explanation // Include for feedback
    }));

    return NextResponse.json({
      success: true,
      message: 'Successfully joined quiz',
      quiz: {
        id: quiz.id,
        title: quiz.title,
        topic: quiz.topic,
        timeLimit: quiz.timeLimit,
        questionCount: quiz.questionCount,
        type: quiz.type,
        questions: questionsForStudent
      }
    });
  } catch (error) {
    console.error('Quiz join error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to join quiz' },
      { status: 500 }
    );
  }
}
