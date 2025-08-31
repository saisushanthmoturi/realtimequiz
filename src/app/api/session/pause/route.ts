import { NextRequest } from 'next/server';
import { storage } from '@/lib/storage';
import { z } from 'zod';

const RequestSchema = z.object({
  sessionId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = RequestSchema.parse(body);

    const session = await storage.getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }

    await storage.updateSession({
      sessionId,
      status: 'paused'
    });

    // Socket.IO event will be emitted by the socket server

    return Response.json({
      success: true,
      status: 'paused'
    });
  } catch (error) {
    console.error('Session pause error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to pause session' 
      }), 
      { status: 400 }
    );
  }
}
