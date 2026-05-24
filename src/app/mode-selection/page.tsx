'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-oceanic-200 border-t-oceanic-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-oceanic-900 dark:text-oceanic-100 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex flex-col">
      <Header
        title="myPiPOS"
        subtitle={`Welcome back, ${user?.piUsername}`}
      />

      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-oceanic-500 to-sky-600 rounded-3xl flex items-center justify-center shadow-glass text-4xl mb-6">
              🎯
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
              Choose Your Mode
            </h2>
            <p className="text-xl text-oceanic-700 dark:text-oceanic-300 max-w-2xl mx-auto">
              You have access to both Merchant and Customer modes
            </p>
          </div>

          {/* Mode Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Merchant Mode Card */}
            <button
              onClick={() => {
                setContext('merchant');
                router.push('/pos');
              }}
              className="glassmorphism rounded-3xl p-8 text-left hover:shadow-glass-lg transition-all duration-300 border-2 border-oceanic-100 dark:border-oceanic-800 hover:border-oceanic-400 group"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-oceanic-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-glass group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">
                      Merchant Mode
                    </h3>
                  </div>
                </div>

                <p className="text-oceanic-700 dark:text-oceanic-300 mb-6 text-lg">
                  Manage products, sales, inventory, and business analytics
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-oceanic-600 dark:text-oceanic-400">
                    <div className="w-2 h-2 bg-oceanic-500 rounded-full"></div>
                    <span>Point of Sale (POS)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-oceanic-600 dark:text-oceanic-400">
                    <div className="w-2 h-2 bg-oceanic-500 rounded-full"></div>
                    <span>Inventory Management</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-oceanic-600 dark:text-oceanic-400">
                    <div className="w-2 h-2 bg-oceanic-500 rounded-full"></div>
                    <span>Sales Analytics</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-oceanic-200 dark:border-oceanic-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-oceanic-600 dark:text-oceanic-400">Go to Dashboard</span>
                    <svg className="w-5 h-5 text-oceanic-600 dark:text-oceanic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="glassmorphism rounded-3xl p-8 text-left hover:shadow-glass-lg transition-all duration-300 border-2 border-sky-100 dark:border-sky-800 hover:border-sky-400 group"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-oceanic-600 rounded-2xl flex items-center justify-center shadow-glass group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">
                      Customer Mode
                    </h3>
                  </div>
                </div>

                <p className="text-oceanic-700 dark:text-oceanic-300 mb-6 text-lg">
                  Shop, pay with Pi Network, and manage your invoices
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400">
                    <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                    <span>Pay Invoices</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400">
                    <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                    <span>View Order History</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400">
                    <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                    <span>QR Code Payment</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-sky-200 dark:border-sky-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-sky-600 dark:text-sky-400">Go to Customer Portal</span>
                    <svg className="w-5 h-5 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Quick Info */}
          <div className="glassmorphism rounded-2xl p-6 bg-gradient-to-r from-oceanic-50 to-sky-50 dark:from-oceanic-900/30 dark:to-sky-900/30 border border-oceanic-200 dark:border-oceanic-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-oceanic-600 dark:text-oceanic-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">
                  Pro Tip
                </h4>
                <p className="text-sm text-oceanic-700 dark:text-oceanic-300">
                  You can quickly switch between modes anytime. Your current mode is always highlighted in the navigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
