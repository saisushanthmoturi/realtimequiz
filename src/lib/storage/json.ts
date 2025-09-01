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
    // Wait for any existing operation on this file to complete
    const current: Promise<void> = this.locks.get(file) || Promise.resolve();
    
    let result: T;
    const newOperation: Promise<void> = current
      .then(async () => {
        result = await operation();
      })
      .catch((error) => {
        console.error(`Lock operation failed for ${file}:`, error);
        throw error;
      });
    
    this.locks.set(file, newOperation);
    
    try {
      await newOperation;
      return result!;
    } finally {
      // Clean up completed lock
      if (this.locks.get(file) === newOperation) {
        this.locks.delete(file);
      }
    }
  }

  private async atomicWrite(file: string, data: any): Promise<void> {
    const tempFile = `${file}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
    try {
      // Ensure directory exists
      const dir = path.dirname(file);
      await fs.mkdir(dir, { recursive: true });
      
      // Write to temp file first
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
      
      // Then rename (atomic operation)
      await fs.rename(tempFile, file);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      console.error(`Atomic write failed for ${file}:`, error);
      throw error;
    }
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
    const quizzes = await this.readJsonFile<any>('quizzes.json');
    const quiz = quizzes.find((q: any) => q.id === id);
    
    if (!quiz) {
      return null;
    }

    // Handle legacy quiz format that doesn't have questions embedded
    if (!quiz.questions || !Array.isArray(quiz.questions)) {
      try {
        // Try to load questions from separate questions.json file
        const questions = await this.readJsonFile<any>('questions.json');
        const quizQuestions = questions.filter((q: any) => q.quizId === id);
        
        if (quizQuestions.length > 0) {
          // Convert legacy question format to new format
          quiz.questions = quizQuestions.map((q: any) => ({
            id: q.id || `q-${Date.now()}-${Math.random()}`,
            topic: quiz.topic || 'General',
            mode: quiz.mode || 'same',
            type: 'mcq', // Legacy questions were mostly MCQ
            question: q.question,
            options: q.options ? q.options : undefined,
            answer: q.options && typeof q.correctAnswer === 'number' 
              ? q.options[q.correctAnswer] 
              : (q.answer || q.correctAnswer),
            difficulty: (q.difficulty as any) || 'medium',
            metadata: { legacy: true, explanation: q.explanation }
          }));
          
          console.log(`Loaded ${quiz.questions.length} legacy questions for quiz ${id}`);
        } else {
          console.warn(`No questions found for quiz ${id}`);
          quiz.questions = [];
        }
      } catch (error) {
        console.error(`Error loading questions for quiz ${id}:`, error);
        quiz.questions = [];
      }
    }

    // Ensure required fields exist with defaults
    return {
      id: quiz.id,
      topics: Array.isArray(quiz.topics) ? quiz.topics : [quiz.topic || 'General'],
      difficulty: quiz.difficulty || 'medium',
      mode: quiz.mode || 'same',
      numQuestions: quiz.numQuestions || quiz.questionCount || quiz.questions.length,
      questions: quiz.questions || [],
      createdAt: quiz.createdAt || new Date().toISOString(),
      status: quiz.status === 'active' ? 'launched' : (quiz.status || 'draft'),
      // Optional fields
      numSets: quiz.numSets,
      questionsPerSet: quiz.questionsPerSet,
      poolSize: quiz.questions ? quiz.questions.length : 0
    } as GeneratedQuiz;
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

  async getSessionByJoinCode(joinCode: string): Promise<Session | null> {
    const sessions = await this.readJsonFile<any>('quiz_sessions.json');
    return sessions.find((s: any) => {
      const code = s.joinCode || s.sessionCode;
      return code === joinCode.toUpperCase();
    }) || null;
  }

  async listActiveSessions(): Promise<Session[]> {
    const sessions = await this.readJsonFile<any>('quiz_sessions.json');
    return sessions.filter((s: any) => {
      // Handle both legacy and new format
      const isActive = s.status ? (s.status !== 'ended') : (s.isActive === true);
      return isActive;
    }).map((s: any) => ({
      sessionId: s.sessionId || s.id,
      quizId: s.quizId,
      teacherId: s.teacherId || 'unknown',
      joinCode: s.joinCode || s.sessionCode,
      status: s.status || (s.isActive ? 'running' : 'ended'),
      participants: s.participants || [],
      startedAt: s.startedAt || s.createdAt
    }));
  }

  async listAllSessions(): Promise<Session[]> {
    return this.readJsonFile<Session>('quiz_sessions.json');
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
