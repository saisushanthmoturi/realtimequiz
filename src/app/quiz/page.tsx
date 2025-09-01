'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Timer from '@/components/Timer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useQuizSocket } from '@/hooks/useQuizSocket';

interface Question {
  id: string;
  topic: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  difficulty: string;
}

interface QuizData {
  id: string;
  title: string;
  topic: string;
  timeLimit: number;
  questions: Question[];
}

export default function TakeQuiz() {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string | number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCode, setSessionCode] = useState('');
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Use the quiz socket for real-time timer synchronization
  const { timerSeconds, sessionStatus, joinSession, submitAnswer } = useQuizSocket();

  useEffect(() => {
    const code = searchParams.get('sessionCode');
    const quizId = searchParams.get('quizId');
    
    if (!code && !quizId) {
      alert('Invalid quiz access');
      router.push('/student');
      return;
    }

    setSessionCode(code || '');
    loadQuiz(code, quizId);
  }, [searchParams, router]);

  // Handle timer expiration from socket
  useEffect(() => {
    if ((timerSeconds === 0 || sessionStatus === 'ended') && !showTimeUpModal) {
      setShowTimeUpModal(true);
      // Auto-submit after a short delay to allow user to see the modal
      setTimeout(() => {
        handleSubmit(true);
      }, 3000);
    }
  }, [timerSeconds, sessionStatus, showTimeUpModal]);

  // Enhanced logging for debugging
  useEffect(() => {
    console.log('Quiz Socket State:', {
      timerSeconds,
      sessionStatus,
      connected: !!sessionStorage.getItem('currentSessionId'),
      timestamp: new Date().toISOString()
    });
    
    // Additional debugging for socket connection
    if (typeof window !== 'undefined') {
      console.log('Quiz page socket debugging:', {
        hasSocket: !!(window as any).io,
        sessionStorage: {
          currentSessionId: sessionStorage.getItem('currentSessionId'),
          userId: sessionStorage.getItem('userId'),
          userName: sessionStorage.getItem('userName')
        }
      });
    }
  }, [timerSeconds, sessionStatus]);

  const loadQuiz = async (sessionCode: string | null, quizId: string | null) => {
    try {
      // First check if we have quiz data stored from the join process
      const storedQuizData = sessionStorage.getItem('currentQuiz');
      if (storedQuizData) {
        const quizData = JSON.parse(storedQuizData);
        setQuizData(quizData);
        setIsLoading(false);
        
        // Connect to socket for real-time updates
        const studentId = sessionStorage.getItem('userId');
        const studentName = sessionStorage.getItem('userName') || `Student ${studentId}`;
        const currentSessionId = sessionStorage.getItem('currentSessionId');
        
        if (studentId && currentSessionId) {
          joinSession(currentSessionId, studentId, studentName);
        }
        
        // Set quiz start time if not already set
        if (!sessionStorage.getItem('quizStartTime')) {
          sessionStorage.setItem('quizStartTime', Date.now().toString());
        }
        return;
      }

      // Fallback to API call if no stored data
      let response;
      if (sessionCode) {
        const studentId = sessionStorage.getItem('userId');
        if (!studentId) {
          alert('Student ID not found. Please login again.');
          router.push('/');
          return;
        }
        
        response = await fetch('/api/quiz/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionCode, studentId })
        });
      } else if (quizId) {
        response = await fetch(`/api/quiz/${quizId}`);
      }

      if (!response) {
        throw new Error('No valid quiz access method');
      }

      const data = await response.json();
      
      if (data.success) {
        setQuizData(data.quiz);
        // Store the quiz data for future use
        sessionStorage.setItem('currentQuiz', JSON.stringify(data.quiz));
        // Set quiz start time
        sessionStorage.setItem('quizStartTime', Date.now().toString());
      } else {
        alert('Quiz not found or not available: ' + (data.message || ''));
        router.push('/student');
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
      alert('Failed to load quiz');
      router.push('/student');
    } finally {
      setIsLoading(false);
    }
  };

  const isQuestionAnswered = (questionId: string, question: Question): boolean => {
    const answer = answers[questionId];
    if (answer === undefined || answer === null) return false;
    
    // For short answer questions, check if there's non-empty text
    if (question.type === 'short_answer') {
      return typeof answer === 'string' && answer.trim().length > 0;
    }
    
    // For MCQ and true_false, any non-undefined answer is valid
    return true;
  };

  const getAnsweredCount = (): number => {
    return quizData?.questions.filter(q => isQuestionAnswered(q.id, q)).length || 0;
  };

  const handleAnswerSelect = (questionId: string, answer: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleTextAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (isSubmitting) return;
    
    const unansweredQuestions = quizData?.questions.filter(q => !isQuestionAnswered(q.id, q)) || [];
    
    if (!isAutoSubmit && unansweredQuestions.length > 0) {
      const confirmSubmit = confirm(
        `You have ${unansweredQuestions.length} unanswered questions. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    
    try {
      const studentId = sessionStorage.getItem('userId');
      if (!studentId) {
        alert('Student ID not found. Please login again.');
        router.push('/');
        return;
      }

      // Get session information
      const currentSessionId = sessionStorage.getItem('currentSessionId');
      
      // Send answers as object with question IDs as keys (matches our new API)
      const timeSpent = Math.floor((Date.now() - (sessionStorage.getItem('quizStartTime') ? parseInt(sessionStorage.getItem('quizStartTime')!) : Date.now())) / 1000);
      
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quizData?.id,
          studentId: studentId,
          sessionId: currentSessionId,
          answers: answers, // Send the answers object directly
          timeSpent: timeSpent
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Store results for results page
        sessionStorage.setItem('lastQuizResult', JSON.stringify(data.result));
        // Redirect to results page
        router.push(`/results?quizId=${quizData?.id}&studentId=${studentId}`);
      } else {
        // Handle specific error cases
        if (response.status === 410) {
          // Session expired or ended
          setShowTimeUpModal(true);
          alert('Quiz session has ended. Your answers could not be submitted.');
        } else {
          alert('Failed to submit quiz: ' + (data.message || 'Unknown error'));
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      alert('Failed to submit quiz');
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    if (!showTimeUpModal) {
      setShowTimeUpModal(true);
      // Auto-submit after a short delay to allow user to see the modal
      setTimeout(() => {
        handleSubmit(true);
      }, 3000);
    }
  };

  const nextQuestion = () => {
    if (quizData && currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestion(index);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-slate-400 mt-4">Loading your quiz...</p>
        </div>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center rounded-xl border border-slate-700/60 bg-slate-800/80 p-8 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-xl text-red-400 mb-4">Quiz not found</p>
          <p className="text-slate-400 mb-6">The quiz you're looking for is not available or has been removed.</p>
          <button
            onClick={() => router.push('/student')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = quizData.questions[currentQuestion];
  const answeredCount = getAnsweredCount();
  const progress = (answeredCount / quizData.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.1),transparent_50%)]"></div>
      
      <div className="relative">
        {/* Header with Timer */}
        <header className="border-b border-slate-700/50 bg-slate-800/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-white">{quizData.title}</h1>
                <p className="text-slate-400">{quizData.topic}</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Time Remaining</p>
                  {timerSeconds !== null ? (
                    <div className="space-y-1">
                      <Timer
                        initialSeconds={timerSeconds}
                        onTimeUpAction={handleTimeUp}
                        className="flex-shrink-0"
                        showProgressBar={false}
                        isActive={sessionStatus === 'running'}
                      />
                    </div>
                  ) : (
                    <div className="font-mono text-2xl font-bold text-slate-400">
                      --:--
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Session Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      sessionStatus === 'running' ? 'bg-green-500 animate-pulse' :
                      sessionStatus === 'paused' ? 'bg-yellow-500' :
                      sessionStatus === 'ended' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className={`text-xs font-medium capitalize ${
                      sessionStatus === 'running' ? 'text-green-400' :
                      sessionStatus === 'paused' ? 'text-yellow-400' :
                      sessionStatus === 'ended' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {sessionStatus === 'unknown' ? 'Connecting...' : sessionStatus}
                    </span>
                  </div>
                </div>
                
                {/* Debug section */}
                <div className="text-right">
                  <p className="text-xs text-slate-400">Debug</p>
                  <button
                    onClick={() => {
                      const currentSessionId = sessionStorage.getItem('currentSessionId');
                      const userId = sessionStorage.getItem('userId');
                      console.log('🧪 Testing socket connection...', {
                        currentSessionId,
                        userId,
                        timerSeconds,
                        sessionStatus
                      });
                      
                      if (currentSessionId && userId) {
                        joinSession(currentSessionId, userId, `Test User ${userId}`);
                      }
                    }}
                    className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/50 hover:bg-purple-500/30"
                  >
                    🔌 Test Socket
                  </button>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Question {currentQuestion + 1} of {quizData.questions.length}</span>
                <span>{answeredCount}/{quizData.questions.length} Answered ({Math.round(progress)}%)</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Question Navigation Sidebar */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/80 p-6 shadow-2xl sticky top-32">
                <h3 className="font-semibold text-white mb-4">Questions</h3>
                <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
                  {quizData.questions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        index === currentQuestion
                          ? 'bg-blue-600 text-white shadow-lg'
                          : isQuestionAnswered(question.id, question)
                          ? 'bg-green-600/80 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 space-y-3 text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-lg"></div>
                    <span className="text-slate-400">Current</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-green-600/80 rounded-lg"></div>
                    <span className="text-slate-400">Answered</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-slate-700/50 border border-slate-600 rounded-lg"></div>
                    <span className="text-slate-400">Not answered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Content */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-800/80 p-8 shadow-2xl">
                <div className="mb-8">
                  <div className="flex items-start gap-4 mb-6">
                    <h2 className="text-xl font-semibold text-white flex-1 leading-relaxed">
                      {currentQ.question}
                    </h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                        currentQ.type === 'mcq' ? 'bg-blue-500/20 text-blue-300' :
                        currentQ.type === 'true_false' ? 'bg-green-500/20 text-green-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {currentQ.type === 'mcq' ? 'Multiple Choice' :
                         currentQ.type === 'true_false' ? 'True/False' :
                         'Short Answer'}
                      </span>
                      <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-700/50 text-slate-300 capitalize">
                        {currentQ.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* MCQ Questions */}
                    {currentQ.type === 'mcq' && currentQ.options && (
                      <div className="space-y-3">
                        {currentQ.options.map((option, index) => (
                          <label
                            key={index}
                            className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                              answers[currentQ.id] === index
                                ? 'bg-blue-500/20 border-blue-500/50 shadow-lg'
                                : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQ.id}`}
                              value={index}
                              checked={answers[currentQ.id] === index}
                              onChange={() => handleAnswerSelect(currentQ.id, index)}
                              className="mr-4 w-4 h-4 text-blue-600 bg-slate-700 border-slate-600"
                            />
                            <span className="flex-1 text-slate-200">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* True/False Questions */}
                    {currentQ.type === 'true_false' && (
                      <div className="space-y-3">
                        {['true', 'false'].map((option) => (
                          <label
                            key={option}
                            className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                              answers[currentQ.id] === option
                                ? 'bg-blue-500/20 border-blue-500/50 shadow-lg'
                                : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQ.id}`}
                              value={option}
                              checked={answers[currentQ.id] === option}
                              onChange={() => handleAnswerSelect(currentQ.id, option)}
                              className="mr-4 w-4 h-4 text-blue-600 bg-slate-700 border-slate-600"
                            />
                            <span className="flex-1 text-slate-200 capitalize">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Short Answer Questions */}
                    {currentQ.type === 'short_answer' && (
                      <div>
                        <textarea
                          value={answers[currentQ.id] as string || ''}
                          onChange={(e) => handleTextAnswerChange(currentQ.id, e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full p-4 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={4}
                        />
                        <p className="text-sm text-slate-400 mt-3">
                          Provide a clear, concise answer. Be specific and accurate.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-700/50">
                  <button
                    onClick={previousQuestion}
                    disabled={currentQuestion === 0}
                    className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>

                  <div className="flex space-x-3">
                    {currentQuestion === quizData.questions.length - 1 ? (
                      <button
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 transition-all shadow-lg"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Submit Quiz
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={nextQuestion}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Time Up Modal */}
      {showTimeUpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Time's Up!</h2>
              <p className="text-slate-400">
                The quiz time has ended. Your answers will be submitted automatically.
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <div className="text-sm text-slate-300">
                Auto-submitting in <span className="font-bold text-white">3 seconds...</span>
              </div>
            </div>
            
            <button
              onClick={() => handleSubmit(true)}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Submit Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
