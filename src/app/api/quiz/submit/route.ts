import { NextRequest, NextResponse } from 'next/server';
import { SimpleDB, Quiz, Question, QuizAttempt, DB_KEYS } from '@/lib/database';
import { AIQuestionService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { quizId, studentId, answers, timeSpent } = await request.json();

    if (!quizId || !studentId || !answers || typeof timeSpent !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    // Get student's questions
    const allQuestions = SimpleDB.get<Question>(DB_KEYS.QUESTIONS);
    const studentQuestions = allQuestions.filter(q => 
      q.quizId === quizId && q.studentId === studentId
    ).sort((a, b) => a.id.localeCompare(b.id));

    if (studentQuestions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No questions found for this student' },
        { status: 400 }
      );
    }

    // Calculate score
    let score = 0;
    const results: Array<{
      questionId: string;
      question: string;
      selectedAnswer: number;
      correctAnswer: number;
      isCorrect: boolean;
      explanation: string;
    }> = [];

    studentQuestions.forEach((question, index) => {
      const selectedAnswer = answers[index] !== undefined ? answers[index] : -1;
      const isCorrect = selectedAnswer === question.correctAnswer;
      
      if (isCorrect) {
        score++;
      }

      results.push({
        questionId: question.id,
        question: question.question,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation
      });
    });

    // Generate personalized feedback
    const feedback = AIQuestionService.generateFeedback(
      studentId,
      score,
      studentQuestions.length,
      results
    );

    // Save quiz attempt
    const attempt: QuizAttempt = {
      id: Date.now().toString(),
      quizId,
      studentId,
      answers,
      score,
      totalQuestions: studentQuestions.length,
      timeSpent,
      completedAt: new Date().toISOString(),
      feedback
    };

    SimpleDB.add(DB_KEYS.ATTEMPTS, attempt);

    return NextResponse.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        score,
        totalQuestions: studentQuestions.length,
        percentage: Math.round((score / studentQuestions.length) * 100),
        timeSpent,
        feedback,
        detailedResults: results
      }
    });
  } catch (error) {
    console.error('Quiz submission error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}
