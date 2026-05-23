import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect customer routes
 * Ensures only authenticated customers can access /customer routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect customer dashboard routes
  if (pathname.startsWith('/customer')) {
    // Check for auth token in cookies or headers
    const authToken = request.cookies.get('pi_auth_token')?.value ||
                     request.headers.get('authorization')?.replace('Bearer ', '');

    // If no auth token, redirect to home
    if (!authToken) {
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // TODO: Validate token with database/API
    // For now, just check existence - this is a basic check
    // In production, you would:
    // 1. Decode the JWT token
    // 2. Validate it against your database
    // 3. Check user's role/permissions
    // 4. Add user info to request headers for downstream use
  }

  // Protect merchant dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/pos')) {
    const authToken = request.cookies.get('pi_auth_token')?.value ||
                     request.headers.get('authorization')?.replace('Bearer ', '');

    if (!authToken) {
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // TODO: Validate merchant permissions
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    '/customer/:path*',
    '/dashboard/:path*',
    '/pos/:path*',
  ],
};
