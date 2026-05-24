'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const router = useRouter();

  // Safe localStorage helper with fallbacks
  const safeSetAdminSession = (isAdmin: string, adminUser: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('isAdmin', isAdmin);
        localStorage.setItem('adminUser', adminUser);
        localStorage.setItem('adminLoginTime', new Date().toISOString());
        return { success: true, method: 'localStorage' };
      }
    } catch (e) {
      // Fallback to sessionStorage
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('isAdmin', isAdmin);
          sessionStorage.setItem('adminUser', adminUser);
          sessionStorage.setItem('adminLoginTime', new Date().toISOString());
          return { success: true, method: 'sessionStorage' };
        }
      } catch (e2) {
        // Final fallback - URL parameter
        return { success: true, method: 'url' };
      }
    }
    return { success: true, method: 'memory' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setDebugInfo('');

    // Simple hardcoded admin credentials for development
    const ADMIN_CREDENTIALS = {
      username: 'admin',
      password: 'admin123'
    };

    // Add debug info
    try {
      const hasLocalStorage = typeof localStorage !== 'undefined';
      const hasSessionStorage = typeof sessionStorage !== 'undefined';
      setDebugInfo(`Browser support: localStorage=${hasLocalStorage}, sessionStorage=${hasSessionStorage}`);
    } catch (e) {
      setDebugInfo('Browser storage detection failed');
    }

    // Simulate processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      // Set admin session using our safe storage method
      const result = safeSetAdminSession('true', username);

      if (result.method === 'url') {
        // For browsers with no storage support, use URL parameter
        router.push('/admin/dashboard?auth=dev_' + Date.now());
      } else {
        router.push('/admin/dashboard');
      }
    } else {
      setError('Invalid admin credentials. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="glassmorphism bg-white/70 dark:bg-oceanic-900/70 rounded-3xl shadow-glass-2xl p-8 border-2 border-oceanic-200 dark:border-oceanic-800 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-oceanic-500 to-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glass">
              <span className="text-4xl">🔧</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent mb-2">
              Admin Login
            </h1>
            <p className="text-sm text-oceanic-600 dark:text-oceanic-400">
              Development & Testing Access
            </p>
          </div>

          <div className="glassmorphism bg-linear-to-r from-warning-50 to-amber-50 dark:from-warning-900/20 dark:to-amber-900/20 border-l-4 border-warning-400 p-4 mb-6 rounded-lg">
            <p className="text-sm text-warning-700 dark:text-warning-300">
              <strong>Development Mode:</strong> This admin login bypasses Pi Network authentication for testing purposes only.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-oceanic-700 dark:text-oceanic-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-oceanic-300 dark:border-oceanic-600 rounded-xl focus:ring-2 focus:ring-oceanic-500 focus:border-transparent bg-white dark:bg-oceanic-800 text-oceanic-900 dark:text-oceanic-100 placeholder-oceanic-400 dark:placeholder-oceanic-500"
                placeholder="Enter admin username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-oceanic-700 dark:text-oceanic-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-oceanic-300 dark:border-oceanic-600 rounded-xl focus:ring-2 focus:ring-oceanic-500 focus:border-transparent bg-white dark:bg-oceanic-800 text-oceanic-900 dark:text-oceanic-100 placeholder-oceanic-400 dark:placeholder-oceanic-500"
                placeholder="Enter admin password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-error-50 dark:bg-error-900/30 border border-error-500 text-error-700 dark:text-error-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {debugInfo && (
              <div className="bg-sky-50 dark:bg-sky-900/30 border border-sky-500 text-sky-700 dark:text-sky-300 px-4 py-2 rounded-xl text-xs">
                {debugInfo}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-linear-to-r from-oceanic-600 to-sky-600 hover:from-oceanic-700 hover:to-sky-700 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glass hover:shadow-glass-lg"
            >
              {isLoading ? 'Logging in...' : '🔧 Admin Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-oceanic-600 dark:text-oceanic-400 hover:text-oceanic-900 dark:hover:text-oceanic-100"
            >
              ← Back to main page
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-oceanic-200 dark:border-oceanic-700">
            <h3 className="text-sm font-semibold text-oceanic-900 dark:text-oceanic-100 mb-3">
              Pi Browser Users - Quick Access
            </h3>
            <p className="text-xs text-oceanic-600 dark:text-oceanic-400 mb-3">
              If normal login doesn't work in Pi Browser, use these direct access links:
            </p>
            <div className="space-y-2">
              <a
                href="/admin/dashboard?auth=dev_pi_browser"
                className="block w-full text-left px-4 py-3 bg-linear-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 dark:hover:from-emerald-800/30 dark:hover:to-teal-800/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm transition-all no-underline border border-emerald-300 dark:border-emerald-700 hover:border-emerald-500"
              >
                🛠️ Admin Dashboard (Direct Link)
              </a>
              <a
                href="/pos"
                className="block w-full text-left px-4 py-3 bg-linear-to-r from-oceanic-50 to-sky-50 hover:from-oceanic-100 hover:to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 dark:hover:from-oceanic-800/30 dark:hover:to-sky-800/30 text-oceanic-700 dark:text-oceanic-300 rounded-xl text-sm transition-all no-underline border border-oceanic-300 dark:border-oceanic-700 hover:border-oceanic-500"
              >
                📱 Test POS Interface
              </a>
              <a
                href="/ims"
                className="block w-full text-left px-4 py-3 bg-linear-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30 dark:hover:from-sky-800/30 dark:hover:to-blue-800/30 text-sky-700 dark:text-sky-300 rounded-xl text-sm transition-all no-underline border border-sky-300 dark:border-sky-700 hover:border-sky-500"
              >
                📊 Test IMS Interface
              </a>
            </div>
          </div>

          <div className="mt-4 p-3 glassmorphism bg-oceanic-50 dark:bg-oceanic-900/30 rounded-xl border border-oceanic-200 dark:border-oceanic-700">
            <p className="text-xs text-oceanic-700 dark:text-oceanic-300 text-center">
              <strong className="text-oceanic-900 dark:text-oceanic-100">Default Credentials:</strong><br/>
              Username: <code className="bg-oceanic-200 dark:bg-oceanic-700 px-2 py-0.5 rounded text-oceanic-800 dark:text-oceanic-200">admin</code><br/>
              Password: <code className="bg-oceanic-200 dark:bg-oceanic-700 px-2 py-0.5 rounded text-oceanic-800 dark:text-oceanic-200">admin123</code>
            </p>
          </div>

          <div className="mt-4 p-3 glassmorphism bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-700 rounded-xl">
            <p className="text-xs text-sky-700 dark:text-sky-300 text-center">
              <strong>💡 Pi Browser Users:</strong> If login doesn't work, try the "Admin Dashboard (Direct)" link below.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}