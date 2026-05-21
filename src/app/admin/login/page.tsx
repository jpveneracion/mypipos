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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl shadow-2xl p-8 border-2 border-purple-500">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔧</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Admin Login
            </h1>
            <p className="text-sm text-purple-200">
              Development & Testing Access
            </p>
          </div>

          <div className="bg-yellow-500 bg-opacity-20 border-l-4 border-yellow-400 p-4 mb-6">
            <p className="text-sm text-yellow-200">
              <strong>Development Mode:</strong> This admin login bypasses Pi Network authentication for testing purposes only.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-purple-800 text-white"
                placeholder="Enter admin username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-purple-800 text-white"
                placeholder="Enter admin password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-900 bg-opacity-50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {debugInfo && (
              <div className="bg-blue-900 bg-opacity-50 border border-blue-500 text-blue-200 px-4 py-2 rounded-lg text-xs">
                {debugInfo}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Logging in...' : '🔧 Admin Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-purple-300 hover:text-white"
            >
              ← Back to main page
            </button>
          </div>

          <div className="mt-4 pt-6 border-t border-purple-700">
            <h3 className="text-sm font-semibold text-white mb-3">
              Pi Browser Users - Quick Access
            </h3>
            <p className="text-xs text-purple-300 mb-3">
              If normal login doesn't work in Pi Browser, use these direct access links:
            </p>
            <div className="space-y-2">
              <a
                href="/admin/dashboard?auth=dev_pi_browser"
                className="block w-full text-left px-4 py-3 bg-green-800 hover:bg-green-700 text-green-200 rounded-lg text-sm transition-colors no-underline border border-green-600"
              >
                🛠️ Admin Dashboard (Direct Link)
              </a>
              <a
                href="/pos"
                className="block w-full text-left px-4 py-3 bg-purple-800 hover:bg-purple-700 text-purple-200 rounded-lg text-sm transition-colors no-underline border border-purple-600"
              >
                📱 Test POS Interface
              </a>
              <a
                href="/ims"
                className="block w-full text-left px-4 py-3 bg-indigo-800 hover:bg-indigo-700 text-purple-200 rounded-lg text-sm transition-colors no-underline border border-purple-600"
              >
                📊 Test IMS Interface
              </a>
            </div>
          </div>

          <div className="mt-4 p-3 bg-purple-800 bg-opacity-50 rounded-lg border border-purple-600">
            <p className="text-xs text-purple-300 text-center">
              <strong className="text-white">Default Credentials:</strong><br/>
              Username: <code className="bg-purple-700 px-1 rounded text-purple-200">admin</code><br/>
              Password: <code className="bg-purple-700 px-1 rounded text-purple-200">admin123</code>
            </p>
          </div>

          <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 border border-blue-500 rounded-lg">
            <p className="text-xs text-blue-300 text-center">
              <strong>💡 Pi Browser Users:</strong> If login doesn't work, try the "Admin Dashboard (Direct)" link below.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}