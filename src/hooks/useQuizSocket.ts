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
    const socket = io({
      path: '/api/socket',
      autoConnect: true
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    
    socket.on('leaderboard:update', ({ rows }) => {
      setLeaderboard(rows);
    });

    socket.on('timer:tick', ({ remaining }) => {
      setTimerSeconds(remaining);
      setSessionStatus('running');
    });

    socket.on('session:started', ({ endsAt }) => {
      setSessionStatus('running');
      setEndsAt(endsAt);
    });

    socket.on('session:paused', ({ remaining }) => {
      setTimerSeconds(remaining);
      setSessionStatus('paused');
    });

    socket.on('session:resumed', ({ remaining, endsAt }) => {
      setTimerSeconds(remaining);
      setSessionStatus('running');
      setEndsAt(endsAt);
    });

    socket.on('session:ended', () => {
      setSessionStatus('ended');
    });

    setSocket(socket);

    return () => {
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
    submitAnswer
  };
}
