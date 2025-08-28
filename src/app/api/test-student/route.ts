import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Student page API test',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    // Simple test to check if quiz submission API is working
    const testPayload = {
      quizId: "test",
      studentId: "TEST_001",
      sessionId: "",
      answers: {"q1": 0, "q2": "true"},
      timeSpent: 60
    };

    console.log('Testing quiz submission with payload:', testPayload);

    return NextResponse.json({
      success: true,
      message: 'Test payload created',
      payload: testPayload
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
