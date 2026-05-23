// src/app/customer/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Header from '@/components/Header';
import InvoiceList from './components/InvoiceList';
import CustomerQRCode from './components/CustomerQRCode';

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
      <Header
        title="myPiPOS Customer"
        subtitle={`Welcome, ${user?.piUsername}`}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Customer Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your invoices and payments
            </p>
          </div>

          {/* Customer QR Code Section */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Your Customer QR Code
            </h3>
            {user && (
              <CustomerQRCode
                user={{
                  id: user.id,
                  username: user.piUsername
                }}
              />
            )}
          </div>

          {/* Invoices Section */}
          <div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              My Invoices
            </h3>
            {user?.piUsername && (
              <InvoiceList username={user.piUsername} />
            )}
          </div>
        </div>
      </main>
        </div>
      </main>
    </div>
  );
}
