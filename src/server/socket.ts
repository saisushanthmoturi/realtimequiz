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

export function initSocketIO(server: HttpServer): SocketServer {
  if (global.io) {
    return global.io;
  }

  const io = new SocketServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  // Session management
  io.on('connection', (socket) => {
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

    // Store timers for each session to manage pause/resume
    const sessionTimers = new Map<string, { 
      timer: NodeJS.Timeout;
      endsAt: string;
      remaining: number;
      isPaused: boolean;
    }>();

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

      // Start timer
      const timer = setInterval(() => {
        const timerInfo = sessionTimers.get(sessionId);
        if (!timerInfo || timerInfo.isPaused) return;

        const now = Date.now();
        const end = new Date(timerInfo.endsAt).getTime();
        const remaining = Math.ceil((end - now) / 1000);
        
        // Update the remaining time in our timer info
        timerInfo.remaining = remaining;
        
        if (remaining <= 0) {
          clearInterval(timer);
          storage.updateSession({ sessionId, status: 'ended' });
          io.to(`session:${sessionId}`).emit('session:ended');
          sessionTimers.delete(sessionId);
        } else {
          io.to(`session:${sessionId}`).emit('timer:tick', { remaining });
        }
      }, 1000);
      
      // Store timer info
      sessionTimers.set(sessionId, {
        timer,
        endsAt,
        remaining: durationSec,
        isPaused: false
      });
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

  global.io = io;
  return io;
}
