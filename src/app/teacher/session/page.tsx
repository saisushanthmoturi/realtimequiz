"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuizSocket } from '@/hooks/useQuizSocket';
import Timer from '@/components/Timer';

// Add interface for student results
interface StudentResult {
  attemptId: string; // Add unique attempt ID
  studentId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  submittedAt: string;
  timeSpent: number;
  answers: Array<{
    questionId: string;
    answer: string;
    isCorrect: boolean;
    answeredAt: string;
    latencyMs?: number;
  }>;
}

interface SessionResults {
  session: {
    sessionId: string;
    quizId: string;
    quizTitle: string;
    joinCode: string;
    status: string;
    participants: Array<{studentId: string, name?: string}>;
  };
  results: StudentResult[];
  totalAttempts: number;
  averageScore: number;
}

export default function TeacherSessionPage() {
  const { 
    leaderboard, 
    timerSeconds, 
    sessionStatus: socketStatus,
    startSession, 
    pauseSession, 
    resumeSession, 
    stopSession,
    connected,
    recoverSession
  } = useQuizSocket();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState(10);
  const [participants, setParticipants] = useState<Array<{studentId: string, name?: string}>>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('unknown');
  const [sessionResults, setSessionResults] = useState<SessionResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [quizTitle, setQuizTitle] = useState<string>('Quiz Session');
  const [isOperationLoading, setIsOperationLoading] = useState(false);

  useEffect(() => {
    // Try to get session from new unified storage first
    try {
      const storedSession = sessionStorage.getItem('currentSession');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        setSessionId(session.id);
        setJoinCode(session.joinCode);
        if (session.quizTitle) {
          setQuizTitle(session.quizTitle);
        }
        if (session.duration) {
          setDurationMin(Math.floor(session.duration / 60));
        }
        return; // Exit if we found the session
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }

    // Fall back to old storage method if needed
    const sid = sessionStorage.getItem('rq_sessionId');
    const code = sessionStorage.getItem('rq_joinCode');
    const title = sessionStorage.getItem('rq_quizTitle');
    if (sid) setSessionId(sid);
    if (code) setJoinCode(code);
    if (title) setQuizTitle(title);
  }, []);

  // Update session status from socket
  useEffect(() => {
    if (socketStatus !== 'unknown') {
      setSessionStatus(socketStatus);
    }
  }, [socketStatus]);

  // Add session recovery when connected and sessionId is available
  useEffect(() => {
    if (connected && sessionId) {
      console.log('🔄 Session monitor: Attempting to recover session:', sessionId);
      // Add a small delay to ensure socket is fully ready
      setTimeout(() => {
        recoverSession(sessionId);
      }, 100);
    }
  }, [connected, sessionId, recoverSession]);

  // Also try to recover immediately when sessionId becomes available, even if already connected
  useEffect(() => {
    if (sessionId && connected) {
      console.log('🔄 Session monitor: Session ID available, attempting immediate recovery:', sessionId);
      recoverSession(sessionId);
    }
  }, [sessionId]);

  // Poll for session updates
  useEffect(() => {
    if (!sessionId) return;

    // Track consecutive failures to implement an exponential backoff
    let failureCount = 0;
    const maxRetries = 5;
    
    const fetchSessionStatus = async () => {
      try {
        // Add cache-busting parameter to avoid browser caching issues
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/session/${sessionId}?_=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Reset failure count on success
          failureCount = 0;
          setParticipants(data.participants || []);
          // Only update status from API if socket hasn't provided a status yet
          if (socketStatus === 'unknown') {
            setSessionStatus(data.status || 'unknown');
          }
        } else {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        failureCount++;
        if (failureCount <= maxRetries) {
          console.error(`Failed to fetch session status (attempt ${failureCount}/${maxRetries}):`, error);
        } else {
          console.error('Max retries reached for session status fetching:', error);
        }
      }
    };

    // Fetch immediately
    fetchSessionStatus();

    // Then poll every 5 seconds with exponential backoff on failures
    const interval = setInterval(() => {
      // If we've had too many consecutive failures, poll less frequently
      if (failureCount > maxRetries) {
        const backoffTime = Math.min(30000, Math.pow(2, failureCount - maxRetries) * 5000);
        console.log(`Backing off, next attempt in ${backoffTime/1000} seconds`);
        return;
      }
      fetchSessionStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [sessionId, socketStatus]);

  // Poll for session results
  useEffect(() => {
    if (!sessionId) return;

    // Track consecutive failures for exponential backoff
    let failureCount = 0;
    const maxRetries = 5;
    
    const fetchResults = async () => {
      try {
        // Add cache-busting parameter to prevent browser caching
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/session/${sessionId}/results?_=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Reset failure count on success
          failureCount = 0;
          if (data.success) {
            setSessionResults(data);
          }
        } else {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        failureCount++;
        if (failureCount <= maxRetries) {
          console.error(`Failed to fetch session results (attempt ${failureCount}/${maxRetries}):`, error);
        } else {
          console.error('Max retries reached for session results fetching:', error);
        }
      }
    };

    // Fetch results every 10 seconds if session is active
    if (sessionStatus === 'running' || sessionStatus === 'ended') {
      fetchResults();
      
      const interval = setInterval(() => {
        // If we've had too many consecutive failures, poll less frequently
        if (failureCount > maxRetries) {
          const backoffTime = Math.min(30000, Math.pow(2, failureCount - maxRetries) * 10000);
          console.log(`Results fetching backing off, next attempt in ${backoffTime/1000} seconds`);
          return;
        }
        fetchResults();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [sessionId, sessionStatus]);

  const start = async () => { 
    if (!sessionId) return;
    
    try {
      setIsOperationLoading(true);
      // First, ensure we update the session via API
      const response = await fetch(`/api/session/launch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          sessionId, 
          durationSec: durationMin * 60 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Server error: ${response.status} ${response.statusText}`
        );
      }
      
      // Then send the socket command
      startSession(sessionId, durationMin * 60);
      setSessionStatus('running');
    } catch (error) {
      console.error('Failed to start session:', error);
      // Show user feedback about the error
      alert(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsOperationLoading(false);
    }
  };
  
  const pause = async () => { 
    if (!sessionId) return;
    
    try {
      setIsOperationLoading(true);
      // Update via API first
      const response = await fetch(`/api/session/pause`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Server error: ${response.status} ${response.statusText}`
        );
      }
      
      // Then socket
      pauseSession(sessionId); 
      setSessionStatus('paused');
    } catch (error) {
      console.error('Failed to pause session:', error);
      alert(`Failed to pause session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsOperationLoading(false);
    }
  };
  
  const resume = async () => { 
    if (!sessionId) return;
    
    try {
      setIsOperationLoading(true);
      // Update via API first
      const response = await fetch(`/api/session/resume`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Server error: ${response.status} ${response.statusText}`
        );
      }
      
      // Then socket
      resumeSession(sessionId); 
      setSessionStatus('running');
    } catch (error) {
      console.error('Failed to resume session:', error);
      alert(`Failed to resume session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsOperationLoading(false);
    }
  };
  
  const stop = async () => { 
    if (!sessionId) return;
    
    try {
      setIsOperationLoading(true);
      // Update via API first
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Server error: ${response.status} ${response.statusText}`
        );
      }
      
      // Then socket
      stopSession(sessionId); 
      setSessionStatus('ended');
    } catch (error) {
      console.error('Failed to stop session:', error);
      alert(`Failed to stop session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsOperationLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString();
  };

  const copyJoinCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      // Could add a toast notification here
    }
  };

  return (
    <div className="relative">
      {/* Import TeacherNavigation component at the top */}
      <div className="mx-auto max-w-6xl px-6 space-y-6">
        <div className="flex items-center justify-between mt-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{quizTitle}</h1>
            <p className="text-slate-400 mt-1 text-sm">Manage the live session, timer, and leaderboard</p>
          </div>
          <div className="flex gap-3 items-center">
            {sessionResults && sessionResults.results.length > 0 && (
              <button
                onClick={() => setShowResults(!showResults)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showResults 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                {showResults ? 'Hide Results' : 'Show Results'} ({sessionResults.results.length})
              </button>
            )}
            <Link href="/teacher" className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 font-medium">
              Back to Dashboard
            </Link>
          </div>
        </div>

      {/* Student Results Section */}
      {showResults && sessionResults && sessionResults.results.length > 0 && (
        <div className="bg-slate-800/80 rounded-lg border border-slate-700 shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Student Results</h2>
              <p className="text-slate-400 text-sm">
                {sessionResults.totalAttempts} submissions • Average: {sessionResults.averageScore}%
              </p>
            </div>
            <div className="text-sm text-slate-400">
              Session: {sessionResults.session.joinCode}
            </div>
          </div>

          <div className="space-y-4">
            {sessionResults.results
              .sort((a, b) => b.percentage - a.percentage)
              .map((result, index) => (
                <div 
                  key={result.attemptId} 
                  className="border border-slate-700 rounded-lg p-4 bg-slate-900/40"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {result.studentId}
                          {sessionResults.results.filter(r => r.studentId === result.studentId).length > 1 && (
                            <span className="ml-2 text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded-full">
                              Attempt #{sessionResults.results
                                .filter(r => r.studentId === result.studentId)
                                .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
                                .findIndex(r => r.attemptId === result.attemptId) + 1}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          Submitted at {formatDateTime(result.submittedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        result.percentage >= 90 ? 'text-green-400' :
                        result.percentage >= 80 ? 'text-blue-400' :
                        result.percentage >= 70 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {result.percentage}%
                      </div>
                      <div className="text-sm text-slate-400">
                        {result.score}/{result.totalQuestions} • {formatTime(result.timeSpent)}
                      </div>
                    </div>
                  </div>

                  {/* Answer breakdown */}
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Correct: {result.answers.filter(a => a.isCorrect).length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Incorrect: {result.answers.filter(a => !a.isCorrect).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 items-start justify-center">
        <div className="lg:col-span-2 space-y-6 max-w-3xl w-full mx-auto">
          {/* Session Section */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Session</h2>
            
            {joinCode ? (
              <div className="rounded-lg border-2 border-green-700/50 bg-green-500/10 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-300 mb-1">Join code</div>
                    <div className="font-mono text-3xl font-bold text-green-300 tracking-wider">
                      {joinCode}
                    </div>
                  </div>
                  <button 
                    onClick={copyJoinCode}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-6 mb-6">
                <p className="text-slate-400 text-center">
                  No session found. Create one from the Teacher dashboard.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Timer */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-center">
                <div className="text-sm font-medium text-slate-300 mb-2">Timer</div>
                {typeof timerSeconds === 'number' ? (
                  <Timer 
                    initialSeconds={timerSeconds}
                    isActive={sessionStatus === 'running'}
                    showProgressBar={true}
                    className="w-full"
                  />
                ) : (
                  <div className="text-center py-4">
                    <div className="font-mono text-3xl font-bold text-slate-400">
                      --:--
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      {connected ? 'Waiting for timer...' : 'Connecting...'}
                    </div>
                  </div>
                )}
              </div>

              {/* Duration Input */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  Duration (minutes)
                </label>
                <input 
                  type="number" 
                  min={1} 
                  max={180} 
                  value={durationMin}
                  onChange={(e) => setDurationMin(Math.max(1, Math.min(180, parseInt(e.target.value || '10', 10))))}
                  className="w-full rounded-md border border-slate-600 bg-slate-700/50 text-white px-3 py-2 text-center font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Control Buttons */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                <div className="text-sm font-medium text-slate-300 mb-2 text-center">Controls</div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={start} 
                    disabled={!sessionId || isOperationLoading || sessionStatus === 'running' || sessionStatus === 'ended'}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center"
                  >
                    {isOperationLoading && sessionStatus === 'ready' ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : "Start"}
                  </button>
                  <button 
                    onClick={pause} 
                    disabled={!sessionId || sessionStatus !== 'running' || isOperationLoading}
                    className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center"
                  >
                    {isOperationLoading && sessionStatus === 'running' ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : "Pause"}
                  </button>
                  <button 
                    onClick={resume} 
                    disabled={!sessionId || sessionStatus !== 'paused' || isOperationLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center"
                  >
                    {isOperationLoading && sessionStatus === 'paused' ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : "Resume"}
                  </button>
                  <button 
                    onClick={stop} 
                    disabled={!sessionId || sessionStatus === 'ended' || isOperationLoading}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center"
                  >
                    {isOperationLoading && (sessionStatus === 'running' || sessionStatus === 'paused') ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : "Stop"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Session Info only (Tips removed) */}
  <div className="space-y-6 max-w-md w-full mx-auto">
          {/* Session Info */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-6 shadow-lg">
            <h3 className="font-semibold text-white mb-3">Session Status</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sessionStatus === 'running' ? 'bg-green-500/15 text-green-300 border border-green-700/40' :
                  sessionStatus === 'ready' ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-700/40' :
                  sessionStatus === 'paused' ? 'bg-orange-500/15 text-orange-300 border border-orange-700/40' :
                  sessionStatus === 'ended' ? 'bg-red-500/15 text-red-300 border border-red-700/40' :
                  'bg-slate-700/40 text-slate-300 border border-slate-600'
                }`}>
                  {sessionStatus === 'running' && timerSeconds ? (
                    <>Active • {formatTime(timerSeconds)} remaining</>
                  ) : (
                    sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Session ID:</span>
                <span className="font-mono text-slate-200 text-xs">{sessionId || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Join Code:</span>
                <span className="font-mono text-slate-100 font-bold">{joinCode || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Participants:</span>
                <span className="font-semibold text-white">{participants.length}</span>
              </div>
            </div>
            
            {participants.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-700">
                <h4 className="text-sm font-medium text-white mb-2">Current Participants:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {participants.map((p, i) => (
                    <div key={p.studentId} className="text-xs text-slate-200 bg-slate-700/60 px-2 py-1 rounded">
                      {p.name || p.studentId}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Integrated Leaderboard Section */}
  <section className="mt-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
        </div>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed border-slate-700/60 rounded-lg bg-slate-900/30">
            <div className="text-lg mb-2">📊</div>
            <p>No submissions yet.</p>
            <p className="text-sm mt-1">Results will appear here as students complete the quiz.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((row, i) => (
              <div
                key={row.studentId}
                className={`flex items-center justify-between rounded-md p-4 border ${
                  i === 0 ? 'border-yellow-400/40 bg-yellow-500/10' :
                  i === 1 ? 'border-slate-600 bg-slate-800/70' :
                  i === 2 ? 'border-orange-400/40 bg-orange-500/10' :
                  'border-slate-700 bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    i === 0 ? 'bg-yellow-500 text-white' :
                    i === 1 ? 'bg-slate-500 text-white' :
                    i === 2 ? 'bg-orange-500 text-white' :
                    'bg-slate-600 text-white'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">Student {row.studentId}</div>
                    <div className="text-sm text-slate-300">{row.percent.toFixed(1)}% correct</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-white">{row.percent.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Debug Section - Remove in production */}
      <section className="bg-slate-800 rounded-lg border border-slate-700 p-6 mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">🔧 Debug Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-900/60 p-3 rounded">
            <div className="text-slate-400">Socket Connected</div>
            <div className={`font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {connected ? 'Yes' : 'No'}
            </div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded">
            <div className="text-slate-400">Timer Seconds</div>
            <div className="text-white font-bold">
              {timerSeconds !== null ? timerSeconds : 'null'}
            </div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded">
            <div className="text-slate-400">Socket Status</div>
            <div className="text-white font-bold">{socketStatus}</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded">
            <div className="text-slate-400">Session Status</div>
            <div className="text-white font-bold">{sessionStatus}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => sessionId && recoverSession(sessionId)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            disabled={!sessionId || !connected}
          >
            🔄 Force Recovery
          </button>
          <button 
            onClick={() => console.log('Current state:', { sessionId, timerSeconds, sessionStatus, connected })}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
          >
            📋 Log State
          </button>
        </div>
      </section>
    </div>
  );
}
