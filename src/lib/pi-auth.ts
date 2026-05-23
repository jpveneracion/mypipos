// Pi Network Authentication utilities
// Modern approach: No App ID required - uses Pi SDK v2.0
// Reference: E:\laragon\www\mypiroll-nxt\mypiroll

export interface PiAuthSession {
  accessToken: string;
  user: {
    uid: string;
    username: string;
  };
  expiresAt: number; // Timestamp when token expires
  createdAt: number; // Timestamp when session was created
}

const PI_AUTH_SESSION_KEY = 'pi_auth_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Check if there's a valid stored session
 */
export function hasValidSession(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const sessionStr = localStorage.getItem(PI_AUTH_SESSION_KEY);
    if (!sessionStr) return false;

    const session: PiAuthSession = JSON.parse(sessionStr);

    // Check if session has expired
    const now = Date.now();
    if (now > session.expiresAt) {
      // Session expired, remove it
      localStorage.removeItem(PI_AUTH_SESSION_KEY);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[PI_AUTH] Error checking session:', error);
    return false;
  }
}

/**
 * Get the stored session if valid
 */
export function getStoredSession(): PiAuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const sessionStr = localStorage.getItem(PI_AUTH_SESSION_KEY);
    if (!sessionStr) return null;

    const session: PiAuthSession = JSON.parse(sessionStr);

    // Check if session has expired
    const now = Date.now();
    if (now > session.expiresAt) {
      // Session expired, remove it
      localStorage.removeItem(PI_AUTH_SESSION_KEY);
      return null;
    }

    return session;
  } catch (error) {
    console.error('[PI_AUTH] Error getting session:', error);
    return null;
  }
}

/**
 * Store a new authentication session
 */
export function storeSession(accessToken: string, user: any): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();
    const session: PiAuthSession = {
      accessToken,
      user: {
        uid: user.uid,
        username: user.username
      },
      expiresAt: now + SESSION_DURATION,
      createdAt: now
    };

    localStorage.setItem(PI_AUTH_SESSION_KEY, JSON.stringify(session));
    console.log('[PI_AUTH] Session stored, expires at:', new Date(session.expiresAt).toISOString());
  } catch (error) {
    console.error('[PI_AUTH] Error storing session:', error);
  }
}

/**
 * Clear the stored session
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(PI_AUTH_SESSION_KEY);
    console.log('[PI_AUTH] Session cleared');
  } catch (error) {
    console.error('[PI_AUTH] Error clearing session:', error);
  }
}

/**
 * Authenticate with Pi Network - uses stored session if available
 * Falls back to Pi.authenticate() if no valid session
 */
export async function authenticateWithPi(scopes: string[] = ['username', 'payments']): Promise<{
  accessToken: string;
  user: {
    uid: string;
    username: string;
  };
} | null> {
  if (typeof window === 'undefined' || !(window as any).Pi) {
    console.error('[PI_AUTH] Pi Network SDK not available');
    return null;
  }

  // First, check if we have a valid stored session
  const storedSession = getStoredSession();
  if (storedSession) {
    console.log('[PI_AUTH] Using stored session for user:', storedSession.user.username);
    return {
      accessToken: storedSession.accessToken,
      user: storedSession.user
    };
  }

  // No valid session, need to authenticate
  console.log('[PI_AUTH] No valid session, calling Pi.authenticate()...');

  try {
    // Initialize Pi SDK first (no app ID needed with v2.0)
    await (window as any).Pi.init({ version: "2.0" });
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for init

    const authResult = await (window as any).Pi.authenticate(scopes);

    if (!authResult || !authResult.user) {
      console.error('[PI_AUTH] Authentication failed: No user data returned');
      return null;
    }

    const accessToken = authResult.accessToken || authResult.authToken || 'session-active';
    const user = {
      uid: authResult.user.uid,
      username: authResult.user.username
    };

    // Store the session for future use
    storeSession(accessToken, authResult.user);

    console.log('[PI_AUTH] ✅ Authentication successful, session stored');

    return {
      accessToken,
      user
    };
  } catch (error) {
    console.error('[PI_AUTH] Authentication failed:', error);
    return null;
  }
}

/**
 * Check authentication status without forcing new auth
 * Returns session if valid, null otherwise
 */
export function checkAuthStatus(): PiAuthSession | null {
  return getStoredSession();
}

/**
 * Create a payment with Pi Network
 */
export async function createPayment(amount: number, memo: string): Promise<any> {
  if (typeof window === 'undefined' || !(window as any).Pi) {
    throw new Error('Pi SDK not available');
  }

  return new Promise((resolve, reject) => {
    const payment = {
      amount: amount.toFixed(2),
      memo: memo,
      metadata: {
        // No app ID needed with modern approach
      }
    };

    (window as any).Pi.createPayment(
      payment,
      {
        onReadyForServerApproval: (paymentId: string) => {
          resolve({ paymentId, status: 'ready_for_approval' });
        },
        onApproved: (paymentId: string) => {
          resolve({ paymentId, status: 'approved' });
        },
        onIncomplete: (paymentId: string, error: any) => {
          reject(new Error(`Payment incomplete: ${error}`));
        },
        onCancelled: (paymentId: string) => {
          resolve({ paymentId, status: 'cancelled' });
        },
        onError: (error: any) => {
          reject(new Error(`Payment error: ${error}`));
        }
      }
    );
  });
}

// Legacy interfaces for backward compatibility
export interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
}

export class PiAuth {
  async authenticate(): Promise<PiUser> {
    const result = await authenticateWithPi();
    if (!result) {
      throw new Error('Authentication failed');
    }
    return {
      uid: result.user.uid,
      username: result.user.username,
      accessToken: result.accessToken
    };
  }

  async createPayment(amount: number, memo: string): Promise<any> {
    return createPayment(amount, memo);
  }

  isAuthenticated(): boolean {
    return hasValidSession();
  }

  async getAccessToken(): Promise<string | null> {
    const session = getStoredSession();
    return session?.accessToken || null;
  }
}