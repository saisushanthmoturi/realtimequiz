// Simple database models and utilities
export interface User {
  id: string;
  userType: 'teacher' | 'student';
  userId: string; // Faculty ID or Roll Number
  name: string;
  email?: string;
  password: string; // hashed
  createdAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  topic: string;
  description?: string;
  questionCount: number;
  type: 'live' | 'slip';
  status: 'draft' | 'active' | 'completed';
  createdBy: string; // teacher ID
  sessionCode?: string;
  createdAt: string;
  timeLimit: number; // in minutes
}

export interface Question {
  id: string;
  quizId: string;
  studentId?: string; // for unique questions per student
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  completedAt: string;
  feedback: string;
}

export interface QuizSession {
  id: string;
  quizId: string;
  sessionCode: string;
  isActive: boolean;
  participants: string[]; // student IDs
  createdAt: string;
}

// Simple database operations using localStorage for client-side and file system for server-side
import fs from 'fs';
import path from 'path';

export class SimpleDB {
  private static getDataDir(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
  }

  private static getFilePath(key: string): string {
    return path.join(this.getDataDir(), `${key}.json`);
  }

  static get<T>(key: string): T[] {
    if (typeof window !== 'undefined') {
      // Client-side: use localStorage
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } else {
      // Server-side: use file system
      try {
        const filePath = this.getFilePath(key);
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf8');
          return JSON.parse(data);
        }
        return [];
      } catch (error) {
        console.error(`Error reading ${key}:`, error);
        return [];
      }
    }
  }

  static set<T>(key: string, data: T[]): void {
    if (typeof window !== 'undefined') {
      // Client-side: use localStorage
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      // Server-side: use file system
      try {
        const filePath = this.getFilePath(key);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      } catch (error) {
        console.error(`Error writing ${key}:`, error);
      }
    }
  }

  static add<T extends { id: string }>(key: string, item: T): void {
    const items = this.get<T>(key);
    items.push(item);
    this.set(key, items);
  }

  static update<T extends { id: string }>(key: string, id: string, updates: Partial<Omit<T, 'id'>>): void {
    const items = this.get<T>(key);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      this.set(key, items);
    }
  }

  static delete<T extends { id: string }>(key: string, id: string): void {
    const items = this.get<T>(key);
    const filtered = items.filter(item => item.id !== id);
    this.set(key, filtered);
  }

  static find<T extends { id: string }>(key: string, id: string): T | undefined {
    const items = this.get<T>(key);
    return items.find(item => item.id === id);
  }

  static findBy<T>(key: string, field: keyof T, value: any): T | undefined {
    const items = this.get<T>(key);
    return items.find(item => item[field] === value);
  }
}

// Database keys
export const DB_KEYS = {
  USERS: 'users',
  QUIZZES: 'quizzes',
  QUESTIONS: 'questions',
  ATTEMPTS: 'quiz_attempts',
  SESSIONS: 'quiz_sessions'
} as const;
