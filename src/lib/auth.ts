import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SimpleDB, User, DB_KEYS } from './database';

const JWT_SECRET = 'your-secret-key-here'; // In production, use environment variable

export interface AuthUser {
  id: string;
  userType: 'teacher' | 'student';
  userId: string;
  name: string;
}

export class AuthService {
  // Register a new user
  static async register(userData: {
    userType: 'teacher' | 'student';
    userId: string;
    name: string;
    password: string;
    email?: string;
  }): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    try {
      // Check if user already exists
      const existingUser = SimpleDB.findBy<User>(DB_KEYS.USERS, 'userId', userData.userId);
      if (existingUser) {
        return { success: false, message: 'User already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const newUser: User = {
        id: Date.now().toString(),
        userType: userData.userType,
        userId: userData.userId,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };

      SimpleDB.add(DB_KEYS.USERS, newUser);

      const authUser: AuthUser = {
        id: newUser.id,
        userType: newUser.userType,
        userId: newUser.userId,
        name: newUser.name
      };

      return { success: true, message: 'User registered successfully', user: authUser };
    } catch (error) {
      return { success: false, message: 'Registration failed' };
    }
  }

  // Login user
  static async login(userId: string, password: string, userType: 'teacher' | 'student'): Promise<{
    success: boolean;
    message: string;
    user?: AuthUser;
    token?: string;
  }> {
    try {
      // Find user
      const user = SimpleDB.findBy<User>(DB_KEYS.USERS, 'userId', userId);
      if (!user || user.userType !== userType) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, userId: user.userId, userType: user.userType },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const authUser: AuthUser = {
        id: user.id,
        userType: user.userType,
        userId: user.userId,
        name: user.name
      };

      return {
        success: true,
        message: 'Login successful',
        user: authUser,
        token
      };
    } catch (error) {
      return { success: false, message: 'Login failed' };
    }
  }

  // Verify JWT token
  static verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        id: decoded.id,
        userType: decoded.userType,
        userId: decoded.userId,
        name: decoded.name
      };
    } catch (error) {
      return null;
    }
  }

  // Simple verification for students (only allows existing registered students)
  static async simpleLogin(userId: string, userType: 'teacher' | 'student'): Promise<{
    success: boolean;
    message: string;
    user?: AuthUser;
    token?: string;
  }> {
    // Check if user exists - DO NOT auto-create
    const user = SimpleDB.findBy<User>(DB_KEYS.USERS, 'userId', userId);
    
    if (!user) {
      return { success: false, message: 'Student not found. Please register first.' };
    }

    if (user.userType !== userType) {
      return { success: false, message: 'Invalid user type' };
    }

    const authUser: AuthUser = {
      id: user.id,
      userType: user.userType,
      userId: user.userId,
      name: user.name
    };

    // Generate token for consistency
    const token = jwt.sign(
      { id: user.id, userId: user.userId, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { success: true, message: 'Login successful', user: authUser, token };
  }
}
