import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-api';

export async function GET(request: NextRequest) {
  try {
    // Test authentication
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        user: null
      });
    }

    // Return user info to test if auth is working
    return NextResponse.json({
      success: true,
      message: 'Authentication working',
      user: {
        id: user.id,
        username: user.username
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
