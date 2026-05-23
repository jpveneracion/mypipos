'use client';

import { useState } from 'react';
import { authenticateWithPi, storeSession } from '@/lib/pi-auth';
import { useAuthStore } from '@/lib/store';

export default function PiAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const handlePiLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use modern Pi Network authentication (no app ID needed)
      const authResult = await authenticateWithPi(['username', 'payments']);

      if (!authResult) {
        throw new Error('Authentication failed - no result returned');
      }

      console.log('🥧 Pi Auth successful:', {
        uid: authResult.user.uid,
        username: authResult.user.username
      });

      // Map Pi user to our User interface
      const mappedUser = {
        id: authResult.user.uid,
        piUsername: authResult.user.username,
        role: 'cashier' as const, // Default role for Pi users
        createdAt: new Date()
      };

      // Update auth store
      setAuth(true, mappedUser);

      // Store auth data in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('pi_auth_token', authResult.accessToken);
        localStorage.setItem('pi_user', JSON.stringify(mappedUser));
      }

      console.log('✅ User logged in successfully:', mappedUser);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      console.error('❌ Pi Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handlePiLogin}
        disabled={isLoading}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transform transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Connecting...
          </span>
        ) : (
          '🥧 Login with Pi'
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Authentication Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="text-sm text-gray-500 text-center">
        <p>Secure authentication powered by Pi Network</p>
        <p className="mt-1">Your Pi credentials are never stored on our servers</p>
      </div>
    </div>
  );
}