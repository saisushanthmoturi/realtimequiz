'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Timer from '@/components/Timer';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
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
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCode, setSessionCode] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const loadQuiz = async (sessionCode: string | null, quizId: string | null) => {
    try {
      // First check if we have quiz data stored from the join process
      const storedQuizData = sessionStorage.getItem('currentQuiz');
      if (storedQuizData) {
        const quizData = JSON.parse(storedQuizData);
        setQuizData(quizData);
        setIsLoading(false);
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

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (isSubmitting) return;
    
    const unansweredQuestions = quizData?.questions.filter(q => answers[q.id] === undefined) || [];
    
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

      // Convert answers object to array format expected by API
      const answersArray = quizData?.questions.map(q => answers[q.id] ?? -1) || [];
      
      // Calculate time spent (you might want to track this more precisely)
      const timeSpent = Math.floor((Date.now() - (sessionStorage.getItem('quizStartTime') ? parseInt(sessionStorage.getItem('quizStartTime')!) : Date.now())) / 1000);
      
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quizData?.id,
          studentId: studentId,
          answers: answersArray,
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
        alert('Failed to submit quiz: ' + (data.message || 'Unknown error'));
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      alert('Failed to submit quiz');
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    alert('Time\'s up! Your quiz will be auto-submitted.');
    handleSubmit(true);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">Quiz not found</p>
          <button
            onClick={() => router.push('/student')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = quizData.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quizData.title}</h1>
              <p className="text-sm text-gray-600">{quizData.topic}</p>
            </div>
            
            <Timer
              duration={quizData.timeLimit}
              onTimeUp={handleTimeUp}
              className="flex-shrink-0"
            />
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Question {currentQuestion + 1} of {quizData.questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-32">
              <h3 className="font-semibold text-gray-900 mb-4">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
                {quizData.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`w-8 h-8 rounded text-xs font-medium ${
                      index === currentQuestion
                        ? 'bg-blue-600 text-white'
                        : answers[quizData.questions[index].id] !== undefined
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                  <span>Not answered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {currentQ.question}
                </h2>
                
                <div className="space-y-3">
                  {currentQ.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        answers[currentQ.id] === index
                          ? 'bg-blue-50 border-blue-300'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={index}
                        checked={answers[currentQ.id] === index}
                        onChange={() => handleAnswerSelect(currentQ.id, index)}
                        className="mr-3"
                      />
                      <span className="flex-1">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <button
                  onClick={previousQuestion}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <div className="flex space-x-3">
                  {currentQuestion === quizData.questions.length - 1 ? (
                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                  ) : (
                    <button
                      onClick={nextQuestion}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
