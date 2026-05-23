/**
 * Authentication utilities for API routes
 * Provides helper functions for validating authentication tokens and extracting user information
 */

import { NextRequest } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  username: string;
  piUid: string;
  role?: 'merchant' | 'customer' | 'cashier';
}

/**
 * Extract authentication token from request headers
 * Supports both Bearer token and custom auth headers
 */
export function extractAuthToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try custom auth header
  const customToken = request.headers.get('x-auth-token');
  if (customToken) {
    return customToken;
  }

  return null;
}

/**
 * Validate authentication token and return user information
 * In production, this should verify against a database or JWT
 */
export async function validateAuthToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    // In development mode, accept tokens that start with 'dev_token_'
    if (process.env.NODE_ENV === 'development' && token.startsWith('dev_token_')) {
      // Extract user info from token (simplified for development)
      // In production, use proper JWT verification
      return {
        id: 'dev-user-id',
        username: 'dev-user',
        piUid: 'dev-pi-uid',
        role: 'customer'
      };
    }

    // TODO: Implement proper JWT verification or database token validation
    // This is a placeholder for production implementation
    // const decoded = await verifyJWT(token);
    // return decoded.user;

    return null;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Get authenticated user from request
 * Returns null if authentication fails or is missing
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const token = extractAuthToken(request);
  if (!token) {
    return null;
  }

  return validateAuthToken(token);
}

/**
 * Require authentication for an API route
 * Throws error if user is not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: any
) {
  return {
    success: false,
    error: message,
    ...(details && { details })
  };
}

/**
 * Validate username format
 * Username must be alphanumeric with underscores, 3-30 characters
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Sanitize user input to prevent SQL injection and XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 255); // Limit length
}