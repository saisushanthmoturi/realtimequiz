import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { QuizQuestion } from '@/types/quiz';

const JoinSchema = z.object({
  joinCode: z.string(),
  studentId: z.string(),
  studentName: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { joinCode, studentId, studentName } = JoinSchema.parse(body);

    // Find session by join code
    const session = await storage.getSessionByJoinCode(joinCode.toUpperCase());

    if (!session || (session.status !== 'ready' && session.status !== 'running')) {
      return NextResponse.json(
        { success: false, message: 'Invalid join code or session not available' },
        { status: 404 }
      );
    }

    // Get quiz details
    const quiz = await storage.getQuiz(session.quizId);
    
    if (!quiz) {
      return NextResponse.json(
        { success: false, message: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Add student to participants if not already there
    const existingParticipant = session.participants.find(p => p.studentId === studentId);
    if (!existingParticipant) {
      session.participants.push({ 
        studentId, 
        name: studentName || studentId 
      });
      await storage.updateSession({
        sessionId: session.sessionId,
        participants: session.participants
      });
      
      console.log(`Student ${studentId} joined session ${session.sessionId} (${session.joinCode})`);
    }

    // For "different" mode, generate unique questions for this student
    let questionsForStudent: QuizQuestion[] = [];
    
    if (quiz.mode === 'different') {
      // Take a random subset from the question pool for this student
      const questionsPerSet = quiz.questionsPerSet || quiz.numQuestions;
      const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
      questionsForStudent = shuffled.slice(0, questionsPerSet);
    } else {
      // For "same" mode, all students get the same questions
      questionsForStudent = quiz.questions;
    }

    // Return quiz data for the student interface
    const sanitizedQuestions = questionsForStudent.map(q => ({
      id: q.id,
      topic: q.topic,
      type: q.type,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty
      // Note: Don't include the answer for security
    }));

    return NextResponse.json({
      success: true,
      message: 'Successfully joined quiz',
      sessionId: session.sessionId,
      quiz: {
        id: quiz.id,
        topics: quiz.topics,
        difficulty: quiz.difficulty,
        mode: quiz.mode,
        numQuestions: quiz.mode === 'different' ? (quiz.questionsPerSet || quiz.numQuestions) : quiz.numQuestions,
        questions: sanitizedQuestions
      },
      session: {
        status: session.status,
        startedAt: session.startedAt,
        endsAt: session.endsAt
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
