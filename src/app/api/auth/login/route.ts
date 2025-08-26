import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, password, userType } = await request.json();

    if (!userId || !userType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For demo purposes, use simple login if no password provided
    let result;
    if (!password) {
      result = await AuthService.simpleLogin(userId, userType);
    } else {
      result = await AuthService.login(userId, password, userType);
    }

    if (result.success) {
      const response = NextResponse.json(result);
      
      // Set httpOnly cookie for token if available
      if (result.token) {
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
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
