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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to myPiPOS! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Hi, {user?.piUsername || 'Pioneer'}!
          </p>
          <p className="text-gray-500">
            You've successfully authenticated with Pi Network. Now, let's set up your account.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            How will you use myPiPOS?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Customer Option */}
            <button
              onClick={() => handleRoleSelection('customer')}
              disabled={loading}
              className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 rounded-xl p-6 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Customer</h3>
              <p className="text-gray-600 text-sm mb-4">
                I want to shop at merchants and pay with Pi
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>✓ View purchase history</li>
                <li>✓ Manage invoices & bills</li>
                <li>✓ Pay with Pi Network</li>
                <li>✓ Share QR profile</li>
              </ul>
            </button>

            {/* Merchant Option */}
            <button
              onClick={() => handleRoleSelection('merchant')}
              disabled={loading}
              className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 rounded-xl p-6 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="text-4xl mb-4">🏪</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Merchant</h3>
              <p className="text-gray-600 text-sm mb-4">
                I have a business and want to accept Pi payments
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>✓ Point of Sale (POS)</li>
                <li>✓ Inventory Management</li>
                <li>✓ Customer invoices</li>
                <li>✓ Sales analytics</li>
              </ul>
            </button>

            {/* Both Option */}
            <button
              onClick={() => handleRoleSelection('both')}
              disabled={loading}
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border-2 border-indigo-200 rounded-xl p-6 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Both</h3>
              <p className="text-gray-600 text-sm mb-4">
                I'm both a customer and a business owner
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>✓ All customer features</li>
                <li>✓ All merchant features</li>
                <li>✓ Easy context switching</li>
                <li>✓ Unified experience</li>
              </ul>
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>You can always change this later in your profile settings</p>
          <p className="mt-2">
            Questions? Contact us at <a href="mailto:support@mypipos.com" className="text-purple-600 hover:underline">support@mypipos.com</a>
          </p>
        </div>

        {loading && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span>Setting up your account...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}