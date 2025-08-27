"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuizSocket } from '@/hooks/useQuizSocket';
import type { GeneratedQuiz, QuizQuestion, Difficulty, Mode } from '@/types/quiz';

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

  const { leaderboard, timerSeconds, startSession } = useQuizSocket();

  // UI step helper
  const step: 1 | 2 | 3 = !currentQuiz ? 1 : sessionId ? 3 : 2;

  const handleTopicChange = (index: number, value: string) => {
    const topics = [...quizSetup.topics];
    topics[index] = value;
    setQuizSetup({ ...quizSetup, topics });
  };

  const addTopic = () => setQuizSetup({ ...quizSetup, topics: [...quizSetup.topics, ''] });
  const removeTopic = (index: number) => setQuizSetup({ ...quizSetup, topics: quizSetup.topics.filter((_, i) => i !== index) });

  const generateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
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
      try {
        sessionStorage.setItem('rq_sessionId', sessionId);
        sessionStorage.setItem('rq_joinCode', joinCode);
      } catch {}
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
        sessionStorage.setItem('rq_sessionId', sessionId);
        if (joinCode) sessionStorage.setItem('rq_joinCode', joinCode);
      } catch {}
      router.push('/teacher/session');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to launch session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Create, review, and run real-time quizzes with AI assistance.</p>
        </div>
        {joinCode && (
          <div className="hidden md:flex items-center gap-3 rounded-lg border bg-green-50 px-4 py-2 text-green-800">
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

      {/* Stepper */}
      <div className="mb-8 grid grid-cols-3 gap-2 text-sm">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 ${step >= (i as 1|2|3) ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-500'}`}
          >
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step >= (i as 1|2|3) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {i}
              </div>
              <span>
                {i === 1 && 'Generate with AI'}
                {i === 2 && 'Review & refine'}
                {i === 3 && 'Launch & monitor'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Generator or Review */}
        <div className="lg:col-span-2 space-y-6">
          {!currentQuiz ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-xl font-semibold">Generate a quiz</h2>
              <p className="mb-6 text-sm text-gray-500">Pick topics, difficulty and quantity. We’ll craft balanced questions.</p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Topics</label>
                  {quizSetup.topics.map((topic, index) => (
                    <div key={index} className="mb-2 flex gap-2">
                      <input
                        className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={topic}
                        onChange={(e) => handleTopicChange(index, e.target.value)}
                        placeholder="e.g. Arrays, Pointers"
                      />
                      <button
                        onClick={() => removeTopic(index)}
                        className="rounded-md border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button onClick={addTopic} className="text-sm font-medium text-blue-600 hover:underline">+ Add topic</button>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Difficulty</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="mb-1 block text-sm font-medium">Questions</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease"
                        className="rounded-md border px-2 py-2 text-sm hover:bg-gray-50"
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
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="rounded-md border px-2 py-2 text-sm hover:bg-gray-50"
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
                    <p className="mt-1 text-xs text-gray-500">1–50 questions.</p>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Questions per set</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <p className="mt-1 text-xs text-gray-500">Pick a preset or choose Custom (1–50 per set).</p>
                  </div>
                )}
                {quizSetup.mode === 'different' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Number of sets</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-2 py-2 text-sm hover:bg-gray-50"
                        onClick={() => setQuizSetup((s) => ({ ...s, setCount: Math.max(1, (s.setCount || 1) - 1) }))}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="rounded-md border px-2 py-2 text-sm hover:bg-gray-50"
                        onClick={() => setQuizSetup((s) => { const next = clamp((s.setCount || 1) + 1, 1, 50); setDraftSets(String(next)); return { ...s, setCount: next }; })}
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Used when "Different per student" is selected. We’ll generate a pool of sets.</p>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium">Mode</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
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
                <div className="rounded-lg border bg-white p-4 text-sm">
                  <p className="text-gray-500">Quantity</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {currentQuiz.mode === 'different'
                      ? `${currentQuiz.numQuestions} per set • ${currentQuiz.numSets ?? Math.ceil(currentQuiz.questions.length / Math.max(1, currentQuiz.numQuestions))} sets (${currentQuiz.questions.length} pool)`
                      : `${currentQuiz.numQuestions} questions`}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4 text-sm">
                  <p className="text-gray-500">Difficulty</p>
                  <p className="mt-1 text-2xl font-semibold capitalize">{currentQuiz.difficulty}</p>
                </div>
                <div className="rounded-lg border bg-white p-4 text-sm">
                  <p className="text-gray-500">Mode</p>
                  <p className="mt-1 text-2xl font-semibold capitalize">{currentQuiz.mode}</p>
                </div>
                <div className="rounded-lg border bg-white p-4 text-sm">
                  <p className="text-gray-500">Topics</p>
                  <p className="mt-1 text-2xl font-semibold truncate">{currentQuiz.topics.join(', ')}</p>
                </div>
              </div>

              {/* Review list */}
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Review questions</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateQuiz}
                      disabled={loading}
                      className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={createSession}
                      disabled={loading}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-300"
                    >
                      Create session
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
                              <div key={setIdx} className="rounded-lg border p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <h3 className="font-semibold">Set {setIdx + 1}</h3>
                                  <span className="text-xs text-gray-500">{slice.length} question{slice.length === 1 ? '' : 's'}</span>
                                </div>
                                <div className="space-y-3">
                                  {slice.map((q: QuizQuestion, idx) => (
                                    <div key={q.id} className="rounded-md border p-3">
                                      <div className="mb-1 flex items-start justify-between gap-3">
                                        <div>
                                          <div className="text-xs text-gray-500">Q{idx + 1} • {q.type.toUpperCase()} • {q.difficulty}</div>
                                          <p className="mt-1 font-medium text-gray-900">{q.question}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => refine(q.id, { reword: true })} className="rounded-md border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Reword</button>
                                          <button onClick={() => refine(q.id, { difficulty: q.difficulty === 'hard' ? 'medium' : 'hard' })} className="rounded-md border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">{q.difficulty === 'hard' ? 'Easier' : 'Harder'}</button>
                                        </div>
                                      </div>
                                      {q.type === 'mcq' && q.options && (
                                        <ul className="ml-6 list-disc text-sm text-gray-700">
                                          {q.options.map((opt, i) => (
                                            <li key={i} className="py-0.5"><span className="mr-2 font-mono text-xs text-gray-500">{String.fromCharCode(65 + i)}.</span>{opt}</li>
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
                      <div key={q.id} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-gray-500">Q{idx + 1} • {q.type.toUpperCase()} • {q.difficulty}</div>
                            <p className="mt-1 font-medium text-gray-900">{q.question}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => refine(q.id, { reword: true })} className="rounded-md border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Reword</button>
                            <button onClick={() => refine(q.id, { difficulty: q.difficulty === 'hard' ? 'medium' : 'hard' })} className="rounded-md border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">{q.difficulty === 'hard' ? 'Easier' : 'Harder'}</button>
                          </div>
                        </div>
                        {q.type === 'mcq' && q.options && (
                          <ul className="ml-6 list-disc text-sm text-gray-700">
                            {q.options.map((opt, i) => (
                              <li key={i} className="py-0.5"><span className="mr-2 font-mono text-xs text-gray-500">{String.fromCharCode(65 + i)}.</span>{opt}</li>
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
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-xl font-semibold">Session</h2>
            <p className="mb-4 text-sm text-gray-500">Create a code and start the timer when you’re ready.</p>

            {!sessionId ? (
              <div className="space-y-4">
                <button
                  onClick={createSession}
                  disabled={!currentQuiz || loading}
                  className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-300"
                >
                  Create session
                </button>
                <p className="text-xs text-gray-500">You’ll get a join code for students after creating the session.</p>
              </div>
            ) : (
              <div className="space-y-4">
        {joinCode && (
                  <div className="rounded-lg border bg-green-50 p-4 text-green-900">
                    <div className="text-xs">Join code</div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="font-mono text-2xl font-bold tracking-wide">{joinCode}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(joinCode)}
                        className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                      >
                        Copy
                      </button>
          <a href="/teacher/session" className="ml-2 rounded border px-2 py-1 text-xs">Open monitor</a>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-700">Timer</div>
                  {typeof timerSeconds === 'number' ? (
                    <div className="mt-1 rounded-md border bg-gray-50 p-3 text-center font-mono text-lg">
                      {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Duration</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Start {durationMin}-minute quiz
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Leaderboard</h2>
              <span className="text-xs text-gray-500">Auto-updates</span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-500">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((row, i) => (
                  <div key={row.studentId} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">{i + 1}</span>
                      <span className="text-sm text-gray-800">Student {row.studentId}</span>
                    </div>
                    <span className="text-sm font-semibold">{row.percent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
