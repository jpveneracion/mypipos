'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/lib/store';

// Dynamically import PiAuthButton to avoid SSR issues
const PiAuthButton = dynamic(() => import('./PiAuthButton'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-4">
      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (method: string) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [loginMethod, setLoginMethod] = useState<'choice' | 'pi' | 'credentials'>('choice');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/ims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Authentication failed');
      }

      const { user } = await response.json();

      // Update auth store
      const { setAuth } = useAuthStore.getState();
      setAuth(true, {
        id: user.id,
        piUsername: user.piUsername || user.username,
        userType: user.userType || 'customer',
        role: user.role,
        onboardingComplete: user.onboardingComplete || false,
        merchantId: user.merchantId,
        createdAt: new Date()
      });

      onLoginSuccess('credentials');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
        >
          ×
        </button>

        {loginMethod === 'choice' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🥧</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Welcome to myPiPOS
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Choose your authentication method
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setLoginMethod('pi')}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🥧</span>
                <div className="text-left">
                  <div>Continue with Pi Network</div>
                  <div className="text-xs opacity-80">For Pioneers and Merchants</div>
                </div>
              </button>

              <button
                onClick={() => setLoginMethod('credentials')}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🔐</span>
                <div className="text-left">
                  <div>Login with Credentials</div>
                  <div className="text-xs opacity-70">For desktop IMS access</div>
                </div>
              </button>
            </div>

            <div className="text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="font-semibold mb-1">🌍 Universal Pi Network Access</p>
              <p>One Pi account = Every myPiPOS merchant worldwide</p>
            </div>
          </div>
        )}

        {loginMethod === 'pi' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🥧</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Pi Network Authentication
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Secure authentication using your Pi Network account
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">✨ New to Pi Network?</p>
                <p>No problem! Your account is created automatically.</p>
              </div>
            </div>

            {/* Use actual PiAuthButton component */}
            <PiAuthButton />

            <button
              onClick={() => setLoginMethod('choice')}
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
            >
              ← Back to options
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {loginMethod === 'credentials' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                IMS Login
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                For desktop inventory management access
              </p>
            </div>

            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username or Pi Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  myPiPOS Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <a href="#" className="text-purple-600 hover:underline">Forgot password?</a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <span>🔓</span>
                    <span>Login to IMS</span>
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => setLoginMethod('choice')}
              className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
            >
              ← Back to options
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}