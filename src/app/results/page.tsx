'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

interface QuizResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpent: number;
  feedback: string;
  submittedAt: string;
  detailedResults: Array<{
    questionId: string;
    question: string;
    type: string;
    studentAnswer: string | number;
    correctAnswer: string;
    isCorrect: boolean;
    topic: string;
  }>;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [quizInfo, setQuizInfo] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Get results from sessionStorage
    const resultData = sessionStorage.getItem('lastQuizResult');
    const quizData = sessionStorage.getItem('currentQuiz');
    
    if (resultData) {
      const parsedResult = JSON.parse(resultData);
      setResult(parsedResult);
      
      if (quizData) {
        setQuizInfo(JSON.parse(quizData));
      }
      
      // Show celebration for good scores
      if (parsedResult.percentage >= 80) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      // Clear stored data after use
      sessionStorage.removeItem('lastQuizResult');
    } else {
      // Redirect to dashboard if no result
      router.push('/student');
    }
  }, [router]);

  const goToDashboard = () => {
    sessionStorage.removeItem('currentQuiz');
    sessionStorage.removeItem('quizStartTime');
    router.push('/student');
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-50 border-green-200';
    if (percentage >= 80) return 'bg-blue-50 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const correctAnswers = result.detailedResults.filter(r => r.isCorrect).length;
  const wrongAnswers = result.detailedResults.filter(r => !r.isCorrect).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Submitted Successfully! 🎉</h1>
          <p className="text-gray-600">
            {quizInfo && (
              <>Your results for "<span className="font-semibold">{quizInfo.title}</span>" are ready</>
            )}
          </p>
        </div>

        {/* Score Overview */}
        <div className={`bg-white rounded-xl shadow-lg border-2 ${getScoreBgColor(result.percentage)} mb-8 overflow-hidden`}>
          <div className="p-8">
            <div className="text-center mb-6">
              <div className={`text-6xl font-bold ${getScoreColor(result.percentage)} mb-2`}>
                {result.percentage}%
              </div>
              <div className="text-xl text-gray-700 mb-2">
                {result.score} out of {result.totalQuestions} correct
              </div>
              <div className="text-lg text-gray-600">
                {result.percentage >= 90 ? '🌟 Outstanding!' : 
                 result.percentage >= 80 ? '🎯 Excellent!' :
                 result.percentage >= 70 ? '👍 Good Job!' :
                 result.percentage >= 60 ? '📚 Keep Learning!' : '💪 Try Again!'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-green-600 mb-1">{correctAnswers}</div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-red-600 mb-1">{wrongAnswers}</div>
                <div className="text-sm text-gray-600">Incorrect Answers</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-blue-600 mb-1">{formatTime(result.timeSpent)}</div>
                <div className="text-sm text-gray-600">Time Taken</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Feedback */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-lg">
                🤖
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">AI-Powered Personalized Feedback</h3>
              <p className="text-purple-800 leading-relaxed">{result.feedback}</p>
            </div>
          </div>
        </div>

        {/* Detailed Question Results */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">
              Question Analysis
            </span>
            Detailed Review with Explanations
          </h3>

          <div className="space-y-6">
            {result.detailedResults.map((item, index) => (
              <div
                key={item.questionId}
                className={`border-l-4 pl-6 py-4 rounded-r-lg transition-all ${
                  item.isCorrect 
                    ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                    : 'border-red-500 bg-red-50 hover:bg-red-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                        Q{index + 1}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.type === 'mcq' ? 'bg-blue-100 text-blue-800' :
                        item.type === 'true_false' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {item.type === 'mcq' ? 'Multiple Choice' :
                         item.type === 'true_false' ? 'True/False' :
                         'Short Answer'}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        {item.topic}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      {item.question}
                    </h4>
                  </div>
                  <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
                    item.isCorrect 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
                    <p className={`text-sm font-semibold ${item.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {item.studentAnswer ? String(item.studentAnswer) : '❌ Not answered'}
                    </p>
                  </div>
                  {!item.isCorrect && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium text-gray-700 mb-1">Correct Answer:</p>
                      <p className="text-sm font-semibold text-green-600">
                        ✅ {item.correctAnswer}
                      </p>
                    </div>
                  )}
                </div>

                {/* Performance Indicator */}
                <div className={`rounded-lg p-3 ${
                  item.isCorrect ? 'bg-green-100 border border-green-200' : 'bg-orange-100 border border-orange-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <div className={`text-lg ${item.isCorrect ? 'text-green-600' : 'text-orange-600'}`}>
                      {item.isCorrect ? '🎯' : '�'}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.isCorrect ? 'text-green-900' : 'text-orange-900'}`}>
                        {item.isCorrect 
                          ? 'Great job! You got this one right.' 
                          : 'Review this topic for better understanding.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-8">
          <button
            onClick={goToDashboard}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            Back to Dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors flex items-center justify-center shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Results
          </button>
        </div>

        {/* Motivational Message */}
        {result.percentage < 80 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">💪</div>
            <h4 className="font-semibold text-yellow-900 mb-2">Keep Learning & Growing!</h4>
            <p className="text-yellow-800 text-sm">
              Every quiz is a step toward mastery. Review the explanations above and keep practicing!
            </p>
          </div>
        )}

        {result.percentage >= 90 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h4 className="font-semibold text-green-900 mb-2">Outstanding Performance!</h4>
            <p className="text-green-800 text-sm">
              Excellent work! You've demonstrated strong understanding of the material.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
