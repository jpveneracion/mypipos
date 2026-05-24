'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Header from '@/components/Header';

export default function ModeSelectionPage() {
  const router = useRouter();
  const { isAuthenticated, user, merchantId, currentContext, setContext } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Only show this page if user has merchantId
    if (!merchantId) {
      router.push('/customer');
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, merchantId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-50 via-white to-secondary-50">
        <div className="text-xl text-neutral-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Header
        title="myPiPOS"
        subtitle={`Welcome back, ${user?.piUsername}`}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-neutral-800 mb-2">
              Choose Your Mode
            </h2>
            <p className="text-neutral-600">
              You have access to both Merchant and Customer modes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {/* Merchant Mode Card */}
            <button
              onClick={() => {
                setContext('merchant');
                router.push('/pos');
              }}
              className="bg-white rounded-2xl shadow-medium hover:shadow-strong transition-all duration-300 p-8 border-2 border-transparent hover:border-primary-500 group"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-linear-to-r from-primary-500 to-secondary-600 rounded-2xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-800 mb-2">
                    Merchant Mode
                  </h3>
                  <p className="text-neutral-600">
                    Manage your products, sales, inventory, and business analytics
                  </p>
                </div>
                <div className="w-full pt-4">
                  <div className="text-sm text-primary-600 font-medium flex items-center justify-center gap-2">
                    Go to Dashboard
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>

            {/* Customer Mode Card */}
            <button
              onClick={() => {
                setContext('customer');
                router.push('/customer');
              }}
              className="bg-white rounded-2xl shadow-medium hover:shadow-strong transition-all duration-300 p-8 border-2 border-transparent hover:border-secondary-500 group"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-linear-to-r from-secondary-500 to-accent-600 rounded-2xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-neutral-800 mb-2">
                    Customer Mode
                  </h3>
                  <p className="text-neutral-600">
                    Shop, pay with Pi Network, and manage your invoices
                  </p>
                </div>
                <div className="w-full pt-4">
                  <div className="text-sm text-secondary-600 font-medium flex items-center justify-center gap-2">
                    Go to Customer Portal
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Quick Info */}
          <div className="mt-12 bg-primary-50 rounded-xl p-6 border border-primary-200">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-primary-900 mb-1">
                  Pro Tip
                </h4>
                <p className="text-sm text-primary-800">
                  You can quickly switch between modes using the toggle in the header at any time. Your current mode is always highlighted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
