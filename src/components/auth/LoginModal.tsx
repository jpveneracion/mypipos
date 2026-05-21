'use client';

import { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (method: string) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [loginMethod, setLoginMethod] = useState<'choice' | 'pi' | 'credentials'>('choice');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  if (!isOpen) return null;

  const handlePiLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate Pi Network authentication
      await new Promise(resolve => setTimeout(resolve, 2000));
      onLoginSuccess('pi');
      onClose();
    } catch (err) {
      setError('Pi authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePiRegister = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate Pi Network registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      onLoginSuccess('pi-register');
      onClose();
    } catch (err) {
      setError('Pi registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate credential authentication
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (credentials.username && credentials.password) {
        onLoginSuccess('credentials');
        onClose();
      } else {
        setError('Please enter both username and password');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
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
                <span>Continue with Pi Network</span>
              </button>

              <button
                onClick={() => setLoginMethod('credentials')}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🔐</span>
                <span>Login with Credentials</span>
              </button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>New user? <button onClick={() => setLoginMethod('pi')} className="text-purple-600 hover:underline">Register with Pi</button></p>
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
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Secure login using your Pi Network account
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePiLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🔓</span>
                    <span>Login with Pi</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePiRegister}
                disabled={isLoading}
                className="w-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>📝</span>
                <span>Register New Account</span>
              </button>
            </div>

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

            <div className="text-center text-xs text-gray-500 border-t pt-4">
              <p>Desktop IMS users can also use Pi Network authentication</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}