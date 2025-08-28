import { GeneratedQuiz, Session, Attempt } from '@/types/quiz';

export interface StorageAdapter {
  // Quiz operations
  getQuiz(id: string): Promise<GeneratedQuiz | null>;
  saveQuiz(q: GeneratedQuiz): Promise<void>;
  listQuizzes(): Promise<GeneratedQuiz[]>;
  updateQuizStatus(id: string, status: GeneratedQuiz["status"]): Promise<void>;

  // Session operations
  getSession(id: string): Promise<Session | null>;
  getSessionByJoinCode(joinCode: string): Promise<Session | null>;
  listActiveSessions(): Promise<Session[]>;
  saveSession(s: Session): Promise<void>;
  updateSession(s: Partial<Session> & { sessionId: string }): Promise<void>;

  // Attempt operations
  saveAttempt(a: Attempt): Promise<void>;
  getAttemptsByQuiz(quizId: string): Promise<Attempt[]>;
  getAttemptsByStudent(quizId: string, studentId: string): Promise<Attempt[]>;
}

// Re-export the current storage implementation
export { storage } from './storage/index';
