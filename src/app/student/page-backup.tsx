'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Quiz {
  id: string;
  title: string;
  topic: string;
  description?: string;
  timeLimit: number;
  questionCount: number;
  type: 'live' | 'slip';
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
}

export default function StudentDashboard() {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is a student
    const userType = sessionStorage.getItem('userType');
    const storedUserId = sessionStorage.getItem('userId');
    const storedUserName = sessionStorage.getItem('userName');
    
    if (userType !== 'student' || !storedUserId) {
      router.push('/');
      return;
    }
    
    setUserId(storedUserId);
    setUserName(storedUserName || storedUserId);
    loadAvailableQuizzes();
  }, [router]);

  const loadAvailableQuizzes = async () => {
    try {
      const response = await fetch('/api/quiz');
      const data = await response.json();
      
      if (data.success) {
        // Filter for slip tests that are available
        const slipTests = data.quizzes.filter((quiz: Quiz) => 
          quiz.type === 'slip' && quiz.status !== 'draft'
        );
        setAvailableQuizzes(slipTests);
      }
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

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
        // Redirect to quiz taking page
        router.push(`/quiz?sessionCode=${sessionCode.toUpperCase()}`);
      } else {
        setError(data.message || 'Failed to join quiz');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const takeSlipTest = (quiz: Quiz) => {
    router.push(`/quiz?quizId=${quiz.id}&studentId=${userId}`);
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
            <p className="text-gray-600">Welcome back, {userId}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Join Live Quiz Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Join Live Quiz</h3>
          <p className="text-gray-600 mb-4">
            Enter the session code provided by your teacher to join a live quiz.
          </p>
          
          <div className="flex space-x-4">
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder="Enter session code (e.g., ABC123)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
            />
            <button
              onClick={joinQuiz}
              disabled={isJoining || !sessionCode.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isJoining ? 'Joining...' : 'Join Quiz'}
            </button>
          </div>
          
          {error && (
            <p className="text-red-600 text-sm mt-2 bg-red-50 p-3 rounded">{error}</p>
          )}
        </div>

        {/* Available Slip Tests */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Slip Tests</h3>
          
          {isLoadingQuizzes ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading available quizzes...</p>
            </div>
          ) : availableQuizzes.length > 0 ? (
            <div className="space-y-3">
              {availableQuizzes.map((quiz) => (
                <div key={quiz.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                      <p className="text-sm text-gray-600">Topic: {quiz.topic}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>{quiz.questionCount} questions</span>
                        <span>•</span>
                        <span>{quiz.timeLimit} minutes</span>
                      </div>
                      {quiz.description && (
                        <p className="text-xs text-gray-500 mt-1">{quiz.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => takeSlipTest(quiz)}
                      className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Start Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No slip tests available at the moment.</p>
          )}
        </div>

        {/* AI Testing Section */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">🤖 AI-Powered Questions</h3>
          <p className="text-purple-800 text-sm mb-4">
            Our platform now generates unique questions for each student using advanced AI technology!
          </p>
          <ul className="space-y-2 text-purple-700 text-sm">
            <li>• Each student gets different questions to prevent cheating</li>
            <li>• Questions are tailored to the quiz topic and difficulty level</li>
            <li>• Real-time generation with intelligent fallback system</li>
            <li>• Detailed explanations and personalized feedback</li>
          </ul>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Get a session code from your teacher for live quizzes</li>
            <li>• Or choose from available slip tests above</li>
            <li>• Answer AI-generated questions unique to you</li>
            <li>• Watch the timer and submit before time runs out</li>
            <li>• Get instant feedback and explanations</li>
            <li>• View your results and improvement suggestions</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
