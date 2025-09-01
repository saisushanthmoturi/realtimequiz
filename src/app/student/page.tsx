'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboard() {
  const [userId, setUserId] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is a student
    // Try sessionStorage first, then fallback to localStorage
    let userType = sessionStorage.getItem('userType');
    let storedUserId = sessionStorage.getItem('userId');
    
    // If not in sessionStorage, try localStorage
    if (!userType || !storedUserId) {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsed = JSON.parse(userData);
          userType = parsed.type;
          storedUserId = parsed.userId;
          
          // Store in sessionStorage for consistency
          if (userType) sessionStorage.setItem('userType', userType);
          if (storedUserId) sessionStorage.setItem('userId', storedUserId);
          sessionStorage.setItem('userName', parsed.name || '');
          sessionStorage.setItem('authToken', parsed.token || '');
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    if (userType !== 'student' || !storedUserId) {
      router.push('/auth');
      return;
    }
    
    setUserId(storedUserId);
  }, [router]);

  const joinQuiz = async () => {
    setError('');
    setIsJoining(true);
    
    if (!sessionCode.trim()) {
      setError('Please enter a session code');
      setIsJoining(false);
      return;
    }

    try {
      const response = await fetch('/api/quiz/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode: sessionCode.toUpperCase(),
          studentId: userId,
          studentName: `Student ${userId}`
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store quiz data in sessionStorage for the quiz page
        sessionStorage.setItem('currentQuiz', JSON.stringify(data.quiz));
        sessionStorage.setItem('currentSessionId', data.sessionId);
        
        // Show success message briefly before redirect
        setError(''); // Clear any previous errors
        
        // Redirect to quiz taking page
        router.push(`/quiz?sessionCode=${sessionCode.toUpperCase()}`);
      } else {
        // Provide more specific error messages
        if (response.status === 404) {
          setError('Session not found. Please check the join code or ask your teacher for a new one.');
        } else if (response.status === 400) {
          setError('Invalid session code format. Please enter a 6-digit code.');
        } else {
          setError(data.message || 'Failed to join quiz. Please try again.');
        }
      }
    } catch (error) {
      console.error('Join quiz error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    router.push('/auth');
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_50%)]"></div>
      
      <div className="relative">
        <div className="mx-auto max-w-7xl p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Student Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">Welcome back, {userId}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>

          {/* Join Quiz Section */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/80 p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-2">Join Live Quiz</h2>
              <p className="text-slate-400">Enter the session code provided by your teacher to join a live quiz session</p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-700/40 bg-red-500/10 px-4 py-3 text-red-300">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left side - Join Quiz Form */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="sessionCode" className="block text-sm font-medium text-slate-300 mb-3">
                    Session Code
                  </label>
                  <div className="flex gap-3">
                    <input
                      id="sessionCode"
                      type="text"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-digit code"
                      className="flex-1 rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={6}
                      autoComplete="off"
                    />
                    <button
                      onClick={joinQuiz}
                      disabled={isJoining || !sessionCode.trim()}
                      className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isJoining ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Joining...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Join Quiz
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Instructions Card */}
                <div className="rounded-lg border border-blue-700/50 bg-blue-500/10 p-6">
                  <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    How to Join
                  </h3>
                  <ol className="space-y-2 text-sm text-blue-200">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">1</span>
                      <span>Get the 6-digit session code from your teacher</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">2</span>
                      <span>Enter the code and click "Join Quiz"</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">3</span>
                      <span>Wait for the teacher to start the timer</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">4</span>
                      <span>Answer all questions before time runs out</span>
                    </li>
                  </ol>
                </div>
              </div>

              {/* Right side - Features */}
              <div className="space-y-6">
                {/* AI Features Card */}
                <div className="rounded-lg border border-purple-700/50 bg-purple-500/10 p-6">
                  <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI-Powered Questions
                  </h3>
                  <p className="text-purple-200 text-sm mb-4">
                    Experience personalized learning with intelligent question generation
                  </p>
                  <ul className="space-y-2 text-sm text-purple-200">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      <span>Unique questions for each student</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      <span>Adaptive difficulty levels</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      <span>Instant feedback & explanations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      <span>Prevents cheating naturally</span>
                    </li>
                  </ul>
                </div>

                {/* Live Features Card */}
                <div className="rounded-lg border border-green-700/50 bg-green-500/10 p-6">
                  <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Real-time Features
                  </h3>
                  <ul className="space-y-2 text-sm text-green-200">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Live leaderboard updates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Real-time timer synchronization</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Instant result notifications</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Interactive quiz experience</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-slate-700/30">
                  <div className="text-2xl font-bold text-blue-400">AI</div>
                  <div className="text-sm text-slate-400">Powered Questions</div>
                </div>
                <div className="p-4 rounded-lg bg-slate-700/30">
                  <div className="text-2xl font-bold text-green-400">Live</div>
                  <div className="text-sm text-slate-400">Real-time Sessions</div>
                </div>
                <div className="p-4 rounded-lg bg-slate-700/30">
                  <div className="text-2xl font-bold text-purple-400">Smart</div>
                  <div className="text-sm text-slate-400">Adaptive Learning</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
