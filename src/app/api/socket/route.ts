import { NextRequest } from 'next/server';
import { initSocketIO } from '@/server/socket';

// Initialize on-demand; Next.js hosts the server—Socket.IO attaches to the underlying HTTP server.
export async function GET(_req: NextRequest) {
  // @ts-ignore - Next.js provides a global server instance; initSocketIO will reuse the singleton
  const srv = (global as any).__server || undefined;
  try {
    // If Next doesn’t expose the server, calling init without a server will no-op due to our global guard.
    if (srv) initSocketIO(srv);
  } catch {
    // Ignore; we only need to ensure the module is loaded and singleton is created in prod envs where available.
  }
  return new Response('ok', { status: 200 });
}
