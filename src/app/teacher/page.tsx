'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Quiz {
  id: string;
  title: string;
  topic: string;
  description?: string;
  questionCount: number;
  type: 'live' | 'slip';
  status: 'draft' | 'active' | 'completed';
  sessionCode?: string;
  createdAt: string;
  timeLimit: number;
}

export default function TeacherDashboard() {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is a teacher
    const userType = sessionStorage.getItem('userType');
    const storedUserId = sessionStorage.getItem('userId');
    const storedUserName = sessionStorage.getItem('userName');
    
    if (userType !== 'teacher' || !storedUserId) {
      router.push('/');
      return;
    }
    
    setUserId(storedUserId);
    setUserName(storedUserName || storedUserId);
    loadQuizzes(storedUserId);
  }, [router]);

  const loadQuizzes = async (teacherId: string) => {
    try {
      const response = await fetch(`/api/quiz?createdBy=${teacherId}`);
      const data = await response.json();
      
      if (data.success) {
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Total Quizzes</h3>
            <p className="text-3xl font-bold text-blue-600">{quizzes.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Active Quizzes</h3>
            <p className="text-3xl font-bold text-green-600">
              {quizzes.filter(q => q.status === 'active').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
            <p className="text-3xl font-bold text-gray-600">
              {quizzes.filter(q => q.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create New Quiz
          </button>
        </div>

        {/* Quiz Creation Form */}
        {showCreateForm && (
          <CreateQuizForm 
            onClose={() => setShowCreateForm(false)}
            onSave={() => loadQuizzes(userId)}
            userId={userId}
          />
        )}

        {/* Quizzes List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Your Quizzes</h2>
          </div>
          <div className="divide-y">
            {quizzes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No quizzes created yet. Create your first quiz!
              </div>
            ) : (
              quizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} onUpdate={() => loadQuizzes(userId)} />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface CreateQuizFormProps {
  onClose: () => void;
  onSave: () => void;
  userId: string;
}

function CreateQuizForm({ onClose, onSave, userId }: CreateQuizFormProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [quizType, setQuizType] = useState<'live' | 'slip'>('live');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !topic.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          topic: topic.trim(),
          questionCount: questionCount,
          type: quizType,
          timeLimit: questionCount * 2, // 2 minutes per question
          createdBy: userId,
          description: `${title.trim()} - ${topic.trim()}`
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        onSave();
        onClose();
        
        // Reset form
        setTitle('');
        setTopic('');
        setQuestionCount(10);
        setQuizType('live');
      } else {
        alert('Failed to create quiz: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to create quiz:', error);
      alert('Failed to create quiz. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Create New Quiz</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quiz Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Mathematics Quiz 1"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Calculus, Programming, Biology"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Questions
            </label>
            <input
              type="number"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
              min="5"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quiz Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="quizType"
                  value="live"
                  checked={quizType === 'live'}
                  onChange={(e) => setQuizType(e.target.value as 'live')}
                  className="mr-2"
                />
                Live Quiz (Real-time with leaderboard)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="quizType"
                  value="slip"
                  checked={quizType === 'slip'}
                  onChange={(e) => setQuizType(e.target.value as 'slip')}
                  className="mr-2"
                />
                Slip Test (Private assessment)
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Quiz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface QuizCardProps {
  quiz: Quiz;
  onUpdate: () => void;
}

function QuizCard({ quiz, onUpdate }: QuizCardProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [sessionCode, setSessionCode] = useState<string>('');

  useEffect(() => {
    // Check if quiz already has a session code
    const existingCode = localStorage.getItem(`quiz-session-${quiz.id}`);
    if (existingCode) {
      setSessionCode(existingCode);
    }
  }, [quiz.id]);

  const startQuiz = async () => {
    setIsStarting(true);
    try {
      const response = await fetch(`/api/quiz/${quiz.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessionCode(data.sessionCode);
        onUpdate(); // Refresh the quiz list
      } else {
        alert('Failed to start quiz: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to start quiz:', error);
      alert('Failed to start quiz');
    } finally {
      setIsStarting(false);
    }
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionCode);
    alert('Session code copied to clipboard!');
  };

  const stopQuiz = async () => {
    if (confirm('Are you sure you want to stop this quiz?')) {
      try {
        // Update quiz status to completed
        const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        const updatedQuizzes = quizzes.map((q: Quiz) => 
          q.id === quiz.id ? { ...q, status: 'completed' } : q
        );
        localStorage.setItem('quizzes', JSON.stringify(updatedQuizzes));
        onUpdate();
      } catch (error) {
        console.error('Failed to stop quiz:', error);
      }
    }
  };

  const deleteQuiz = () => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
      const updatedQuizzes = quizzes.filter((q: Quiz) => q.id !== quiz.id);
      localStorage.setItem('quizzes', JSON.stringify(updatedQuizzes));
      localStorage.removeItem(`quiz-session-${quiz.id}`);
      onUpdate();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
          <p className="text-gray-600">Topic: {quiz.topic}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
            <span>{quiz.questionCount} questions</span>
            <span>•</span>
            <span>{quiz.timeLimit} minutes</span>
            <span>•</span>
            <span>{quiz.type === 'live' ? 'Live Quiz' : 'Slip Test'}</span>
          </div>
          
          {/* Session Code Display */}
          {sessionCode && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Session Code:</p>
                  <p className="text-xl font-bold text-blue-700 font-mono">{sessionCode}</p>
                </div>
                <button
                  onClick={copySessionCode}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Copy Code
                </button>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            Created: {new Date(quiz.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-2 py-1 text-xs rounded ${
            quiz.status === 'active' ? 'bg-green-100 text-green-800' :
            quiz.status === 'completed' ? 'bg-gray-100 text-gray-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {quiz.status}
          </span>
          
          <div className="flex space-x-2">
            {quiz.status === 'draft' && (
              <button
                onClick={startQuiz}
                disabled={isStarting}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isStarting ? 'Starting...' : 'Start Quiz'}
              </button>
            )}
            
            {quiz.status === 'active' && (
              <button
                onClick={stopQuiz}
                className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Stop Quiz
              </button>
            )}
            
            <button
              onClick={deleteQuiz}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
