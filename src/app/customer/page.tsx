// src/app/customer/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function CustomerPage() {
  const router = useRouter();
  const { isAuthenticated, user, merchantId, currentContext } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // If user is a merchant but not in customer context, show mode selection
    if (merchantId && currentContext !== 'customer') {
      router.push('/mode-selection');
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, merchantId, currentContext, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            🥧 myPiPOS Customer
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Welcome, {user?.username}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛍️</div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Customer Dashboard
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Your dashboard will appear here
          </p>
        </div>
      </main>
    </div>
  );
}
