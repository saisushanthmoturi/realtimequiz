import { NextRequest } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const sessions = await storage.listActiveSessions();
    
    return Response.json({
      count: sessions.length,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        quizId: s.quizId,
        joinCode: s.joinCode,
        status: s.status,
        participantCount: s.participants.length,
        startedAt: s.startedAt,
        endsAt: s.endsAt
      }))
    });
  } catch (error) {
    console.error('List sessions error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to list sessions' 
      }), 
      { status: 500 }
    );
  }
}
