import { NextRequest } from 'next/server';
import { storage } from '@/lib/storage';
import { generateQuiz } from '@/lib/ai-service';
import { nanoid } from 'nanoid';
import type { GeneratedQuiz } from '@/types/quiz';

export async function POST(req: NextRequest) {
  try {
    // Create a test quiz for session testing
    const testQuiz: GeneratedQuiz = {
      id: 'test-quiz-' + nanoid(6),
      topics: ['Mathematics', 'Science'],
      difficulty: 'medium',
      mode: 'same',
      numQuestions: 5,
      questions: await generateQuiz({
        topics: ['Mathematics', 'Science'],
        difficulty: 'medium',
        numQuestions: 5,
        mode: 'same'
      }),
      createdAt: new Date().toISOString(),
      status: 'draft',
      poolSize: 5
    };

    await storage.saveQuiz(testQuiz);
    await storage.updateQuizStatus(testQuiz.id, 'launched');

    // Create a session for this quiz
    const createSessionResponse = await fetch(`${req.url.replace('/test-session', '/session/create')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: testQuiz.id,
        teacherId: 'teacher-test'
      })
    });

    const sessionData = await createSessionResponse.json();

    return Response.json({
      message: 'Test session created successfully',
      quiz: {
        id: testQuiz.id,
        topics: testQuiz.topics,
        difficulty: testQuiz.difficulty,
        numQuestions: testQuiz.numQuestions,
        questionsGenerated: testQuiz.questions.length
      },
      session: sessionData,
      testInstructions: {
        joinUrl: `/quiz/join`,
        joinCode: sessionData.joinCode,
        testStudents: ['student1', 'student2', 'student3']
      }
    });

  } catch (error) {
    console.error('Test session creation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create test session' 
      }), 
      { status: 500 }
    );
  }
}
