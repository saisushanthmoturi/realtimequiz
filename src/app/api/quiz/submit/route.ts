import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateFeedback } from '@/lib/ai-service';
import { nanoid } from 'nanoid';
import type { Attempt, QuizQuestion, StudentAnswer } from '@/types/quiz';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, studentId, sessionId, answers, timeSpent } = body;

    console.log('Quiz submission received:', { 
      quizId, 
      studentId, 
      sessionId, 
      timeSpent, 
      answersType: typeof answers,
      answersCount: answers ? Object.keys(answers).length : 0,
      answersKeys: answers ? Object.keys(answers).slice(0, 3) : []
    });

    // Detailed validation
    if (!quizId) {
      console.error('Missing quizId');
      return NextResponse.json(
        { success: false, message: 'Quiz ID is required' },
        { status: 400 }
      );
    }
    
    if (!studentId) {
      console.error('Missing studentId');
      return NextResponse.json(
        { success: false, message: 'Student ID is required' },
        { status: 400 }
      );
    }
    
    if (!answers || typeof answers !== 'object') {
      console.error('Invalid answers:', answers);
      return NextResponse.json(
        { success: false, message: 'Answers must be a valid object' },
        { status: 400 }
      );
    }
    
    if (typeof timeSpent !== 'number' || timeSpent < 0) {
      console.error('Invalid timeSpent:', timeSpent);
      return NextResponse.json(
        { success: false, message: 'Time spent must be a positive number' },
        { status: 400 }
      );
    }

    // Get quiz details
    const quiz = await storage.getQuiz(quizId);
    if (!quiz) {
      console.error('Quiz not found:', quizId);
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    console.log('Found quiz:', { 
      id: quiz.id, 
      questionCount: quiz.questions ? quiz.questions.length : 0, 
      mode: quiz.mode,
      numQuestions: quiz.numQuestions,
      questionsPerSet: quiz.questionsPerSet
    });

    // Check if quiz has questions
    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      console.error('Quiz has no questions:', quiz.id);
      return NextResponse.json(
        { success: false, message: 'Quiz has no questions available' },
        { status: 400 }
      );
    }
    let session = null;
    if (sessionId) {
      try {
        session = await storage.getSession(sessionId);
        if (session) {
          console.log('Found session:', { 
            id: session.sessionId, 
            status: session.status,
            endsAt: session.endsAt
          });
          
          // Validate session timing
          if (session.status === 'ended') {
            console.log('Session has ended, rejecting submission');
            return NextResponse.json(
              { success: false, message: 'Quiz session has ended. No more submissions are allowed.' },
              { status: 410 } // 410 Gone - resource no longer available
            );
          }
          
          if (session.endsAt) {
            const endsAt = new Date(session.endsAt).getTime();
            const now = Date.now();
            
            if (now > endsAt) {
              console.log('Session time has expired, updating status and rejecting submission');
              // Auto-update session status to ended
              await storage.updateSession({ sessionId, status: 'ended' });
              return NextResponse.json(
                { success: false, message: 'Quiz time has expired. No more submissions are allowed.' },
                { status: 410 }
              );
            }
          }
        } else {
          console.log('Session not found:', sessionId);
        }
      } catch (error) {
        console.warn('Error fetching session:', error);
      }
    }

    // For "different" mode, we need the specific questions the student received
    // For "same" mode, all students get the same questions
    let studentQuestions: QuizQuestion[] = [];
    
    if (quiz.mode === 'different') {
      // In different mode, we should have stored the student's specific questions
      // For now, we'll use a deterministic shuffle based on studentId
      const seed = studentId.split('').reduce((a: number, b: string) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
      const shuffled = [...quiz.questions].sort(() => (seed % 2) - 0.5);
      const questionsPerSet = quiz.questionsPerSet || quiz.numQuestions;
      studentQuestions = shuffled.slice(0, questionsPerSet);
    } else {
      // Same mode - all students get identical questions
      studentQuestions = quiz.questions.slice(0, quiz.numQuestions);
    }

    console.log('Student questions:', studentQuestions.length);

    // Calculate score and create detailed results
    let score = 0;
    const studentAnswers: StudentAnswer[] = [];
    const detailedResults: Array<{
      questionId: string;
      question: string;
      type: string;
      studentAnswer: string | number;
      correctAnswer: string;
      isCorrect: boolean;
      topic: string;
    }> = [];

    studentQuestions.forEach((question, index) => {
      const studentAnswer = answers[question.id];
      let isCorrect = false;
      let formattedStudentAnswer = '';
      
      // Handle different question types
      if (question.type === 'mcq') {
        const selectedIndex = Number(studentAnswer);
        if (!isNaN(selectedIndex) && question.options && selectedIndex >= 0 && selectedIndex < question.options.length) {
          formattedStudentAnswer = question.options[selectedIndex];
          isCorrect = formattedStudentAnswer === question.answer;
        }
      } else if (question.type === 'true_false') {
        formattedStudentAnswer = String(studentAnswer);
        isCorrect = formattedStudentAnswer.toLowerCase() === question.answer.toLowerCase();
      } else if (question.type === 'short_answer') {
        formattedStudentAnswer = String(studentAnswer || '').trim();
        // For short answers, we'll do a basic similarity check
        isCorrect = formattedStudentAnswer.toLowerCase().includes(question.answer.toLowerCase()) ||
                   question.answer.toLowerCase().includes(formattedStudentAnswer.toLowerCase());
      }

      if (isCorrect) score++;

      // Create student answer record
      const studentAnswerRecord: StudentAnswer = {
        questionId: question.id,
        answer: formattedStudentAnswer,
        isCorrect,
        answeredAt: new Date().toISOString(),
        latencyMs: 0 // Could be calculated if we tracked question start times
      };
      
      studentAnswers.push(studentAnswerRecord);

      // Create detailed result for response
      detailedResults.push({
        questionId: question.id,
        question: question.question,
        type: question.type,
        studentAnswer: formattedStudentAnswer,
        correctAnswer: question.answer,
        isCorrect,
        topic: question.topic
      });
    });

    const totalQuestions = studentQuestions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // Generate AI feedback
    const feedback = generateFeedback(
      studentId,
      score,
      totalQuestions,
      detailedResults.map(r => ({ 
        question: r.question, 
        isCorrect: r.isCorrect, 
        topic: r.topic 
      }))
    );

    // Create attempt record
    const attempt: Attempt = {
      attemptId: 'attempt-' + nanoid(),
      quizId,
      sessionId: sessionId || '',
      studentId,
      answers: studentAnswers,
      score,
      percent: percentage,
      startedAt: new Date(Date.now() - (timeSpent * 1000)).toISOString(),
      submittedAt: new Date().toISOString()
    };

    // Save the attempt
    console.log('Saving attempt with data:', {
      attemptId: attempt.attemptId,
      quizId: attempt.quizId,
      studentId: attempt.studentId,
      score: attempt.score,
      percent: attempt.percent,
      answersCount: attempt.answers.length
    });
    
    try {
      await storage.saveAttempt(attempt);
      console.log('Attempt saved successfully');
    } catch (saveError) {
      console.error('Failed to save attempt:', saveError);
      return NextResponse.json(
        { success: false, message: 'Failed to save quiz attempt: ' + (saveError instanceof Error ? saveError.message : 'Unknown error') },
        { status: 500 }
      );
    }

    console.log('Quiz submitted successfully:', { 
      studentId, 
      score: `${score}/${totalQuestions}`, 
      percentage: `${percentage}%` 
    });

    return NextResponse.json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        attemptId: attempt.attemptId,
        score,
        totalQuestions,
        percentage,
        timeSpent,
        feedback,
        detailedResults,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (error) {
    console.error('Quiz submission error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit quiz: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
