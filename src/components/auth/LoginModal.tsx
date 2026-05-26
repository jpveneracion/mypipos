'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/lib/store';

// Dynamically import PiAuthButton to avoid SSR issues
const PiAuthButton = dynamic(() => import('./PiAuthButton'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-4">
      <div className="w-5 h-5 border-2 border-[#14D3C5] border-t-transparent rounded-full animate-spin"></div>
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
      <div className="glass-card shadow-glass-xl max-w-md w-full p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-indigo-400 hover:text-brand-indigo-300 text-2xl"
        >
          ×
        </button>

        {loginMethod === 'choice' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🥧</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to myPiPOS
              </h2>
              <p className="text-brand-indigo-200">
                Choose your authentication method
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setLoginMethod('pi')}
                className="w-full btn-cyan py-4 rounded-xl font-semibold shadow-glow transform transition hover:scale-105 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🥧</span>
                <div className="text-left">
                  <div>Continue with Pi Network</div>
                  <div className="text-xs opacity-80">For Pioneers and Merchants</div>
                </div>
              </button>

              <button
                onClick={() => setLoginMethod('credentials')}
                className="w-full glass-card hover:bg-white/10 text-white py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🔐</span>
                <div className="text-left">
                  <div>Login with Credentials</div>
                  <div className="text-xs opacity-70">For desktop IMS access</div>
                </div>
              </button>
            </div>

            <div className="text-center text-xs text-brand-indigo-300 glass-card rounded-lg p-3">
              <p className="font-semibold mb-1">🌍 Universal Pi Network Access</p>
              <p>One Pi account = Every myPiPOS merchant worldwide</p>
            </div>
          </div>
        )}

        {loginMethod === 'pi' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🥧</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Pi Network Authentication
              </h2>
              <p className="text-brand-indigo-200 text-sm mb-4">
                Secure authentication using your Pi Network account
              </p>
              <div className="glass-card rounded-lg p-3 text-xs text-brand-indigo-200">
                <p className="font-semibold mb-1">✨ New to Pi Network?</p>
                <p>No problem! Your account is created automatically.</p>
              </div>
            </div>

            {/* Use actual PiAuthButton component */}
            <PiAuthButton />

            <button
              onClick={() => setLoginMethod('choice')}
              className="w-full text-brand-indigo-400 hover:text-brand-indigo-300 text-sm"
            >
              ← Back to options
            </button>

            {error && (
              <div className="glass-card border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {loginMethod === 'credentials' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                IMS Login
              </h2>
              <p className="text-brand-indigo-200 text-sm">
                For desktop inventory management access
              </p>
            </div>

            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-indigo-300 mb-2">
                  Username or Pi Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="input-field"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-indigo-300 mb-2">
                  myPiPOS Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="input-field"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2 rounded" />
                  <span className="text-brand-indigo-400">Remember me</span>
                </label>
                <a href="#" className="text-[#14D3C5] hover:underline">Forgot password?</a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-cyan py-4 rounded-xl font-semibold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              className="w-full text-brand-indigo-400 hover:text-brand-indigo-300 text-sm"
            >
              ← Back to options
            </button>

            {error && (
              <div className="glass-card border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}