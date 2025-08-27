export type Role = "teacher" | "student";
export type Difficulty = "easy" | "medium" | "hard";
export type Mode = "same" | "different";
export type QuestionType = "mcq" | "true_false" | "short_answer";

export interface QuizQuestion {
  id: string;
  topic: string;
  mode: Mode;
  type: QuestionType;
  question: string;
  options?: [string, string, string, string];
  answer: string;
  difficulty: Difficulty;
  metadata?: Record<string, any>;
}

export interface GeneratedQuiz {
  id: string;
  topics: string[];
  difficulty: Difficulty;
  mode: Mode;
  // For mode === 'same', total questions. For mode === 'different', questions per set.
  numQuestions: number;
  // When mode === 'different', these are populated
  numSets?: number;
  questionsPerSet?: number;
  // Derived helper: total generated pool size (questions.length)
  poolSize?: number;
  questions: QuizQuestion[];
  createdAt: string;
  status: "draft" | "launched" | "closed";
}

export interface StudentAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  answeredAt: string;
  latencyMs?: number;
}

export interface Attempt {
  attemptId: string;
  quizId: string;
  sessionId: string;
  studentId: string;
  answers: StudentAnswer[];
  score: number;
  percent: number;
  startedAt: string;
  submittedAt?: string;
}

export interface Session {
  sessionId: string;
  quizId: string;
  joinCode: string;
  teacherId: string;
  startedAt?: string;
  endsAt?: string;
  status: "idle" | "ready" | "running" | "paused" | "ended";
  participants: { studentId: string; name?: string }[];
}
