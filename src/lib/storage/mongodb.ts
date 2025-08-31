import { connectToDatabase } from '../mongodb-server';
import { Quiz, Question, IQuiz, IQuestion } from '../../models/Quiz';
import { Session, Attempt, ISession, IAttempt } from '../../models/Session';
import { User, IUser } from '../../models/User';
import { nanoid } from 'nanoid';

export class MongoDBStorageAdapter {
  
  // Quiz methods
  async getQuiz(quizId: string): Promise<any | null> {
    await connectToDatabase();
    return Quiz.findOne({ id: quizId }).populate('questions');
  }

  async saveQuiz(quiz: any): Promise<any> {
    await connectToDatabase();
    
    // Handle questions first
    const questionIds = [];
    for (const questionData of quiz.questions) {
      // Ensure question has an ID
      if (!questionData.id) {
        questionData.id = `question-${nanoid(8)}`;
      }
      
      // Upsert the question
      const question = await Question.findOneAndUpdate(
        { id: questionData.id },
        questionData,
        { upsert: true, new: true }
      );
      
      questionIds.push(question._id);
    }
    
    // Ensure quiz has an ID
    if (!quiz.id) {
      quiz.id = `quiz-${nanoid(8)}`;
    }
    
    // Create or update the quiz with references to questions
    const quizDoc = await Quiz.findOneAndUpdate(
      { id: quiz.id },
      { ...quiz, questions: questionIds },
      { upsert: true, new: true }
    );
    
    return quizDoc;
  }

  async getAllQuizzes(): Promise<any[]> {
    await connectToDatabase();
    return Quiz.find().sort({ createdAt: -1 });
  }

  async deleteQuiz(quizId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await Quiz.deleteOne({ id: quizId });
    return result.deletedCount > 0;
  }

  // Session methods
  async getSession(sessionId: string): Promise<any | null> {
    await connectToDatabase();
    return Session.findOne({ sessionId });
  }

  async saveSession(session: any): Promise<any> {
    await connectToDatabase();
    
    // Ensure session has an ID
    if (!session.sessionId) {
      session.sessionId = `session-${nanoid(8)}`;
    }
    
    // Create or update session
    const sessionDoc = await Session.findOneAndUpdate(
      { sessionId: session.sessionId },
      session,
      { upsert: true, new: true }
    );
    
    return sessionDoc;
  }

  async updateSession(sessionUpdate: any): Promise<any> {
    await connectToDatabase();
    return Session.findOneAndUpdate(
      { sessionId: sessionUpdate.sessionId },
      { $set: sessionUpdate },
      { new: true }
    );
  }

  async getAllSessions(): Promise<any[]> {
    await connectToDatabase();
    return Session.find().sort({ createdAt: -1 });
  }

  async getSessionByJoinCode(joinCode: string): Promise<any | null> {
    await connectToDatabase();
    return Session.findOne({ joinCode });
  }

  // Attempt methods
  async saveAttempt(attempt: any): Promise<any> {
    await connectToDatabase();
    
    // Ensure attempt has an ID
    if (!attempt.attemptId) {
      attempt.attemptId = `attempt-${nanoid(8)}`;
    }
    
    // Create or update attempt
    const attemptDoc = await Attempt.findOneAndUpdate(
      { attemptId: attempt.attemptId },
      attempt,
      { upsert: true, new: true }
    );
    
    return attemptDoc;
  }

  async getAttemptsBySession(sessionId: string): Promise<any[]> {
    await connectToDatabase();
    return Attempt.find({ sessionId }).sort({ submittedAt: -1 });
  }

  async getAttemptsByQuiz(quizId: string): Promise<any[]> {
    await connectToDatabase();
    return Attempt.find({ quizId }).sort({ submittedAt: -1 });
  }

  async getAttemptsByStudent(quizId: string, studentId: string): Promise<any[]> {
    await connectToDatabase();
    return Attempt.find({ quizId, studentId }).sort({ submittedAt: -1 });
  }

  // User methods
  async getUserById(userId: string): Promise<any | null> {
    await connectToDatabase();
    return User.findOne({ userId });
  }

  async getUserByEmail(email: string): Promise<any | null> {
    await connectToDatabase();
    return User.findOne({ email });
  }

  async createUser(userData: any): Promise<any> {
    await connectToDatabase();
    
    // Ensure user has an ID
    if (!userData.userId) {
      userData.userId = `user-${nanoid(8)}`;
    }
    
    const user = new User(userData);
    await user.save();
    return user;
  }

  async updateUser(userId: string, userData: any): Promise<any> {
    await connectToDatabase();
    return User.findOneAndUpdate(
      { userId },
      { $set: userData },
      { new: true }
    );
  }
}
