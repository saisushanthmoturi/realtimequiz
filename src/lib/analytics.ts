import { Attempt, GeneratedQuiz } from '@/types/quiz';

interface QuizStats {
  perQuestionAccuracy: Record<string, number>;
  avgScore: number;
  median: number;
  topicBreakdown: Record<string, { correct: number; total: number; percent: number }>;
}

export function computeQuizStats(quiz: GeneratedQuiz, attempts: Attempt[]): QuizStats {
  if (!attempts.length) {
    return {
      perQuestionAccuracy: {},
      avgScore: 0,
      median: 0,
      topicBreakdown: {}
    };
  }

  // Per-question accuracy
  const perQuestionAccuracy: Record<string, number> = {};
  quiz.questions.forEach(q => {
    const answers = attempts.flatMap(a => 
      a.answers.filter(ans => ans.questionId === q.id)
    );
    const correct = answers.filter(a => a.isCorrect).length;
    perQuestionAccuracy[q.id] = answers.length ? correct / answers.length : 0;
  });

  // Overall scores
  const scores = attempts.map(a => a.score).sort((a, b) => a - b);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = scores.length % 2 === 0
    ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
    : scores[Math.floor(scores.length / 2)];

  // Topic breakdown
  const topicBreakdown: Record<string, { correct: number; total: number; percent: number }> = {};
  quiz.questions.forEach(q => {
    if (!topicBreakdown[q.topic]) {
      topicBreakdown[q.topic] = { correct: 0, total: 0, percent: 0 };
    }

    const answers = attempts.flatMap(a => 
      a.answers.filter(ans => ans.questionId === q.id)
    );
    
    topicBreakdown[q.topic].correct += answers.filter(a => a.isCorrect).length;
    topicBreakdown[q.topic].total += answers.length;
  });

  // Calculate percentages
  Object.values(topicBreakdown).forEach(stats => {
    stats.percent = stats.total ? (stats.correct / stats.total) * 100 : 0;
  });

  return {
    perQuestionAccuracy,
    avgScore,
    median,
    topicBreakdown
  };
}

export function computeStudentStats(quiz: GeneratedQuiz, attempts: Attempt[]): {
  accuracy: number;
  timePerQuestion: number;
  topicPerformance: Record<string, number>;
} {
  if (!attempts.length) {
    return {
      accuracy: 0,
      timePerQuestion: 0,
      topicPerformance: {}
    };
  }

  // Get latest attempt
  const latest = attempts[attempts.length - 1];
  
  // Calculate average time per question
  const times = latest.answers
    .filter(a => a.latencyMs)
    .map(a => a.latencyMs as number);
  
  const timePerQuestion = times.length 
    ? times.reduce((a, b) => a + b, 0) / times.length 
    : 0;

  // Calculate topic performance
  const topicPerformance: Record<string, number> = {};
  quiz.questions.forEach(q => {
    if (!topicPerformance[q.topic]) {
      const topicAnswers = latest.answers.filter(a => {
        const question = quiz.questions.find(qq => qq.id === a.questionId);
        return question?.topic === q.topic;
      });
      
      const correct = topicAnswers.filter(a => a.isCorrect).length;
      topicPerformance[q.topic] = topicAnswers.length 
        ? (correct / topicAnswers.length) * 100 
        : 0;
    }
  });

  return {
    accuracy: (latest.score / quiz.questions.length) * 100,
    timePerQuestion,
    topicPerformance
  };
}
