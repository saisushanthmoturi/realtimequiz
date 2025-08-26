'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [userType, setUserType] = useState<'teacher' | 'student' | null>(null);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!id.trim()) {
      setError('Please enter your ID');
      setIsLoading(false);
      return;
    }

    // Simple validation - you can enhance this
    if (userType === 'teacher' && id.length < 3) {
      setError('Please enter a valid Faculty ID');
      setIsLoading(false);
      return;
    }

    if (userType === 'student' && id.length < 3) {
      setError('Please enter a valid Roll Number');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: id,
          password: password || undefined, // Send undefined if no password for demo mode
          userType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user info in sessionStorage
        sessionStorage.setItem('userType', userType!);
        sessionStorage.setItem('userId', id);
        sessionStorage.setItem('userName', data.user.name);
        
        // Redirect to appropriate dashboard
        if (userType === 'teacher') {
          router.push('/teacher');
        } else {
          router.push('/student');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">QuizHub</h1>
          <p className="text-gray-600 mt-2">AI-Powered Real-time Quiz Platform</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* User Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Login as:
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="userType"
                  value="teacher"
                  checked={userType === 'teacher'}
                  onChange={(e) => setUserType(e.target.value as 'teacher')}
                  className="mr-2"
                />
                Teacher (Faculty ID)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="userType"
                  value="student"
                  checked={userType === 'student'}
                  onChange={(e) => setUserType(e.target.value as 'student')}
                  className="mr-2"
                />
                Student (Roll Number)
              </label>
            </div>
          </div>

          {/* ID Input */}
          {userType && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {userType === 'teacher' ? 'Faculty ID' : 'Roll Number'}
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder={`Enter your ${userType === 'teacher' ? 'Faculty ID' : 'Roll Number'}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Password Input (Optional for demo) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password (Optional for demo)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for demo mode"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Demo mode: No password required, just enter your ID
                </p>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={!userType || !id.trim() || isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>✨ Features: AI-Generated Questions • Real-time Quizzes • Personalized Feedback</p>
          <p className="mt-2">Welcome to your college quiz platform</p>
          <p>✨ Features: AI-Generated Questions • Real-time Quizzes • Personalized Feedback</p>
          <p className="mt-2">Welcome to your college quiz platform</p>
        </div>
      </div>
    </div>
  );
}
