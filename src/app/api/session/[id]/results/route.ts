import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session details
    const session = await storage.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Session not found' },
        { status: 404 }
      );
    }

    // Get all attempts for this session
    const allAttempts = await storage.getAttemptsByQuiz(session.quizId);
    const sessionAttempts = allAttempts.filter(attempt => attempt.sessionId === sessionId);

    // Get quiz details for context
    const quiz = await storage.getQuiz(session.quizId);
    
    // Format results for display
    const results = sessionAttempts.map(attempt => {
      const submittedTime = attempt.submittedAt ? new Date(attempt.submittedAt).getTime() : Date.now();
      const startedTime = attempt.startedAt ? new Date(attempt.startedAt).getTime() : submittedTime;
      const timeSpentSeconds = Math.floor((submittedTime - startedTime) / 1000);
      
      return {
        attemptId: attempt.attemptId, // Add unique attempt ID
        studentId: attempt.studentId,
        score: attempt.score,
        totalQuestions: quiz?.questions.length || 0,
        percentage: attempt.percent,
        submittedAt: attempt.submittedAt || new Date().toISOString(),
        timeSpent: timeSpentSeconds > 0 ? timeSpentSeconds : 0,
        answers: attempt.answers
      };
    });

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        quizId: session.quizId,
        quizTitle: `Quiz for ${session.quizId}`, // Generate a title since it's not in GeneratedQuiz type
        joinCode: session.joinCode,
        status: session.status,
        participants: session.participants
      },
      results,
      totalAttempts: results.length,
      averageScore: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length) : 0
    });

  } catch (error) {
    console.error('Error fetching session results:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch session results' },
      { status: 500 }
    );
  }
}
