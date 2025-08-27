import { promises as fs } from 'fs';
import path from 'path';
import { StorageAdapter } from '../storage';
import { GeneratedQuiz, Session, Attempt } from '@/types/quiz';

export class JsonStorageAdapter implements StorageAdapter {
  private dataDir: string;
  private locks: Map<string, Promise<void>> = new Map();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  private async withLock<T>(file: string, operation: () => Promise<T>): Promise<T> {
    const current: Promise<void> = this.locks.get(file) || Promise.resolve();
    const newOperation: Promise<void> = current
      .then(() => operation())
      .then(() => undefined)
      .catch(() => undefined);
    this.locks.set(file, newOperation);
    // Execute and return the actual operation result separately
    return operation();
  }

  private async atomicWrite(file: string, data: any): Promise<void> {
    const tempFile = `${file}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
    await fs.rename(tempFile, file);
  }

  private async readJsonFile<T>(filename: string): Promise<T[]> {
    try {
      const content = await fs.readFile(path.join(this.dataDir, filename), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  // Quiz operations
  async getQuiz(id: string): Promise<GeneratedQuiz | null> {
    const quizzes = await this.readJsonFile<GeneratedQuiz>('quizzes.json');
    return quizzes.find(q => q.id === id) || null;
  }

  async saveQuiz(quiz: GeneratedQuiz): Promise<void> {
    return this.withLock('quizzes.json', async () => {
      const quizzes = await this.readJsonFile<GeneratedQuiz>('quizzes.json');
      const index = quizzes.findIndex(q => q.id === quiz.id);
      if (index >= 0) {
        quizzes[index] = quiz;
      } else {
        quizzes.push(quiz);
      }
      await this.atomicWrite(path.join(this.dataDir, 'quizzes.json'), quizzes);
    });
  }

  async listQuizzes(): Promise<GeneratedQuiz[]> {
    return this.readJsonFile<GeneratedQuiz>('quizzes.json');
  }

  async updateQuizStatus(id: string, status: GeneratedQuiz["status"]): Promise<void> {
    return this.withLock('quizzes.json', async () => {
      const quizzes = await this.readJsonFile<GeneratedQuiz>('quizzes.json');
      const quiz = quizzes.find(q => q.id === id);
      if (quiz) {
        quiz.status = status;
        await this.atomicWrite(path.join(this.dataDir, 'quizzes.json'), quizzes);
      }
    });
  }

  // Session operations
  async getSession(id: string): Promise<Session | null> {
    const sessions = await this.readJsonFile<Session>('quiz_sessions.json');
    return sessions.find(s => s.sessionId === id) || null;
  }

  async saveSession(session: Session): Promise<void> {
    return this.withLock('quiz_sessions.json', async () => {
      const sessions = await this.readJsonFile<Session>('quiz_sessions.json');
      const index = sessions.findIndex(s => s.sessionId === session.sessionId);
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      await this.atomicWrite(path.join(this.dataDir, 'quiz_sessions.json'), sessions);
    });
  }

  async updateSession(update: Partial<Session> & { sessionId: string }): Promise<void> {
    return this.withLock('quiz_sessions.json', async () => {
      const sessions = await this.readJsonFile<Session>('quiz_sessions.json');
      const index = sessions.findIndex(s => s.sessionId === update.sessionId);
      if (index >= 0) {
        sessions[index] = { ...sessions[index], ...update };
        await this.atomicWrite(path.join(this.dataDir, 'quiz_sessions.json'), sessions);
      }
    });
  }

  // Attempt operations
  async saveAttempt(attempt: Attempt): Promise<void> {
    return this.withLock('quiz_attempts.json', async () => {
      const attempts = await this.readJsonFile<Attempt>('quiz_attempts.json');
      const index = attempts.findIndex(a => a.attemptId === attempt.attemptId);
      if (index >= 0) {
        attempts[index] = attempt;
      } else {
        attempts.push(attempt);
      }
      await this.atomicWrite(path.join(this.dataDir, 'quiz_attempts.json'), attempts);
    });
  }

  async getAttemptsByQuiz(quizId: string): Promise<Attempt[]> {
    const attempts = await this.readJsonFile<Attempt>('quiz_attempts.json');
    return attempts.filter(a => a.quizId === quizId);
  }

  async getAttemptsByStudent(quizId: string, studentId: string): Promise<Attempt[]> {
    const attempts = await this.readJsonFile<Attempt>('quiz_attempts.json');
    return attempts.filter(a => a.quizId === quizId && a.studentId === studentId);
  }
}
