import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('Registration request received');
    const { userId, name, password, email, userType } = await request.json();
    console.log('Parsed user data:', { userId, name, userType, hasPassword: !!password, hasEmail: !!email });

    if (!userId || !name || !userType) {
      console.log('Missing required fields');
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For students, generate a simple password if not provided
    const userPassword = password || (userType === 'student' ? 'student123' : '');
    
    // Enforce password requirement for teachers
    if (userType === 'teacher' && !userPassword) {
      console.log('Password required for teacher account');
      return NextResponse.json(
        { success: false, message: 'Password is required for teacher accounts' },
        { status: 400 }
      );
    }

    // Register the user
    console.log('Calling AuthService.register');
    const result = await AuthService.register({
      userType: userType as 'teacher' | 'student', 
      userId,
      name,
      password: userPassword,
      email
    });
    console.log('Registration result:', { success: result.success, message: result.message });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
