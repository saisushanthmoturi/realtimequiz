"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuizSocket } from '@/hooks/useQuizSocket';

export default function TeacherSessionPage() {
  const { leaderboard, timerSeconds, startSession, pauseSession, resumeSession, stopSession } = useQuizSocket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [durationMin, setDurationMin] = useState(10);

  useEffect(() => {
    const sid = sessionStorage.getItem('rq_sessionId');
    const code = sessionStorage.getItem('rq_joinCode');
    if (sid) setSessionId(sid);
    if (code) setJoinCode(code);
  }, []);

  const start = () => { if (sessionId) startSession(sessionId, durationMin * 60); };
  const pause = () => { if (sessionId) pauseSession(sessionId); };
  const resume = () => { if (sessionId) resumeSession(sessionId); };
  const stop = () => { if (sessionId) stopSession(sessionId); };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Launch & monitor</h1>
          <p className="text-sm text-gray-500">Manage the live session, timer, and leaderboard.</p>
        </div>
        <Link href="/teacher" className="text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Session</h2>
            {joinCode ? (
              <div className="rounded-md border bg-green-50 p-4 text-green-900 flex items-center justify-between">
                <div>
                  <div className="text-xs">Join code</div>
                  <div className="font-mono text-2xl font-bold">{joinCode}</div>
                </div>
                <button onClick={() => joinCode && navigator.clipboard.writeText(joinCode)} className="rounded bg-green-600 px-3 py-1.5 text-white text-sm">Copy</button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No session found. Create one from the Teacher dashboard.</p>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-gray-500">Timer</div>
                <div className="mt-1 font-mono text-2xl">
                  {typeof timerSeconds === 'number' ? (
                    <span>{Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}</span>
                  ) : (
                    <span>--:--</span>
                  )}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-gray-500">Duration (minutes)</div>
                <input type="number" min={1} max={180} value={durationMin}
                       onChange={(e)=>setDurationMin(Math.max(1, Math.min(180, parseInt(e.target.value||'10',10))))}
                       className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="rounded-md border p-3 flex items-center justify-center gap-2">
                <button onClick={start} className="rounded bg-blue-600 px-3 py-2 text-white text-sm">Start</button>
                <button onClick={pause} className="rounded border px-3 py-2 text-sm">Pause</button>
                <button onClick={resume} className="rounded border px-3 py-2 text-sm">Resume</button>
                <button onClick={stop} className="rounded border px-3 py-2 text-sm">Stop</button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Leaderboard</h2>
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

        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Tips</h2>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>Share the join code with students.</li>
              <li>Start the timer when all are ready.</li>
              <li>You can pause/resume at any time.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
