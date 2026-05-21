'use client';

import { useState } from 'react';
import { PiAuth } from '@/lib/pi-auth';
import { useAuthStore } from '@/lib/store';

export default function PiAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuthStore();

  const handlePiLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const piAuth = new PiAuth({
        appId: process.env.NEXT_PUBLIC_PI_APP_ID || 'your-app-id',
        version: '1.0',
        authCallback: (accessToken, user) => {
          setAuth(true, user);
          // Store auth token securely
          if (typeof window !== 'undefined') {
            localStorage.setItem('pi_auth_token', accessToken);
            localStorage.setItem('pi_user', JSON.stringify(user));
          }
        }
      });

      const user = await piAuth.authenticate();
      console.log('Authenticated user:', user);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      console.error('Pi Auth error:', err);
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