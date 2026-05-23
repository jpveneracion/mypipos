'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateWithPi, storeSession } from '@/lib/pi-auth';
import { useAuthStore } from '@/lib/store';

export default function PiAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const router = useRouter();

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

      // Call backend to verify token and get/create user
      const response = await fetch('/api/auth/pi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: authResult.accessToken,
          user: authResult.user
        }),
      });

      if (!response.ok) {
        throw new Error('Backend authentication failed');
      }

      const { user } = await response.json();

      // Update auth store with backend user data
      setAuth(true, {
        id: user.id,
        piUsername: user.pi_username,
        role: user.role,
        createdAt: new Date()
      });

      // Store auth data for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('pi_auth_token', authResult.accessToken);
        localStorage.setItem('pi_user', JSON.stringify(user));
      }

      console.log('✅ User logged in successfully:', user);

      // Check if user needs onboarding
      if (!user.onboarding_complete) {
        console.log('👋 New user - redirecting to onboarding');
        router.push('/onboarding');
      } else if (user.user_type === 'merchant') {
        console.log('🏪 Merchant user - redirecting to mode selection');
        router.push('/mode-selection');
      } else {
        console.log('🛒 Customer user - redirecting to customer dashboard');
        router.push('/customer');
      }

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