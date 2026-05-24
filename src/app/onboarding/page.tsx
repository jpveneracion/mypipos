'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleRoleSelection = async (role: 'customer' | 'merchant' | 'both') => {
    setLoading(true);

    try {
      // Call API to update user role and onboarding status
      const response = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, userId: user?.id }),
      });

      if (response.ok) {
        const { user } = await response.json();

        // Update auth store with new user data
        setAuth(true, {
          id: user.id,
          piUsername: user.pi_username,
          role: user.user_role,
          userType: user.user_type,
          onboardingComplete: user.onboarding_complete,
          merchantId: user.merchant_id,
          createdAt: new Date()
        }, user.merchant_id);

        console.log('✅ User onboarding completed:', user);

        // Redirect based on role selection
        switch (role) {
          case 'customer':
            router.push('/customer');
            break;
          case 'merchant':
            router.push('/pos'); // Direct to POS for merchant-only users
            break;
          case 'both':
            router.push('/mode-selection'); // Let users choose their starting mode
            break;
        }
      } else {
        throw new Error('Onboarding failed');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-oceanic-200 border-t-oceanic-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-oceanic-700 dark:text-oceanic-300 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-oceanic-500 to-sky-600 rounded-3xl flex items-center justify-center shadow-glass text-5xl mb-8">
            🎉
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
            Welcome to myPiPOS!
          </h1>
          <p className="text-2xl text-oceanic-700 dark:text-oceanic-300 mb-2">
            Hi, {user?.piUsername || 'Pioneer'}!
          </p>
          <p className="text-oceanic-600 dark:text-oceanic-400 text-lg">
            You've successfully authenticated with Pi Network. Now, let's set up your account.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="glassmorphism rounded-3xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-8 text-center">
            How will you use myPiPOS?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Customer Option */}
            <button
              onClick={() => handleRoleSelection('customer')}
              disabled={loading}
              className="bg-gradient-to-br from-oceanic-50 to-sky-50 dark:from-oceanic-900/30 dark:to-sky-900/30 hover:from-oceanic-100 hover:to-sky-100 dark:hover:from-oceanic-800/30 dark:hover:to-sky-800/30 border-2 border-oceanic-200 dark:border-oceanic-700 hover:border-oceanic-400 dark:hover:border-oceanic-500 rounded-2xl p-8 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-glass hover:shadow-glass-lg group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🛒</div>
              <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-3">Customer</h3>
              <p className="text-oceanic-700 dark:text-oceanic-300 mb-6">
                I want to shop at merchants and pay with Pi
              </p>
              <ul className="text-sm text-oceanic-600 dark:text-oceanic-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-oceanic-500">✓</span>
                  <span>View purchase history</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-oceanic-500">✓</span>
                  <span>Manage invoices & bills</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-oceanic-500">✓</span>
                  <span>Pay with Pi Network</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-oceanic-500">✓</span>
                  <span>Share QR profile</span>
                </li>
              </ul>
            </button>

            {/* Merchant Option */}
            <button
              onClick={() => handleRoleSelection('merchant')}
              disabled={loading}
              className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/30 hover:from-sky-100 hover:to-blue-100 dark:hover:from-sky-800/30 dark:hover:to-blue-800/30 border-2 border-sky-200 dark:border-sky-700 hover:border-sky-400 dark:hover:border-sky-500 rounded-2xl p-8 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-glass hover:shadow-glass-lg group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏪</div>
              <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-3">Merchant</h3>
              <p className="text-oceanic-700 dark:text-oceanic-300 mb-6">
                I have a business and want to accept Pi payments
              </p>
              <ul className="text-sm text-oceanic-600 dark:text-oceanic-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-sky-500">✓</span>
                  <span>Point of Sale (POS)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sky-500">✓</span>
                  <span>Inventory Management</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sky-500">✓</span>
                  <span>Customer invoices</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sky-500">✓</span>
                  <span>Sales analytics</span>
                </li>
              </ul>
            </button>

            {/* Both Option */}
            <button
              onClick={() => handleRoleSelection('both')}
              disabled={loading}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-800/30 dark:hover:to-teal-800/30 border-2 border-emerald-200 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-2xl p-8 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-glass hover:shadow-glass-lg group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🔄</div>
              <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-3">Both</h3>
              <p className="text-oceanic-700 dark:text-oceanic-300 mb-6">
                I'm both a customer and a business owner
              </p>
              <ul className="text-sm text-oceanic-600 dark:text-oceanic-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>Switch between modes</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>Full platform access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>Shop & sell products</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>Maximum flexibility</span>
                </li>
              </ul>
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="glassmorphism rounded-2xl p-6 bg-gradient-to-r from-oceanic-50 to-sky-50 dark:from-oceanic-900/30 dark:to-sky-900/30 border border-oceanic-200 dark:border-oceanic-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-oceanic-600 dark:text-oceanic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">
                Don't worry, you can always change your preference later!
              </h4>
              <p className="text-sm text-oceanic-700 dark:text-oceanic-300">
                Your account settings are flexible and can be updated anytime from your profile.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-oceanic-900 rounded-2xl p-8 shadow-glass-2xl max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-oceanic-200 border-t-oceanic-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-oceanic-900 dark:text-oceanic-100 font-semibold">Setting up your account...</p>
                <p className="text-sm text-oceanic-600 dark:text-oceanic-400 mt-2">This will only take a moment.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
