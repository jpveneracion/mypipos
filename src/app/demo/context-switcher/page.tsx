'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Header from '@/components/Header';

/**
 * Context Switcher Demo Page
 *
 * This page demonstrates the Context Switcher component in action.
 * To test this page:
 * 1. Ensure you have a user with merchantId in the auth store
 * 2. Navigate to /demo/context-switcher
 * 3. You should see the context switcher in the header
 */

export default function ContextSwitcherDemo() {
  const router = useRouter();
  const { isAuthenticated, merchantId, currentContext, user } = useAuthStore();

  // Demo: Mock merchant user for testing
  useEffect(() => {
    if (!isAuthenticated) {
      // For demo purposes, you might want to redirect to login
      // router.push('/');
      console.log('Demo: Please authenticate first');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <Header
        title="Context Switcher Demo"
        subtitle="Test page for the Context Switcher component"
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Current State Display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Current State
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Authenticated:</span>
                <span className={`font-medium ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">User:</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {user?.piUsername || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Merchant ID:</span>
                <span className={`font-medium ${merchantId ? 'text-green-600' : 'text-gray-400'}`}>
                  {merchantId || 'Not a merchant'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Current Context:</span>
                <span className={`font-medium px-3 py-1 rounded-full ${
                  currentContext === 'merchant'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                }`}>
                  {currentContext === 'merchant' ? '🏪 Merchant' : '👤 Customer'}
                </span>
              </div>
            </div>
          </div>

          {/* Context Switcher Display Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Context Switcher Status
            </h2>
            <div className="space-y-4">
              {merchantId ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-300 mb-1">
                        Context Switcher is Active
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        You have a Merchant ID, so the Context Switcher should be visible in the header above.
                        Try switching between Merchant and Customer modes!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                        Context Switcher is Hidden
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        You don't have a Merchant ID, so the Context Switcher is not displayed.
                        Only merchant users can switch between modes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              How to Use
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                    Look at the Header
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The Context Switcher appears in the header (top-right) if you're a merchant user.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                    Switch Modes
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click on "Merchant" or "Customer" to switch modes. The active mode is highlighted in purple.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                    Automatic Redirect
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    After switching, you'll be automatically redirected to the appropriate dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Responsive Design Test */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Responsive Design Test
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                      Resize Your Browser
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Try resizing your browser window to see the responsive behavior:
                      <strong className="block mt-2">
                        • Desktop (≥768px): Inline toggle buttons
                        <br />
                        • Mobile (&lt;768px): Dropdown menu with animations
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
