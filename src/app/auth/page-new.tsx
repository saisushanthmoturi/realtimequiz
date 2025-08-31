'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type UserType = 'teacher' | 'student';

export default function AuthPage() {
  // State
  const [userType, setUserType] = useState<UserType>('teacher');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const router = useRouter();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    // Validate form
    if (!userId.trim()) {
      setErrorMessage('Please enter your ID');
      return;
    }

    if (userType === 'teacher' && !isRegistering && !password) {
      setErrorMessage('Password is required for teachers');
      return;
    }

    if (isRegistering) {
      if (!name.trim()) {
        setErrorMessage('Please enter your name');
        return;
      }
      
      if (userType === 'teacher' && !password.trim()) {
        setErrorMessage('Password is required for teachers');
        return;
      }
      
      if (userType === 'teacher' && !email.trim()) {
        setErrorMessage('Email is required for teachers');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Determine which API to call
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      
      // Prepare payload based on registration vs login
      const payload: Record<string, any> = {
        userId: userId.trim(),
        userType
      };
      
      // Add additional fields for registration
      if (isRegistering) {
        payload.name = name.trim();
        
        if (userType === 'teacher') {
          payload.password = password;
          payload.email = email.trim();
        }
      } else if (userType === 'teacher') {
        // Password for teacher login
        payload.password = password;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        // For login, store user and redirect
        if (!isRegistering) {
          localStorage.setItem('user', JSON.stringify({
            id: result.user?.id || userId.trim(),
            userId: result.user?.userId || userId.trim(),
            name: result.user?.name || '',
            type: userType,
            token: result.token || ''
          }));

          // Redirect to the appropriate dashboard
          router.push(userType === 'teacher' ? '/teacher' : '/student');
        } else {
          // For registration, show success and switch to login mode
          setSuccessMessage('Registration successful! You can now log in.');
          setIsRegistering(false);
          // Clear form except userId
          setPassword('');
          setName('');
          setEmail('');
        }
      } else {
        setErrorMessage(result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle between login and registration
  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Switch between teacher and student mode
  const handleUserTypeChange = (type: UserType) => {
    setUserType(type);
    setErrorMessage('');
    // Clear password if switching to student (not needed for students)
    if (type === 'student') {
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_50%)]"></div>
      
      <div className="relative min-h-screen flex">
        {/* Left Section - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <div className="w-24 h-24 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <span className="text-4xl font-bold text-white">Q</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-6">QuizHub</h1>
            <p className="text-xl text-slate-300 mb-8">
              AI-Powered Real-time Quiz Platform for Modern Education
            </p>
            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-300">AI-Generated Questions</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-slate-300">Real-time Quizzes</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-slate-300">Personalized Feedback</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-lg">
            {/* Back to Home Link */}
            <Link 
              href="/"
              className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>

            {/* Mobile Branding */}
            <div className="text-center mb-8 lg:hidden">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">Q</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">QuizHub</h1>
              <p className="text-slate-300">
                {isRegistering ? 'Create your account' : 'Sign in to access your dashboard'}
              </p>
            </div>

            {/* Auth Card */}
            <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
              {/* Header for Desktop */}
              <div className="text-center mb-8 hidden lg:block">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-slate-400">
                  {isRegistering ? 'Register to start using QuizHub' : 'Sign in to access your dashboard'}
                </p>
              </div>

              {/* Auth Mode Tabs */}
              <div className="flex justify-center mb-6 border-b border-slate-700">
                <button 
                  onClick={() => toggleAuthMode()} 
                  className={`py-3 px-6 font-medium text-sm transition-all ${
                    !isRegistering ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => toggleAuthMode()} 
                  className={`py-3 px-6 font-medium text-sm transition-all ${
                    isRegistering ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Register
                </button>
              </div>

              {/* Error/Success Messages */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                  {errorMessage}
                </div>
              )}
              
              {successMessage && (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-sm">
                  {successMessage}
                </div>
              )}

              {/* User Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">I am a:</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleUserTypeChange('teacher')}
                    className={`p-4 md:p-6 rounded-xl border-2 transition-all ${
                      userType === 'teacher'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-2xl md:text-3xl mb-2">👨‍🏫</div>
                    <div className="font-medium text-sm md:text-base">Teacher</div>
                    <div className="text-xs md:text-sm opacity-75">Faculty ID</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleUserTypeChange('student')}
                    className={`p-4 md:p-6 rounded-xl border-2 transition-all ${
                      userType === 'student'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-2xl md:text-3xl mb-2">🎓</div>
                    <div className="font-medium text-sm md:text-base">Student</div>
                    <div className="text-xs md:text-sm opacity-75">Student ID</div>
                  </button>
                </div>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* User ID */}
                <div>
                  <label htmlFor="userId" className="block text-sm font-medium text-slate-300 mb-2">
                    {userType === 'teacher' ? 'Faculty ID' : 'Student ID'}
                  </label>
                  <input
                    type="text"
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={userType === 'teacher' ? 'Enter your Faculty ID' : 'Enter your Student ID'}
                    required
                  />
                </div>

                {/* Password field - only for teachers or when registering */}
                {(userType === 'teacher') && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your password"
                      required={userType === 'teacher'}
                    />
                  </div>
                )}

                {/* Additional fields for registration */}
                {isRegistering && (
                  <>
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    {/* Email field - only for teachers */}
                    {userType === 'teacher' && (
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Enter your email address"
                          required={userType === 'teacher'}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{isRegistering ? 'Creating Account...' : 'Signing In...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-700/50 text-center text-slate-400 text-xs">
                <p>
                  {isRegistering
                    ? 'By registering, you agree to our Terms of Service and Privacy Policy'
                    : 'Need help signing in? Contact your administrator'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
