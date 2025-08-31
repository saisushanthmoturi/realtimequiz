'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="w-full px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">Q</span>
            </div>
            <span className="text-2xl font-bold text-white">QuizHub</span>
          </div>
          <button 
            onClick={handleGetStarted}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-6">
            Welcome to <span className="text-blue-400">QuizHub</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            AI-Powered Real-time Quiz Platform for Modern Education
          </p>
          <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
            Create engaging quizzes, get real-time analytics, and enhance learning experiences 
            with our intelligent quiz platform designed for teachers and students.
          </p>
          <button 
            onClick={handleGetStarted}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">
          Why Choose QuizHub?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors duration-200">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-6">
              <span className="text-white font-bold text-xl">🤖</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">AI-Generated Questions</h3>
            <p className="text-slate-400">
              Automatically generate high-quality quiz questions using advanced AI technology. 
              Save time and create diverse, engaging content effortlessly.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors duration-200">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-6">
              <span className="text-white font-bold text-xl">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Real-time Quizzes</h3>
            <p className="text-slate-400">
              Conduct live quiz sessions with instant feedback and real-time leaderboards. 
              Keep students engaged with interactive, competitive learning.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 hover:border-blue-500 transition-colors duration-200">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-6">
              <span className="text-white font-bold text-xl">📊</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Personalized Feedback</h3>
            <p className="text-slate-400">
              Get detailed analytics and personalized insights for each student. 
              Track progress and identify areas for improvement with smart recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-white text-center mb-16">
          How It Works
        </h2>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* For Teachers */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-8">For Teachers</h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Create Your Quiz</h4>
                  <p className="text-slate-400">Use AI to generate questions or create your own custom quiz content</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Launch Session</h4>
                  <p className="text-slate-400">Start a live quiz session and share the join code with your students</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Monitor & Analyze</h4>
                  <p className="text-slate-400">Track real-time progress and get detailed analytics after the session</p>
                </div>
              </div>
            </div>
          </div>

          {/* For Students */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-8">For Students</h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Join Quiz</h4>
                  <p className="text-slate-400">Enter your roll number and the quiz code to join the session</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Answer Questions</h4>
                  <p className="text-slate-400">Participate in real-time and see your position on the live leaderboard</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Get Feedback</h4>
                  <p className="text-slate-400">Receive personalized insights and recommendations for improvement</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="bg-slate-800 rounded-2xl p-12 text-center border border-slate-700">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Quizzes?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of educators who are already using QuizHub to create 
            engaging and effective learning experiences.
          </p>
          <button 
            onClick={handleGetStarted}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">Q</span>
              </div>
              <span className="text-xl font-bold text-white">QuizHub</span>
            </div>
            <p className="text-slate-400">
              AI-Powered Real-time Quiz Platform © 2025. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
