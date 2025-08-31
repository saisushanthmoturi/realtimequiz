"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QuizResult {
  id: string;
  title: string;
  date: string;
  participants: number;
  averageScore: number;
}

export default function TeacherResultsPage() {
  const [pastSessions, setPastSessions] = useState<QuizResult[]>([
    {
      id: "session-1",
      title: "Arrays and Pointers Quiz",
      date: "2025-08-25T14:30:00Z", 
      participants: 24,
      averageScore: 78.5
    },
    {
      id: "session-2",
      title: "JavaScript Fundamentals",
      date: "2025-08-20T10:15:00Z", 
      participants: 18,
      averageScore: 82.3
    },
    {
      id: "session-3",
      title: "Data Structures",
      date: "2025-08-15T13:45:00Z", 
      participants: 21,
      averageScore: 75.9
    }
  ]);

  // Format date string to readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-6 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Past Quiz Results</h1>
          <p className="text-slate-400 mt-1 text-sm">Review previous quiz sessions and student performances</p>
        </div>
        
        <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-6 shadow-lg">
          {pastSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No past sessions found</p>
              <Link href="/teacher" className="text-blue-400 hover:underline mt-2 inline-block">
                Create your first quiz
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pastSessions.map((session) => (
                <div 
                  key={session.id} 
                  className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-700/20 transition-colors"
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-medium text-white">{session.title}</h3>
                    <p className="text-sm text-slate-400">{formatDate(session.date)}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-xs text-slate-400">Participants</div>
                      <div className="text-lg font-medium text-white">{session.participants}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Avg. Score</div>
                      <div className="text-lg font-medium text-white">{session.averageScore}%</div>
                    </div>
                    <Link 
                      href={`/teacher/session?id=${session.id}`}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
