import { NextRequest } from 'next/server';
import { storage } from '@/lib/storage';
import { z } from 'zod';

const RequestSchema = z.object({
  sessionId: z.string(),
  durationSec: z.number().int().positive(),
  startAt: z.string().datetime().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, durationSec, startAt } = RequestSchema.parse(body);

    const session = await storage.getSession(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 });
    }

    const startTime = startAt ? new Date(startAt) : new Date();
    const endTime = new Date(startTime.getTime() + durationSec * 1000);

    await storage.updateSession({
      sessionId,
      status: 'running',
      startedAt: startTime.toISOString(),
      endsAt: endTime.toISOString()
    });

    // Socket.IO event will be emitted by the socket server

    return Response.json({
      startedAt: startTime.toISOString(),
      endsAt: endTime.toISOString()
    });
  } catch (error) {
    console.error('Session launch error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to launch session' 
      }), 
      { status: 400 }
    );
  }
}
