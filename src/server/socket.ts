import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { storage } from '../lib/storage';
import { Session, StudentAnswer } from '@/types/quiz';

declare global {
  var io: SocketServer | undefined;
}

type LeaderboardRow = {
  studentId: string;
  correct: number;
  total: number;
  percent: number;
};

class LeaderboardAggregator {
  private leaderboard: Map<string, LeaderboardRow> = new Map();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  update(studentId: string, answers: StudentAnswer[]): void {
    const correct = answers.filter(a => a.isCorrect).length;
    const total = answers.length;
    
    this.leaderboard.set(studentId, {
      studentId,
      correct,
      total,
      percent: (correct / total) * 100
    });
  }

  getSnapshot(): LeaderboardRow[] {
    return Array.from(this.leaderboard.values())
      .sort((a, b) => b.percent - a.percent);
  }
}

const leaderboards = new Map<string, LeaderboardAggregator>();

// Store timers for each session to manage pause/resume (global to persist across socket connections)
const sessionTimers = new Map<string, { 
  timer: NodeJS.Timeout;
  endsAt: string;
  remaining: number;
  isPaused: boolean;
}>();

// Function to recover active timers on server restart
async function recoverActiveTimers(io: SocketServer) {
  try {
    const sessions = await storage.listAllSessions();
    const activeSessions = sessions.filter(s => s.status === 'running' && s.endsAt);
    
    console.log(`Recovering ${activeSessions.length} active session timers`);
    
    for (const session of activeSessions) {
      const endsAt = new Date(session.endsAt!).getTime();
      const now = Date.now();
      const remaining = Math.ceil((endsAt - now) / 1000);
      
      if (remaining > 0) {
        console.log(`Recovering session ${session.sessionId} with ${remaining} seconds remaining`);
        
        const timer = setInterval(async () => {
          const now = Date.now();
          const remaining = Math.ceil((endsAt - now) / 1000);
          
          if (remaining <= 0) {
            clearInterval(timer);
            await storage.updateSession({ sessionId: session.sessionId, status: 'ended' });
            io.to(`session:${session.sessionId}`).emit('session:ended');
            io.to(`session:${session.sessionId}`).emit('timer:finished');
            console.log(`Recovered session ${session.sessionId} timer finished`);
          } else {
            io.to(`session:${session.sessionId}`).emit('timer:tick', { remaining });
          }
        }, 1000);
        
        // Don't store these in sessionTimers as they're recovered and may not have full state
      } else {
        // Session has already expired
        console.log(`Session ${session.sessionId} already expired, marking as ended`);
        await storage.updateSession({ sessionId: session.sessionId, status: 'ended' });
      }
    }
  } catch (error) {
    console.error('Error recovering active timers:', error);
  }
}

