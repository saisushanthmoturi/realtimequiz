import { useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Session, StudentAnswer } from '@/types/quiz';

type LeaderboardRow = {
  studentId: string;
  correct: number;
  total: number;
  percent: number;
};

export function useQuizSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'ready' | 'running' | 'paused' | 'ended' | 'unknown'>('unknown');
  const [endsAt, setEndsAt] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔌 Initializing socket connection...');
    const socket = io({
      path: '/api/socket',
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully!', socket.id);
      setConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('🔥 Socket connection error:', error);
      setConnected(false);
    });
    
    socket.on('leaderboard:update', ({ rows }) => {
      console.log('📊 Leaderboard update received:', rows);
      setLeaderboard(rows);
    });

    socket.on('timer:tick', ({ remaining }) => {
      console.log('⏱️ Timer tick received:', remaining);
      setTimerSeconds(remaining);
      setSessionStatus('running');
    });

    socket.on('session:started', ({ endsAt }) => {
      console.log('🚀 Session started:', endsAt);
      setSessionStatus('running');
      setEndsAt(endsAt);
    });

    socket.on('session:paused', ({ remaining }) => {
      console.log('⏸️ Session paused:', remaining);
      setTimerSeconds(remaining);
      setSessionStatus('paused');
    });

    socket.on('session:resumed', ({ remaining, endsAt }) => {
      console.log('▶️ Session resumed:', remaining, endsAt);
      setTimerSeconds(remaining);
      setSessionStatus('running');
      setEndsAt(endsAt);
    });

    socket.on('session:ended', () => {
      console.log('🏁 Session ended');
      setSessionStatus('ended');
      setTimerSeconds(null);
    });

    socket.on('timer:finished', () => {
      console.log('⏰ Timer finished');
      setSessionStatus('ended');
      setTimerSeconds(0);
    });

    socket.on('session:recovered', ({ sessionId, remaining, endsAt }) => {
      console.log('🔄 Session recovered:', sessionId, 'remaining:', remaining, 'endsAt:', endsAt);
      if (remaining > 0) {
        setTimerSeconds(remaining);
        setSessionStatus('running');
        setEndsAt(endsAt);
      } else {
        setSessionStatus('ended');
        setTimerSeconds(null);
      }
    });

    socket.on('session:expired', ({ sessionId }) => {
      console.log('⌛ Session expired:', sessionId);
      setSessionStatus('ended');
      setTimerSeconds(null);
    });

    socket.on('session:not_found', ({ sessionId }) => {
      console.log('❌ Session not found:', sessionId);
      setSessionStatus('unknown');
      setTimerSeconds(null);
    });

    socket.on('session:status', ({ sessionId, status }) => {
      console.log('📋 Session status update:', sessionId, status);
      setSessionStatus(status);
    });

    socket.on('session:error', ({ sessionId, error }) => {
      console.error('❌ Session error:', sessionId, error);
    });

    setSocket(socket);

    return () => {
      console.log('🔌 Cleaning up socket connection...');
      socket.disconnect();
    };
  }, []);

  const startSession = useCallback((sessionId: string, durationSec: number) => {
    socket?.emit('teacher:session:start', { sessionId, durationSec });
  }, [socket]);

  const pauseSession = useCallback((sessionId: string) => {
    socket?.emit('teacher:session:pause', { sessionId });
  }, [socket]);

  const resumeSession = useCallback((sessionId: string) => {
    socket?.emit('teacher:session:resume', { sessionId });
  }, [socket]);

  const stopSession = useCallback((sessionId: string) => {
    socket?.emit('teacher:session:stop', { sessionId });
  }, [socket]);

  const joinSession = useCallback((sessionId: string, studentId: string, name?: string) => {
    socket?.emit('student:join', { sessionId, studentId, name });
  }, [socket]);

  const submitAnswer = useCallback((params: {
    sessionId: string;
    studentId: string;
    questionId: string;
    answer: string;
  }) => {
    socket?.emit('student:answer', {
      ...params,
      ts: new Date().toISOString()
    });
  }, [socket]);

  const recoverSession = useCallback((sessionId: string) => {
    socket?.emit('teacher:session:reconnect', { sessionId });
  }, [socket]);

  return {
    connected,
    leaderboard,
    timerSeconds,
    sessionStatus,
    endsAt,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    joinSession,
    submitAnswer,
    recoverSession
  };
}
