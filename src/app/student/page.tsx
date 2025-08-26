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
          sessionCode: sessionCode.toUpperCase(),
          studentId: userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store quiz data in sessionStorage for the quiz page
        sessionStorage.setItem('currentQuiz', JSON.stringify(data.quiz));
        // Redirect to quiz taking page
        router.push(`/quiz?sessionCode=${sessionCode.toUpperCase()}`);
      } else {
        setError(data.message || 'Failed to join quiz');
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
          
          <div className="flex space-x-4 mb-6">
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder="Enter session code (e.g., ABC123)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={6}
            />
            <button
              onClick={joinQuiz}
              disabled={isJoining || !sessionCode.trim()}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isJoining ? 'Joining...' : 'Join Quiz'}
            </button>
          </div>

          {/* Active Session Codes for Testing */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Test Session Codes:</h4>
            <div className="flex space-x-2 text-sm">
              <button 
                onClick={() => setSessionCode('8HR0SX')}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200"
              >
                8HR0SX
              </button>
              <button 
                onClick={() => setSessionCode('NOCO0P')}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200"
              >
                NOCO0P
              </button>
              <button 
                onClick={() => setSessionCode('NDAQBX')}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200"
              >
                NDAQBX
              </button>
            </div>
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
