/**
 * Development Authentication Bypass
 * For local development when Pi Network SDK doesn't work on localhost
 */

export interface DevUser {
  id: string;
  pi_username: string;
  role: string;
  user_type: 'pioneer' | 'merchant';
  onboarding_complete: boolean;
  merchant_id: string | null;
}

/**
 * Check if running in development mode with Pi Network unavailable
 */
export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  const isLocalhost = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return isLocalhost && isDevelopment;
}

/**
 * Mock authentication for development
 * This simulates Pi Network authentication for local development
 */
export async function devAuthenticate(scopes: string[] = ['username', 'payments']): Promise<{
  accessToken: string;
  user: {
    uid: string;
    username: string;
  };
} | null> {
  if (!isDevEnvironment()) {
    return null;
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Development user profiles
  const devUsers: DevUser[] = [
    {
      id: 'dev-user-1',
      pi_username: 'dev_pioneer',
      role: 'customer',
      user_type: 'pioneer',
      onboarding_complete: true,
      merchant_id: null
    },
    {
      id: 'dev-user-2',
      pi_username: 'dev_merchant',
      role: 'merchant',
      user_type: 'merchant',
      onboarding_complete: true,
      merchant_id: 'dev-merchant-123'
    },
    {
      id: 'dev-user-3',
      pi_username: 'new_user',
      role: 'customer',
      user_type: 'pioneer',
      onboarding_complete: false, // For testing onboarding
      merchant_id: null
    }
  ];

  // Allow selecting dev user via localStorage or prompt
  let selectedUserIndex = 0;

  if (typeof window !== 'undefined') {
    const storedIndex = localStorage.getItem('dev_user_index');
    if (storedIndex) {
      selectedUserIndex = parseInt(storedIndex);
    } else {
      // First time - prompt user to select (in production, this would be a UI)
      const username = prompt(
        '🔧 Development Mode - Select User:\n' +
        '0 - dev_pioneer (regular customer)\n' +
        '1 - dev_merchant (merchant user)\n' +
        '2 - new_user (needs onboarding)\n\n' +
        'Enter number (0-2):', '0'
      );
      selectedUserIndex = parseInt(username || '0');
      localStorage.setItem('dev_user_index', selectedUserIndex.toString());
    }
  }

  const selectedUser = devUsers[selectedUserIndex] || devUsers[0];

  console.log('🔧 DEV AUTH: Using development user:', selectedUser);

  return {
    accessToken: `dev-token-${Date.now()}`,
    user: {
      uid: selectedUser.id,
      username: selectedUser.pi_username
    }
  };
}

/**
 * Get development user details from username
 */
export function getDevUser(username: string): DevUser | null {
  const devUsers: DevUser[] = [
    {
      id: 'dev-user-1',
      pi_username: 'dev_pioneer',
      role: 'customer',
      user_type: 'pioneer',
      onboarding_complete: true,
      merchant_id: null
    },
    {
      id: 'dev-user-2',
      pi_username: 'dev_merchant',
      role: 'merchant',
      user_type: 'merchant',
      onboarding_complete: true,
      merchant_id: 'dev-merchant-123'
    },
    {
      id: 'dev-user-3',
      pi_username: 'new_user',
      role: 'customer',
      user_type: 'pioneer',
      onboarding_complete: false,
      merchant_id: null
    }
  ];

  return devUsers.find(u => u.pi_username === username) || null;
}

/**
 * Reset development user selection
 */
export function resetDevUserSelection(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dev_user_index');
  }
}