export function initSocketIO(server: HttpServer, io?: SocketServer): SocketServer {
  // If io is provided (from custom server), use it; otherwise create new one
  if (!io) {
    if (global.io) {
      return global.io;
    }

    io = new SocketServer(server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });
  }

  // Session management
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Recover existing session timers on connect
    socket.on('teacher:session:reconnect', async ({ sessionId }) => {
      console.log('🔄 Teacher attempting to reconnect to session:', sessionId);
      
      try {
        const session = await storage.getSession(sessionId);
        if (!session) {
          console.log('❌ Session not found:', sessionId);
          socket.emit('session:not_found', { sessionId });
          return;
        }
        
        console.log('📋 Session found:', {
          sessionId: session.sessionId,
          status: session.status,
          endsAt: session.endsAt
        });
        
        // Join the session room first
        socket.join(`session:${sessionId}`);
        
        if (session.status === 'running' && session.endsAt) {
          const endsAt = new Date(session.endsAt).getTime();
          const now = Date.now();
          const remaining = Math.ceil((endsAt - now) / 1000);
          
          console.log('⏱️ Calculating remaining time:', {
            endsAt: session.endsAt,
            now: new Date(now).toISOString(),
            remaining
          });
          
          if (remaining > 0) {
            // Session is still active, send current state
            socket.emit('session:recovered', { 
              sessionId, 
              remaining,
              endsAt: session.endsAt 
            });
            console.log('✅ Session recovered successfully with', remaining, 'seconds remaining');
          } else {
            // Session has expired, update status
            await storage.updateSession({ sessionId, status: 'ended' });
            socket.emit('session:expired', { sessionId });
            console.log('⌛ Session expired, marked as ended');
          }
        } else if (session.status === 'paused') {
          // For paused sessions, we need to check if we have timer info
          const timerInfo = sessionTimers.get(sessionId);
          if (timerInfo) {
            socket.emit('session:recovered', { 
              sessionId, 
              remaining: timerInfo.remaining,
              endsAt: timerInfo.endsAt 
            });
            console.log('✅ Paused session recovered with', timerInfo.remaining, 'seconds remaining');
          } else {
            socket.emit('session:status', { sessionId, status: session.status });
            console.log('📋 Paused session status sent (no timer info)');
          }
        } else {
          // Session is ready or ended
          socket.emit('session:status', { sessionId, status: session.status });
          console.log('📋 Session status sent:', session.status);
        }
      } catch (error) {
        console.error('❌ Error during session recovery:', error);
        socket.emit('session:error', { sessionId, error: 'Recovery failed' });
      }
    });
    // Teacher events
    socket.on('teacher:session:create', async ({ quizId, teacherId }) => {
      const session: Session = {
          sessionId: `session-${Date.now()}`,
        quizId,
        teacherId,
        joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: 'ready',
        participants: []
      };

      await storage.saveSession(session);
        socket.join(`session:${session.sessionId}`);
      io.emit('session:ready', { sessionId: session.sessionId, joinCode: session.joinCode });
    });

    socket.on('teacher:session:start', async ({ sessionId, durationSec }) => {
      const session = await storage.getSession(sessionId);
      if (!session) return;

      // Clear any existing timer for this session
      if (sessionTimers.has(sessionId)) {
        clearInterval(sessionTimers.get(sessionId)!.timer);
      }

      const startedAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + durationSec * 1000).toISOString();

      await storage.updateSession({
        sessionId,
        status: 'running',
        startedAt,
        endsAt
      });

      io.to(`session:${sessionId}`).emit('session:started', { 
        sessionId, 
        startAt: startedAt,
        endsAt 
      });

      // Start persistent timer that continues even if server restarts
      const startTimer = () => {
        const timer = setInterval(async () => {
          const timerInfo = sessionTimers.get(sessionId);
          if (!timerInfo || timerInfo.isPaused) return;

          // Always calculate from session.endsAt to handle server restarts
          const session = await storage.getSession(sessionId);
          if (!session || !session.endsAt) {
            clearInterval(timer);
            sessionTimers.delete(sessionId);
            return;
          }

          const now = Date.now();
          const end = new Date(session.endsAt).getTime();
          const remaining = Math.ceil((end - now) / 1000);
          
          // Update the remaining time in our timer info
          if (timerInfo) {
            timerInfo.remaining = remaining;
          }
          
          if (remaining <= 0) {
            clearInterval(timer);
            await storage.updateSession({ sessionId, status: 'ended' });
            io.to(`session:${sessionId}`).emit('session:ended');
            io.to(`session:${sessionId}`).emit('timer:finished');
            sessionTimers.delete(sessionId);
            console.log(`Session ${sessionId} timer finished`);
          } else {
            io.to(`session:${sessionId}`).emit('timer:tick', { remaining });
          }
        }, 1000);
        
        return timer;
      };
      
      // Store timer info
      sessionTimers.set(sessionId, {
        timer: startTimer(),
        endsAt,
        remaining: durationSec,
        isPaused: false
      });

      console.log(`Session ${sessionId} started with ${durationSec} seconds`);
    });

    // Student events
    socket.on('teacher:session:pause', async ({ sessionId }) => {
      const timerInfo = sessionTimers.get(sessionId);
      if (!timerInfo) return;
      
      timerInfo.isPaused = true;
      await storage.updateSession({ sessionId, status: 'paused' });
      io.to(`session:${sessionId}`).emit('session:paused', { 
        remaining: timerInfo.remaining
      });
    });

    socket.on('teacher:session:resume', async ({ sessionId }) => {
      const timerInfo = sessionTimers.get(sessionId);
      if (!timerInfo) return;
      
      // When resuming, update the end time based on remaining seconds
      const newEndsAt = new Date(Date.now() + (timerInfo.remaining * 1000)).toISOString();
      timerInfo.endsAt = newEndsAt;
      timerInfo.isPaused = false;
      
      await storage.updateSession({ 
        sessionId, 
        status: 'running',
        endsAt: newEndsAt
      });
      
      io.to(`session:${sessionId}`).emit('session:resumed', { 
        remaining: timerInfo.remaining,
        endsAt: newEndsAt
      });
    });

    socket.on('teacher:session:stop', async ({ sessionId }) => {
      const timerInfo = sessionTimers.get(sessionId);
      if (timerInfo) {
        clearInterval(timerInfo.timer);
        sessionTimers.delete(sessionId);
      }
      
      await storage.updateSession({ sessionId, status: 'ended' });
      io.to(`session:${sessionId}`).emit('session:ended');
    });

    socket.on('student:join', async ({ sessionId, studentId, name }) => {
      const session = await storage.getSession(sessionId);
      if (!session) return;

      socket.join(`session:${sessionId}`);
      
      // Update participants
      session.participants.push({ studentId, name });
      await storage.updateSession(session);

        io.to(`session:${sessionId}`).emit('participant:joined', {
        studentId,
        name,
        count: session.participants.length
      });
    });

    socket.on('student:answer', async ({ sessionId, studentId, questionId, answer, ts }) => {
      // Save answer and update leaderboard
      const session = await storage.getSession(sessionId);
      if (!session || session.status !== 'running') return;

      const quiz = await storage.getQuiz(session.quizId);
      if (!quiz) return;

      const question = quiz.questions.find(q => q.id === questionId);
      if (!question) return;

      const studentAnswer: StudentAnswer = {
        questionId,
        answer,
        isCorrect: answer === question.answer,
        answeredAt: ts || new Date().toISOString()
      };

      // Get or create leaderboard
      let leaderboard = leaderboards.get(sessionId);
      if (!leaderboard) {
        leaderboard = new LeaderboardAggregator(sessionId);
        leaderboards.set(sessionId, leaderboard);
      }

      // Update leaderboard
      const attempts = await storage.getAttemptsByStudent(session.quizId, studentId);
      const currentAttempt = attempts[attempts.length - 1];
      if (currentAttempt) {
        currentAttempt.answers.push(studentAnswer);
        leaderboard.update(studentId, currentAttempt.answers);
        await storage.saveAttempt(currentAttempt);
      }

      // Acknowledge answer
      socket.emit('answer:ack', { questionId });

      // Broadcast leaderboard update
        io.to(`session:${sessionId}`).emit('leaderboard:update', {
        sessionId,
        rows: leaderboard.getSnapshot()
      });
    });

    // Heartbeat for presence
    socket.on('student:heartbeat', ({ sessionId, studentId }) => {
      // Could implement presence tracking here
    });
  });

  // Recover any active timers when server starts
  recoverActiveTimers(io);

  global.io = io;
  return io;
}
