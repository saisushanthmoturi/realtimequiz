import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '@/models/User';
import { connectToDatabase } from './mongodb-server';

// In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'; 

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
    password?: string; // Password is only required for teachers
    email?: string;
  }): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    try {
      await connectToDatabase();

      // Check if user already exists
      const existingUser = await User.findOne({ userId: userData.userId });
      if (existingUser) {
        return { success: false, message: 'User already exists' };
      }

      // Create user - ensure password is only required for teachers
      const newUser: Partial<IUser> = {
        userId: userData.userId,
        name: userData.name,
        role: userData.userType,
        email: userData.email || `${userData.userId}@example.com` // Fallback email
      };

      // Set password based on user type
      if (userData.userType === 'teacher') {
        if (!userData.password) {
          return { success: false, message: 'Password is required for teachers' };
        }
        newUser.password = userData.password; // Will be hashed by pre-save hook
      } else {
        // For students, leave password empty - it will be auto-generated in pre-save hook
        newUser.password = ''; // This will be replaced with a secure random password
      }

      const createdUser = await User.create(newUser);

      const authUser: AuthUser = {
        id: createdUser._id?.toString() || '',
        userType: createdUser.role as 'teacher' | 'student',
        userId: createdUser.userId,
        name: createdUser.name
      };

      return { success: true, message: 'User registered successfully', user: authUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  // Login user with different logic for teachers vs students
  static async login(userId: string, password: string | undefined, userType: 'teacher' | 'student'): Promise<{
    success: boolean;
    message: string;
    user?: AuthUser;
    token?: string;
  }> {
    try {
      await connectToDatabase();

      // Find user
      const user = await User.findOne({ userId, role: userType });
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // For teachers, password is required and must be verified
      if (userType === 'teacher') {
        if (!password) {
          return { success: false, message: 'Password is required for teachers' };
        }
        
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
          return { success: false, message: 'Invalid password' };
        }
      }
      // For students, no password verification is needed - they can login with just their ID

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user._id?.toString() || user.id, 
          userId: user.userId, 
          userType: user.role as 'teacher' | 'student',
          name: user.name 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const authUser: AuthUser = {
        id: user._id?.toString() || '',
        userType: user.role as 'teacher' | 'student',
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
      console.error('Login error:', error);
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
        name: decoded.name || ''
      };
    } catch (error) {
      return null;
    }
  }

  // Simple login for students - auto-create account if it doesn't exist
  static async simpleLogin(userId: string, userType: 'teacher' | 'student'): Promise<{
    success: boolean;
    message: string;
    user?: AuthUser;
    token?: string;
  }> {
    try {
      await connectToDatabase();
      
      // Teachers should not use simple login
      if (userType === 'teacher') {
        return { 
          success: false, 
          message: 'Teachers must use password authentication' 
        };
      }

      // Find user or auto-create for students
      let user = await User.findOne({ userId, role: userType });
      
      if (!user && userType === 'student') {
        // Auto-create student account
        user = await User.create({
          userId,
          name: `Student ${userId}`,
          role: 'student',
          email: `${userId}@student.example.com`,
          password: '' // Empty password will be auto-generated in pre-save hook
        });
      }

      if (!user) {
        return { success: false, message: 'User not found and could not be created' };
      }

      // Generate token for consistency
      const token = jwt.sign(
        { 
          id: user._id?.toString() || user.id, 
          userId: user.userId, 
          userType: user.role as 'teacher' | 'student',
          name: user.name 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const authUser: AuthUser = {
        id: user._id?.toString() || '',
        userType: user.role as 'teacher' | 'student',
        userId: user.userId,
        name: user.name
      };

      return { success: true, message: 'Login successful', user: authUser, token };
    } catch (error) {
      console.error('Simple login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }
}
