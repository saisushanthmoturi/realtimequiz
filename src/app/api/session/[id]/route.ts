import { NextRequest } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise<{id: string}> and {id: string} formats
    const { id: sessionId } = params instanceof Promise ? await params : params;
    const session = await storage.getSession(sessionId);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }

    return Response.json({
      sessionId: session.sessionId,
      quizId: session.quizId,
      joinCode: session.joinCode,
      status: session.status,
      participantCount: session.participants.length,
      participants: session.participants,
      startedAt: session.startedAt,
      endsAt: session.endsAt
    });
  } catch (error) {
    console.error('Get session error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to get session' 
      }), 
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise<{id: string}> and {id: string} formats
    const { id: sessionId } = params instanceof Promise ? await params : params;
    await storage.updateSession({
      sessionId,
      status: 'ended'
    });

    return Response.json({ message: 'Session ended successfully' });
  } catch (error) {
    console.error('End session error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to end session' 
      }), 
      { status: 500 }
    );
  }
}
