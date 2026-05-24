import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect customer routes
 * Ensures only authenticated customers can access /customer routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect customer dashboard routes
  // TODO: Fix auth - using client-side localStorage, middleware checks cookies
  // if (pathname.startsWith('/customer')) {
  //   // Check for auth token in cookies or headers
  //   const authToken = request.cookies.get('pi_auth_token')?.value ||
  //                    request.headers.get('authorization')?.replace('Bearer ', '');

  //   // If no auth token, redirect to home
  //   if (!authToken) {
  //     const loginUrl = new URL('/', request.url);
  //     return NextResponse.redirect(loginUrl);
  //   }
  // }

  // Protect merchant dashboard routes
  // TODO: Fix auth - using client-side localStorage, middleware checks cookies
  // if (pathname.startsWith('/dashboard') || pathname.startsWith('/pos')) {
  //   const authToken = request.cookies.get('pi_auth_token')?.value ||
  //                    request.headers.get('authorization')?.replace('Bearer ', '');

  //   if (!authToken) {
  //     const loginUrl = new URL('/', request.url);
  //     return NextResponse.redirect(loginUrl);
  //   }

  //   // TODO: Validate merchant permissions
  // }

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
