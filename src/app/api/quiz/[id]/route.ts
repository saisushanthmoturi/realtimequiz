import { NextRequest, NextResponse } from 'next/server';
import { SimpleDB, Quiz, Question, DB_KEYS } from '@/lib/database';
import { generateQuiz } from '@/lib/ai-service';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: quizId } = params instanceof Promise ? await params : params;
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

    // Generate questions or fetch from cache
    let questions: any[] = [];
    
    // Try to get questions from the database first (cache)
    if (studentId) {
      // Look for cached questions for this specific student and quiz
      const cachedQuestions = SimpleDB.findAll<Question>(
        DB_KEYS.QUESTIONS, 
        q => q.studentId === studentId && q.quizId === quizId
      );
      
      if (cachedQuestions.length >= quiz.questionCount) {
        // Use cached questions if we have enough
        questions = cachedQuestions.slice(0, quiz.questionCount);
        console.log(`Using ${questions.length} cached questions for student ${studentId}`);
      }
    }
    
    // If no cached questions found, generate new ones
    if (questions.length === 0) {
      try {
        // Set a timeout to avoid hanging requests
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Question generation timed out')), 10000);
        });
        
        const generationPromise = generateQuiz({
          topics: [quiz.topic],
          difficulty: 'medium',
          numQuestions: quiz.questionCount,
          mode: 'same'
        });
        
        // Race between generation and timeout
        const result = await Promise.race([generationPromise, timeoutPromise]) as any;
        questions = result.questions;
        
        // Add student ID and quiz ID to questions for caching
        questions = questions.map(q => ({
          ...q,
          studentId: studentId || 'anonymous',
          quizId: quizId
        }));
        
        // Save questions to database for future use
        questions.forEach((question: any) => {
          SimpleDB.add(DB_KEYS.QUESTIONS, question);
        });
      } catch (error) {
        console.error('Error generating questions:', error);
        
        // Fallback to basic questions on error
        questions = Array.from({ length: quiz.questionCount }).map((_, i) => ({
          id: `q-${nanoid(8)}`,
          topic: quiz.topic,
          mode: 'same' as const,
          type: 'mcq' as const,
          question: `Question ${i+1} about ${quiz.topic}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 'Option A',
          difficulty: 'medium' as const,
          studentId: studentId || 'anonymous',
          quizId: quizId
        }));
      }
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
