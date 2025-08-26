'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpent: number;
  feedback: string;
  detailedResults: Array<{
    questionId: string;
    question: string;
    selectedAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
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

  const retakeQuiz = () => {
    sessionStorage.removeItem('quizStartTime');
    router.push(`/quiz?sessionCode=${searchParams.get('sessionCode')}`);
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
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Submitted Successfully!</h1>
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
              <div className="text-xl text-gray-700">
                {result.score} out of {result.totalQuestions} correct
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-red-600">{wrongAnswers}</div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatTime(result.timeSpent)}</div>
                <div className="text-sm text-gray-600">Time Taken</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Feedback */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                🤖
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">AI-Powered Feedback</h3>
              <p className="text-purple-800 leading-relaxed">{result.feedback}</p>
            </div>
          </div>
        </div>

        {/* Detailed Question Results */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm mr-3">
              Detailed Review
            </span>
            Question by Question Analysis
          </h3>

          <div className="space-y-6">
            {result.detailedResults.map((item, index) => (
              <div
                key={item.questionId}
                className={`border-l-4 pl-6 py-4 rounded-r-lg ${
                  item.isCorrect 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex-1 pr-4">
                    <span className="text-gray-500 mr-2">Q{index + 1}:</span>
                    {item.question}
                  </h4>
                  <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
                    item.isCorrect 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                    <p className={`text-sm ${item.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {item.selectedAnswer !== -1 
                        ? `${String.fromCharCode(65 + item.selectedAnswer)} - Option ${item.selectedAnswer + 1}` 
                        : 'Not answered'
                      }
                    </p>
                  </div>
                  {!item.isCorrect && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Correct Answer:</p>
                      <p className="text-sm text-green-600">
                        {String.fromCharCode(65 + item.correctAnswer)} - Option {item.correctAnswer + 1}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-500">💡</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Explanation:</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={goToDashboard}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5zM16 17v2M8 17v2" />
            </svg>
            Back to Dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Results
          </button>
        </div>

        {/* Study Tips */}
        {result.percentage < 80 && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h4 className="font-semibold text-yellow-900 mb-2">💪 Keep Learning!</h4>
            <p className="text-yellow-800 text-sm">
              Don't worry about the score - every quiz is a learning opportunity! 
              Review the explanations above and try taking another quiz to improve your understanding.
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
        </div>
      </div>
    );
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 90) return '🌟 Excellent!';
    if (percentage >= 75) return '👍 Great Job!';
    if (percentage >= 60) return '👌 Good Work!';
    if (percentage >= 40) return '📚 Keep Practicing!';
    return '💪 Try Again!';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
          <button
            onClick={goToDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Score Summary */}
        <div className="bg-white rounded-lg shadow p-8 mb-8 text-center">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">
              <span className={getScoreColor(result.percentage)}>
                {result.score}/{result.totalQuestions}
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              {getScoreBadge(result.percentage)}
            </p>
            <p className={`text-lg font-semibold ${getScoreColor(result.percentage)}`}>
              {result.percentage}% Score
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-blue-600 font-medium">Correct Answers</p>
              <p className="text-2xl font-bold text-blue-600">{result.score}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 font-medium">Time Spent</p>
              <p className="text-2xl font-bold text-gray-600">
                {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-green-600 font-medium">Accuracy</p>
              <p className="text-2xl font-bold text-green-600">{result.percentage}%</p>
            </div>
          </div>
        </div>

        {/* AI Feedback */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Personalized Feedback</h3>
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-gray-700 font-sans text-sm leading-relaxed">
              {result.feedback}
            </pre>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">🔍 Detailed Review</h3>
            <p className="text-gray-600 mt-1">Review each question with explanations</p>
          </div>
          
          <div className="divide-y">
            {result.detailedResults.map((item, index) => (
              <div key={item.questionId} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="font-medium text-gray-900 flex-1 pr-4">
                    {item.question}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    item.isCorrect 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Your Answer: </span>
                    <span className={item.isCorrect ? 'text-green-600' : 'text-red-600'}>
                      {item.selectedAnswer !== -1 
                        ? `${String.fromCharCode(65 + item.selectedAnswer)}` 
                        : 'Not answered'
                      }
                    </span>
                  </p>
                  {!item.isCorrect && (
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">Correct Answer: </span>
                      <span className="text-green-600">
                        {String.fromCharCode(65 + item.correctAnswer)}
                      </span>
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm font-medium text-blue-900 mb-1">💡 Explanation:</p>
                  <p className="text-sm text-blue-800">{item.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={goToDashboard}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Take Another Quiz
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Print Results
          </button>
        </div>
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
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
