"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizSocket } from '@/hooks/useQuizSocket';
import type { GeneratedQuiz, QuizQuestion, Difficulty, Mode } from '@/types/quiz';
import Timer from '@/components/Timer';

export default function TeacherDashboard() {
  const router = useRouter();
  const PRESET_PER_SET = [5, 10, 15, 20, 25, 30, 40, 50];
  const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60];
  const [quizSetup, setQuizSetup] = useState({
    topics: [''],
    difficulty: 'medium' as Difficulty,
    numQuestions: 5,
    mode: 'same' as Mode,
    setCount: 1,
  });
  const [showCustomPerSet, setShowCustomPerSet] = useState(false);
  // Draft inputs to avoid forcing min while typing
  const [draftTotal, setDraftTotal] = useState('5');
  const [draftPerSet, setDraftPerSet] = useState('5');
  const [draftSets, setDraftSets] = useState('1');
  // Timer editing
  const [durationMin, setDurationMin] = useState<number>(10);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [draftDuration, setDraftDuration] = useState('10');
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const [currentQuiz, setCurrentQuiz] = useState<GeneratedQuiz | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { timerSeconds, startSession, connected, recoverSession, sessionStatus } = useQuizSocket();

  // UI step helper
  const step: 1 | 2 | 3 = !currentQuiz ? 1 : sessionId ? 3 : 2;

  const handleTopicChange = (index: number, value: string) => {
    const topics = [...quizSetup.topics];
    topics[index] = value;
    setQuizSetup({ ...quizSetup, topics });
  };

  const addTopic = () => setQuizSetup({ ...quizSetup, topics: [...quizSetup.topics, ''] });
  const removeTopic = (index: number) => setQuizSetup({ ...quizSetup, topics: quizSetup.topics.filter((_, i) => i !== index) });

  // useEffect to check authentication
  useEffect(() => {
    // Check if user is logged in and is a teacher
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
    
    if (userType !== 'teacher' || !storedUserId) {
      router.push('/auth');
      return;
    }
  }, [router]);

  // useEffect to check if we have a stored session and recover timer state
  useEffect(() => {
    try {
      const storedSession = sessionStorage.getItem('currentSession');
      if (storedSession && !currentQuiz) { // Only restore if no current quiz
        const session = JSON.parse(storedSession);
        setSessionId(session.id);
        setJoinCode(session.joinCode);
        
        // Try to recover session timer state if connected
        if (connected && session.id) {
          console.log('Attempting to recover session:', session.id);
          recoverSession(session.id);
        }
      }
    } catch (error) {
      console.error('Failed to load stored session:', error);
      // Clear corrupted session data
      try {
        sessionStorage.removeItem('currentSession');
      } catch (e) {
        console.error('Failed to clear corrupted session:', e);
      }
    }
  }, [currentQuiz, connected]); // Add connected as dependency

  // Enhanced logging for debugging
  useEffect(() => {
    console.log('Teacher Socket State:', {
      timerSeconds,
      sessionStatus,
      sessionId,
      connected,
      timestamp: new Date().toISOString()
    });
    
    // Test socket connection
    if (typeof window !== 'undefined') {
      console.log('Teacher page socket debugging:', {
        hasSocket: !!(window as any).io,
        currentSession: sessionStorage.getItem('currentSession')
      });
    }
  }, [timerSeconds, sessionStatus, sessionId, connected]);

  const generateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing session data when generating a new quiz
      setCurrentQuiz(null);
      setSessionId(null);
      setJoinCode(null);
      
      try {
        sessionStorage.removeItem('currentSession');
        sessionStorage.removeItem('rq_sessionId');
        sessionStorage.removeItem('rq_joinCode');
        sessionStorage.removeItem('rq_quizTitle');
      } catch (e) {
        console.error('Failed to clear session storage:', e);
      }
      
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: quizSetup.topics.filter(t => t.trim().length > 0),
          difficulty: quizSetup.difficulty,
          numQuestions: quizSetup.numQuestions,
          mode: quizSetup.mode,
          numSets: quizSetup.mode === 'different' ? quizSetup.setCount : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate quiz');
      const quiz = await res.json();
      setCurrentQuiz(quiz);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const refine = async (
    questionId: string,
    change: { reword?: boolean; difficulty?: Difficulty; convertType?: 'mcq' | 'true_false' | 'short_answer' }
  ) => {
    if (!currentQuiz) return;
    try {
      setLoading(true);
      const res = await fetch('/api/quiz/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: currentQuiz.id, questionId, change }),
      });
      if (!res.ok) throw new Error('Failed to refine question');
      const { question } = await res.json();
      setCurrentQuiz({
        ...currentQuiz,
        questions: currentQuiz.questions.map((q) => (q.id === questionId ? question : q)),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refine question');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!currentQuiz) return;
    try {
      setLoading(true);
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: currentQuiz.id, teacherId: 'teacher-1' }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const { sessionId, joinCode } = await res.json();
      setSessionId(sessionId);
      setJoinCode(joinCode);
      
      // Store session info in sessionStorage for use across tabs
      try {
        sessionStorage.setItem('currentSession', JSON.stringify({
          id: sessionId,
          joinCode: joinCode,
          quizId: currentQuiz.id, // Add quiz ID for validation
          quizTitle: currentQuiz.topics.join(', ') || 'Untitled Quiz',
          duration: durationMin * 60
        }));
      } catch (e) {
        console.error('Failed to store session data', e);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const launchSession = async (durationMinutes: number) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const res = await fetch('/api/session/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, durationSec: durationMinutes * 60 }),
      });
      if (!res.ok) throw new Error('Failed to launch session');
      startSession(sessionId, durationMinutes * 60);
      try {
        // Store quiz info for the session page
        sessionStorage.setItem('rq_sessionId', sessionId);
        if (joinCode) sessionStorage.setItem('rq_joinCode', joinCode);
        if (currentQuiz) sessionStorage.setItem('rq_quizTitle', currentQuiz.topics.join(', '));
      } catch {}
      // Navigate to the session monitoring page
      router.push('/teacher/session');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to launch session');
    } finally {
      setLoading(false);
    }
  };

  const startNewQuiz = () => {
    // Reset all state
    setCurrentQuiz(null);
    setSessionId(null);
    setJoinCode(null);
    setError(null);
    
    // Clear session storage
    try {
      sessionStorage.removeItem('currentSession');
      sessionStorage.removeItem('rq_sessionId');
      sessionStorage.removeItem('rq_joinCode');
      sessionStorage.removeItem('rq_quizTitle');
    } catch (e) {
      console.error('Failed to clear session storage:', e);
    }
  };

  return (
    <div className="relative">
      <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Create New Quiz</h1>
          <p className="mt-1 text-sm text-slate-400">Generate and refine questions with AI assistance</p>
        </div>
        <div className="flex items-center gap-4">
          {(currentQuiz || sessionId) && (
            <button
              onClick={startNewQuiz}
              className="rounded-md border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors"
            >
              Start New Quiz
            </button>
          )}
          {joinCode && (
            <div className="hidden md:flex items-center gap-3 rounded-lg border border-green-700/50 bg-green-500/10 px-4 py-2 text-green-300">
              <span className="text-sm font-medium">Join Code</span>
              <span className="font-mono text-lg font-bold">{joinCode}</span>
              <button
                onClick={() => navigator.clipboard.writeText(joinCode)}
                className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
              >
                Copy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-8 grid grid-cols-3 gap-2 text-sm">
        {[
          { num: 1, label: 'Generate with AI', desc: 'Create AI-powered questions' },
          { num: 2, label: 'Review & refine', desc: 'Edit and improve questions' },
          { num: 3, label: 'Launch', desc: 'Create session and start quiz' }
        ].map((item) => (
          <div
            key={item.num}
            className={`rounded-lg border p-3 ${
              step >= (item.num as 1|2|3) ? 'border-blue-500/80 bg-slate-800/80 text-blue-300' : 'border-slate-700 bg-slate-800/60 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                step >= (item.num as 1|2|3) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {item.num}
              </div>
              <div>
                <div>{item.label}</div>
                <div className="text-xs opacity-70">{item.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-700/40 bg-red-500/10 px-4 py-3 text-red-300">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Generator or Review */}
        <div className="lg:col-span-2 space-y-6">
          {!currentQuiz ? (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/80 p-6 shadow-lg">
              <h2 className="mb-1 text-xl font-semibold text-white">Generate a quiz</h2>
              <p className="mb-6 text-sm text-slate-400">Pick topics, difficulty and quantity. We’ll craft balanced questions.</p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-300">Topics</label>
                  {quizSetup.topics.map((topic, index) => (
                    <div key={index} className="mb-2 flex gap-2">
                      <input
                        className="flex-1 rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={topic}
                        onChange={(e) => handleTopicChange(index, e.target.value)}
                        placeholder="e.g. Arrays, Pointers"
                      />
                      <button
                        onClick={() => removeTopic(index)}
                        className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button onClick={addTopic} className="text-sm font-medium text-blue-400 hover:underline">+ Add topic</button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Difficulty</label>
                  <select
                    className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quizSetup.difficulty}
                    onChange={(e) => setQuizSetup({ ...quizSetup, difficulty: e.target.value as Difficulty })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                {quizSetup.mode === 'same' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Questions</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease"
                        className="rounded-md border border-slate-600 px-2 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
                        onClick={() => {
                          setQuizSetup((s) => {
                            const next = clamp((s.numQuestions || 1) - 1, 1, 50);
                            setDraftTotal(String(next));
                            return { ...s, numQuestions: next };
                          });
                        }}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={draftTotal}
                        onChange={(e) => setDraftTotal(e.target.value)}
                        onBlur={() => {
                          const n = parseInt(draftTotal, 10);
                          if (isNaN(n)) { setDraftTotal(String(quizSetup.numQuestions)); return; }
                          const safe = clamp(n, 1, 50);
                          setQuizSetup((s) => ({ ...s, numQuestions: safe }));
                          setDraftTotal(String(safe));
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Increase"
                        className="rounded-md border border-slate-600 px-2 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
                        onClick={() => {
                          setQuizSetup((s) => {
                            const next = clamp((s.numQuestions || 1) + 1, 1, 50);
                            setDraftTotal(String(next));
                            return { ...s, numQuestions: next };
                          });
                        }}
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">1–50 questions.</p>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Questions per set</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        className="rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={PRESET_PER_SET.includes(quizSetup.numQuestions) && !showCustomPerSet ? String(quizSetup.numQuestions) : 'custom'}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setShowCustomPerSet(true);
                          } else {
                            setShowCustomPerSet(false);
                            const vv = parseInt(e.target.value, 10);
                            setQuizSetup({ ...quizSetup, numQuestions: vv });
                            setDraftPerSet(String(vv));
                          }
                        }}
                      >
                        {PRESET_PER_SET.map((n) => (
                          <option key={n} value={n}>{n} per set</option>
                        ))}
                        <option value="custom">Custom…</option>
                      </select>

                      {showCustomPerSet && (
                        <input
                          type="number"
                          min={1}
                          max={50}
                          className="rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={draftPerSet}
                          onChange={(e) => setDraftPerSet(e.target.value)}
                          onBlur={() => {
                            const n = parseInt(draftPerSet, 10);
                            if (isNaN(n)) { setDraftPerSet(String(quizSetup.numQuestions)); return; }
                            const safe = clamp(n, 1, 50);
                            setQuizSetup((s) => ({ ...s, numQuestions: safe }));
                            setDraftPerSet(String(safe));
                          }}
                        />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Pick a preset or choose Custom (1–50 per set).</p>
                  </div>
                )}
                {quizSetup.mode === 'different' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-300">Number of sets</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-600 px-2 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
                        onClick={() => setQuizSetup((s) => ({ ...s, setCount: Math.max(1, (s.setCount || 1) - 1) }))}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={draftSets}
                        onChange={(e) => setDraftSets(e.target.value)}
                        onBlur={() => {
                          const n = parseInt(draftSets, 10);
                          if (isNaN(n)) { setDraftSets(String(quizSetup.setCount)); return; }
                          const safe = clamp(n, 1, 50);
                          setQuizSetup((s) => ({ ...s, setCount: safe }));
                          setDraftSets(String(safe));
                        }}
                      />
                      <button
                        type="button"
                        className="rounded-md border border-slate-600 px-2 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
                        onClick={() => setQuizSetup((s) => { const next = clamp((s.setCount || 1) + 1, 1, 50); setDraftSets(String(next)); return { ...s, setCount: next }; })}
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Used when "Different per student" is selected. We’ll generate a pool of sets.</p>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Mode</label>
                  <select
                    className="w-full rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={quizSetup.mode}
                    onChange={(e) => setQuizSetup({ ...quizSetup, mode: e.target.value as Mode })}
                  >
                    <option value="same">Same for all</option>
                    <option value="different">Different per student</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={generateQuiz}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-blue-300"
                >
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  {loading ? 'Generating…' : 'Generate with AI'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quiz summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm">
                  <p className="text-slate-400">Quantity</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {currentQuiz.mode === 'different'
                      ? `${currentQuiz.numQuestions} per set • ${currentQuiz.numSets ?? Math.ceil(currentQuiz.questions.length / Math.max(1, currentQuiz.numQuestions))} sets (${currentQuiz.questions.length} pool)`
                      : `${currentQuiz.numQuestions} questions`}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm">
                  <p className="text-slate-400">Difficulty</p>
                  <p className="mt-1 text-2xl font-semibold capitalize text-white">{currentQuiz.difficulty}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm">
                  <p className="text-slate-400">Mode</p>
                  <p className="mt-1 text-2xl font-semibold capitalize text-white">{currentQuiz.mode}</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm">
                  <p className="text-slate-400">Topics</p>
                  <p className="mt-1 text-2xl font-semibold truncate text-white">{currentQuiz.topics.join(', ')}</p>
                </div>
              </div>

              {/* Review list */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Review questions</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateQuiz}
                      disabled={loading}
                      className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentQuiz.mode === 'different' ? (
                    (() => {
                      const perSet = currentQuiz.questionsPerSet ?? currentQuiz.numQuestions;
                      const setCount = currentQuiz.numSets ?? Math.ceil(currentQuiz.questions.length / Math.max(1, perSet));
                      return (
                        <div className="space-y-4">
                          {Array.from({ length: setCount }).map((_, setIdx) => {
                            const start = setIdx * perSet;
                            const end = start + perSet;
                            const slice = currentQuiz.questions.slice(start, end);
                            return (
                              <div key={setIdx} className="rounded-lg border border-slate-700 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <h3 className="font-semibold text-white">Set {setIdx + 1}</h3>
                                  <span className="text-xs text-slate-400">{slice.length} question{slice.length === 1 ? '' : 's'}</span>
                                </div>
                                <div className="space-y-3">
                                  {slice.map((q: QuizQuestion, idx) => (
                                    <div key={q.id} className="rounded-md border border-slate-700 p-3">
                                      <div className="mb-1 flex items-start justify-between gap-3">
                                        <div>
                                          <div className="text-xs text-slate-400">Q{idx + 1} • {q.type.toUpperCase()} • {q.difficulty}</div>
                                          <p className="mt-1 font-medium text-white">{q.question}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => refine(q.id, { reword: true })} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50">Reword</button>
                                          <button onClick={() => refine(q.id, { difficulty: q.difficulty === 'hard' ? 'medium' : 'hard' })} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50">{q.difficulty === 'hard' ? 'Easier' : 'Harder'}</button>
                                        </div>
                                      </div>
                                      {q.type === 'mcq' && q.options && (
                                        <ul className="ml-6 list-disc text-sm text-slate-300">
                                          {q.options.map((opt, i) => (
                                            <li key={i} className="py-0.5"><span className="mr-2 font-mono text-xs text-slate-400">{String.fromCharCode(65 + i)}.</span>{opt}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    currentQuiz.questions.map((q: QuizQuestion, idx) => (
                      <div key={q.id} className="rounded-lg border border-slate-700 p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-slate-400">Q{idx + 1} • {q.type.toUpperCase()} • {q.difficulty}</div>
                            <p className="mt-1 font-medium text-white">{q.question}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => refine(q.id, { reword: true })} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50">Reword</button>
                            <button onClick={() => refine(q.id, { difficulty: q.difficulty === 'hard' ? 'medium' : 'hard' })} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50">{q.difficulty === 'hard' ? 'Easier' : 'Harder'}</button>
                          </div>
                        </div>
                        {q.type === 'mcq' && q.options && (
                          <ul className="ml-6 list-disc text-sm text-slate-300">
                            {q.options.map((opt, i) => (
                              <li key={i} className="py-0.5"><span className="mr-2 font-mono text-xs text-slate-400">{String.fromCharCode(65 + i)}.</span>{opt}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Session panel */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-6 shadow-lg">
            <h2 className="mb-1 text-xl font-semibold text-white">Session</h2>
            <p className="mb-4 text-sm text-slate-400">Create a code and start the timer when you’re ready.</p>

            {!sessionId ? (
              <div className="space-y-4">
                <button
                  onClick={createSession}
                  disabled={!currentQuiz || loading}
                  className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-300"
                >
                  Create session
                </button>
                <p className="text-xs text-slate-400">You’ll get a join code for students after creating the session.</p>
              </div>
            ) : (
              <div className="space-y-4">
        {joinCode && (
                  <div className="rounded-lg border border-green-700/50 bg-green-500/10 p-4 text-green-300">
                    <div className="text-xs">Join code</div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="font-mono text-2xl font-bold tracking-wide">{joinCode}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(joinCode)}
                        className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                      >
                        Copy
                      </button>
          <a href="/teacher/session" className="ml-2 rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700/50">Open monitor</a>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-slate-300 mb-2">Quiz Session Status</div>
                  {typeof timerSeconds === 'number' ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-slate-700 bg-slate-900/40 p-4 text-center">
                        <div className="font-mono text-2xl font-bold text-slate-200 mb-2">
                          {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <div className={`w-2 h-2 rounded-full ${
                            sessionStatus === 'running' ? 'bg-green-500 animate-pulse' :
                            sessionStatus === 'paused' ? 'bg-yellow-500' :
                            sessionStatus === 'ended' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}></div>
                          <span className={`font-medium capitalize ${
                            sessionStatus === 'running' ? 'text-green-400' :
                            sessionStatus === 'paused' ? 'text-yellow-400' :
                            sessionStatus === 'ended' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {sessionStatus === 'running' ? 'Quiz Running Live' :
                             sessionStatus === 'paused' ? 'Quiz Paused' :
                             sessionStatus === 'ended' ? 'Quiz Ended' :
                             'Session Status Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 text-center">
                        Students are seeing the same timer and can submit answers
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-300">Duration</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            className="rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={DURATION_PRESETS.includes(durationMin) && !showCustomDuration ? String(durationMin) : 'custom'}
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                setShowCustomDuration(true);
                              } else {
                                const v = parseInt(e.target.value, 10);
                                setShowCustomDuration(false);
                                setDurationMin(v);
                                setDraftDuration(String(v));
                              }
                            }}
                          >
                            {DURATION_PRESETS.map((m) => (
                              <option key={m} value={m}>{m} minutes</option>
                            ))}
                            <option value="custom">Custom…</option>
                          </select>

                          {showCustomDuration && (
                            <input
                              type="number"
                              min={1}
                              max={180}
                              className="rounded-md border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={draftDuration}
                              onChange={(e) => setDraftDuration(e.target.value)}
                              onBlur={() => {
                                const n = parseInt(draftDuration, 10);
                                if (isNaN(n)) { setDraftDuration(String(durationMin)); return; }
                                const safe = clamp(n, 1, 180);
                                setDurationMin(safe);
                                setDraftDuration(String(safe));
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => launchSession(durationMin)}
                        className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                      >
                        Start {durationMin}-minute quiz
                      </button>
                      
                      {/* Debug timer test button */}
                      <button
                        onClick={() => {
                          if (sessionId) {
                            console.log('Testing timer with sessionId:', sessionId);
                            startSession(sessionId, 60); // Test with 1 minute
                          } else {
                            console.log('No sessionId available for testing');
                          }
                        }}
                        className="w-full rounded-md border border-yellow-600 bg-yellow-500/20 px-4 py-2 text-sm font-medium text-yellow-300 hover:bg-yellow-500/30"
                      >
                        🧪 Test Timer (60s)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard removed: view live leaderboard on the session monitor page */}
        </div>
      </div>
      </div>
    </div>
  );
}
