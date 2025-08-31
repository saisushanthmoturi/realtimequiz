import { NextRequest, NextResponse } from 'next/server';
import { ServerAuthService } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('Login request received');
    const { userId, password, userType } = await request.json();
    console.log('Login attempt:', { userId, userType, hasPassword: !!password });

    if (!userId || !userType) {
      console.log('Missing required fields');
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Different handling for teachers vs students
    let result;
    if (userType === 'teacher') {
      // Teachers always need a password
      if (!password) {
        console.log('Password required for teacher login');
        return NextResponse.json(
          { success: false, message: 'Password is required for teachers' },
          { status: 400 }
        );
      }
      console.log('Attempting teacher login with password');
      result = await ServerAuthService.login(userId, password, userType);
    } else {
      // Students can login without a password
      console.log('Attempting student simple login');
      result = await ServerAuthService.simpleLogin(userId, userType);
    }

    console.log('Login result:', { success: result.success, message: result.message });
    
    if (result.success) {
      const response = NextResponse.json(result);
      
      // Set httpOnly cookie for token if available
      if (result.token) {
        console.log('Setting auth cookie');
        response.cookies.set('auth-token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/'
        });
      }
      
      return response;
    } else {
      return NextResponse.json(result, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
