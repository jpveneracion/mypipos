'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function PiAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPiReady, setIsPiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  // Wait for Pi SDK to load (mypiroll style)
  useEffect(() => {
    const waitForPi = setInterval(() => {
      if (typeof window !== "undefined" && window.Pi) {
        window.Pi.init({ version: "2.0" });
        setIsPiReady(true);
        clearInterval(waitForPi);
        console.log('✅ Pi SDK initialized');
      }
    }, 100);

    return () => clearInterval(waitForPi);
  }, []);

  const handlePiLogin = async () => {
    if (!window.Pi) {
      setError('Pi SDK not loaded. Please open in Pi Browser.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Handle incomplete payments during auth (mypiroll style)
      const onIncompletePaymentFound = (payment: any) => {
        console.log('⚠️ Incomplete payment found during auth:', payment.identifier);
        // TODO: Implement incomplete payment clearing
      };

      // 1. Authenticate with username scope only (frictionless login)
      const auth = await window.Pi.authenticate(['username'], onIncompletePaymentFound);

      if (!auth || !auth.user) {
        throw new Error('Authentication failed - no user data returned');
      }

      console.log('🥧 Pi Auth successful:', {
        uid: auth.user.uid,
        username: auth.user.username,
        accessToken: auth.accessToken?.substring(0, 15) + '...'
      });

      // 2. Send to backend (wallet address captured later during checkout)
      const response = await fetch('/api/auth/pi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: auth.accessToken,
          user: auth.user
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Backend authentication failed');
      }

      const data = await response.json();
      const { user } = data;

      if (!user) {
        throw new Error('User not returned from server');
      }

      console.log('✅ User logged in successfully:', {
        id: user.id,
        username: user.pi_username,
        role: user.role,
        userType: user.userType,
        onboardingComplete: user.onboardingComplete,
        merchant_id: user.merchant_id
      });

      // Update auth store with backend user data
      setAuth(true, {
        id: user.id,
        piUsername: user.pi_username,
        role: user.role,
        userType: user.userType,
        onboardingComplete: user.onboardingComplete,
        merchantId: user.merchant_id,
        createdAt: new Date()
      }, user.merchant_id);

      // Store auth data for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('pi_auth_token', auth.accessToken);
        localStorage.setItem('pi_user', JSON.stringify(user));
      }

      // Check if user needs onboarding
      if (!user.onboardingComplete) {
        console.log('👋 New user - redirecting to onboarding');
        router.push('/onboarding');
      } else if (user.merchant_id) {
        console.log('🏪 Merchant user - redirecting to mode selection');
        router.push('/mode-selection');
      } else {
        console.log('🛒 Customer user - redirecting to customer dashboard');
        router.push('/customer');
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMsg);
      console.error('❌ Pi Auth error:', err);
      alert(errorMsg); // Show error to user (mypiroll style)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handlePiLogin}
        disabled={isLoading || !isPiReady}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transform transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Connecting to Pi...
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

      {!isPiReady && (
        <div className="text-yellow-600 text-sm">
          Loading Pi Network SDK...
        </div>
      )}

      <div className="text-sm text-gray-500 text-center">
        <p>Secure authentication powered by Pi Network</p>
        <p className="mt-1">Your Pi credentials are never stored on our servers</p>
      </div>
    </div>
  );
}