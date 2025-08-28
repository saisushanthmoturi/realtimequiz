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
    const userType = sessionStorage.getItem('userType');
    const storedUserId = sessionStorage.getItem('userId');
    
    if (userType !== 'student' || !storedUserId) {
      router.push('/');
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
    sessionStorage.clear();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600">Welcome, {userId}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Join Live Quiz Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Join Live Quiz</h3>
          <p className="text-gray-600 mb-6">
            Enter the session code provided by your teacher to join a live quiz.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
                Session Code
              </label>
              <input
                id="sessionCode"
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code (e.g., IPBKIT)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-mono text-lg tracking-widest"
                maxLength={6}
                autoComplete="off"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={joinQuiz}
                disabled={isJoining || !sessionCode.trim()}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join Quiz'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">📝 How to Join:</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
              <li>Get the 6-digit session code from your teacher</li>
              <li>Enter the code above and click "Join Quiz"</li>
              <li>Wait for your teacher to start the timer</li>
              <li>Complete all questions before time runs out</li>
            </ol>
          </div>

          {/* AI Features Info */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <h4 className="text-lg font-semibold text-purple-900 mb-2">🤖 AI-Powered Questions</h4>
            <p className="text-purple-800 text-sm mb-4">
              Each student gets unique, AI-generated questions tailored to the quiz topic!
            </p>
            <ul className="space-y-1 text-purple-700 text-sm">
              <li>• Different questions prevent cheating</li>
              <li>• Personalized difficulty and explanations</li>
              <li>• Intelligent fallback when API unavailable</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
