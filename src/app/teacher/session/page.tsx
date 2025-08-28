"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuizSocket } from '@/hooks/useQuizSocket';

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
  const { leaderboard, timerSeconds, startSession, pauseSession, resumeSession, stopSession } = useQuizSocket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState(10);
  const [participants, setParticipants] = useState<Array<{studentId: string, name?: string}>>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('unknown');
  const [sessionResults, setSessionResults] = useState<SessionResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const sid = sessionStorage.getItem('rq_sessionId');
    const code = sessionStorage.getItem('rq_joinCode');
    if (sid) setSessionId(sid);
    if (code) setJoinCode(code);
  }, []);

  // Poll for session updates
  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionStatus = async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setParticipants(data.participants || []);
          setSessionStatus(data.status || 'unknown');
        }
      } catch (error) {
        console.error('Failed to fetch session status:', error);
      }
    };

    // Fetch immediately
    fetchSessionStatus();

    // Then poll every 5 seconds
    const interval = setInterval(fetchSessionStatus, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Poll for session results
  useEffect(() => {
    if (!sessionId) return;

    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}/results`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSessionResults(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session results:', error);
      }
    };

    // Fetch results every 10 seconds if session is active
    if (sessionStatus === 'running' || sessionStatus === 'ended') {
      fetchResults();
      const interval = setInterval(fetchResults, 10000);
      return () => clearInterval(interval);
    }
  }, [sessionId, sessionStatus]);

  const start = () => { if (sessionId) startSession(sessionId, durationMin * 60); };
  const pause = () => { if (sessionId) pauseSession(sessionId); };
  const resume = () => { if (sessionId) resumeSession(sessionId); };
  const stop = () => { if (sessionId) stopSession(sessionId); };

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
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Launch & monitor</h1>
          <p className="text-gray-600 mt-1">Manage the live session, timer, and leaderboard.</p>
        </div>
        <div className="flex gap-3">
          {sessionResults && sessionResults.results.length > 0 && (
            <button
              onClick={() => setShowResults(!showResults)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showResults 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showResults ? 'Hide Results' : 'Show Results'} ({sessionResults.results.length})
            </button>
          )}
          <Link href="/teacher" className="text-blue-600 hover:text-blue-800 font-medium">
            Back to dashboard
          </Link>
        </div>
      </div>

      {/* Student Results Section */}
      {showResults && sessionResults && sessionResults.results.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Student Results</h2>
              <p className="text-gray-600 text-sm">
                {sessionResults.totalAttempts} submissions • Average: {sessionResults.averageScore}%
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Session: {sessionResults.session.joinCode}
            </div>
          </div>

          <div className="space-y-4">
            {sessionResults.results
              .sort((a, b) => b.percentage - a.percentage)
              .map((result, index) => (
                <div 
                  key={result.attemptId} 
                  className="border rounded-lg p-4 bg-gray-50"
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
                        <div className="font-medium text-gray-900">
                          {result.studentId}
                          {sessionResults.results.filter(r => r.studentId === result.studentId).length > 1 && (
                            <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded-full">
                              Attempt #{sessionResults.results
                                .filter(r => r.studentId === result.studentId)
                                .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
                                .findIndex(r => r.attemptId === result.attemptId) + 1}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Submitted at {formatDateTime(result.submittedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        result.percentage >= 90 ? 'text-green-600' :
                        result.percentage >= 80 ? 'text-blue-600' :
                        result.percentage >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {result.percentage}%
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.score}/{result.totalQuestions} • {formatTime(result.timeSpent)}
                      </div>
                    </div>
                  </div>

                  {/* Answer breakdown */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Session Section */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Session</h2>
            
            {joinCode ? (
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-800 mb-1">Join code</div>
                    <div className="font-mono text-3xl font-bold text-green-900 tracking-wider">
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
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 mb-6">
                <p className="text-gray-600 text-center">
                  No session found. Create one from the Teacher dashboard.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Timer */}
              <div className="rounded-lg border bg-gray-50 p-4 text-center">
                <div className="text-sm font-medium text-gray-600 mb-2">Timer</div>
                <div className="font-mono text-2xl font-bold text-gray-900">
                  {typeof timerSeconds === 'number' ? formatTime(timerSeconds) : '--:--'}
                </div>
              </div>

              {/* Duration Input */}
              <div className="rounded-lg border bg-gray-50 p-4">
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Duration (minutes)
                </label>
                <input 
                  type="number" 
                  min={1} 
                  max={180} 
                  value={durationMin}
                  onChange={(e) => setDurationMin(Math.max(1, Math.min(180, parseInt(e.target.value || '10', 10))))}
                  className="w-full rounded-md border-gray-300 px-3 py-2 text-center font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Control Buttons */}
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="text-sm font-medium text-gray-600 mb-2 text-center">Controls</div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={start} 
                    disabled={!sessionId}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Start
                  </button>
                  <button 
                    onClick={pause} 
                    disabled={!sessionId}
                    className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Pause
                  </button>
                  <button 
                    onClick={resume} 
                    disabled={!sessionId}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Resume
                  </button>
                  <button 
                    onClick={stop} 
                    disabled={!sessionId}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Leaderboard</h2>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-lg mb-2">📊</div>
                <p>No submissions yet.</p>
                <p className="text-sm mt-1">Results will appear here as students complete the quiz.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((row, i) => (
                  <div 
                    key={row.studentId} 
                    className={`flex items-center justify-between rounded-lg p-4 border-2 ${
                      i === 0 ? 'border-yellow-200 bg-yellow-50' : 
                      i === 1 ? 'border-gray-200 bg-gray-50' :
                      i === 2 ? 'border-orange-200 bg-orange-50' :
                      'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        i === 0 ? 'bg-yellow-500 text-white' :
                        i === 1 ? 'bg-gray-400 text-white' :
                        i === 2 ? 'bg-orange-500 text-white' :
                        'bg-gray-300 text-gray-700'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Student {row.studentId}</div>
                        <div className="text-sm text-gray-600">{row.percent.toFixed(1)}% correct</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{row.percent.toFixed(1)}%</div>
                      {/* Could add submission time here */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tips Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💡 Tips</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-0.5">•</span>
                Share the join code with students.
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-500 mt-0.5">•</span>
                Start the timer when all are ready.
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-500 mt-0.5">•</span>
                You can pause/resume at any time.
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-500 mt-0.5">•</span>
                Monitor the leaderboard for real-time progress.
              </li>
            </ul>
          </div>

          {/* Session Info */}
          <div className="rounded-lg border bg-blue-50 p-6 shadow-sm">
            <h3 className="font-semibold text-blue-900 mb-3">Session Status</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sessionStatus === 'running' ? 'bg-green-100 text-green-800' :
                  sessionStatus === 'ready' ? 'bg-yellow-100 text-yellow-800' :
                  sessionStatus === 'paused' ? 'bg-orange-100 text-orange-800' :
                  sessionStatus === 'ended' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Session ID:</span>
                <span className="font-mono text-blue-900 text-xs">{sessionId || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Join Code:</span>
                <span className="font-mono text-blue-900 font-bold">{joinCode || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Participants:</span>
                <span className="font-semibold text-blue-900">{participants.length}</span>
              </div>
            </div>
            
            {participants.length > 0 && (
              <div className="mt-4 pt-3 border-t border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Current Participants:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {participants.map((p, i) => (
                    <div key={p.studentId} className="text-xs text-blue-800 bg-blue-100 px-2 py-1 rounded">
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
  );
}
