'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

    if (merchantId && currentContext !== 'customer') {
      router.push('/mode-selection');
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, merchantId, currentContext, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-oceanic-200 border-t-oceanic-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-oceanic-900 dark:text-oceanic-100 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex flex-col">
      <Header
        title="myPiPOS Customer"
        subtitle={`Welcome, ${user?.piUsername}`}
      />

      <main className="container mx-auto px-6 py-8 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-linear-to-br from-oceanic-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-glass text-3xl">
                👤
              </div>
              <div>
                <h2 className="text-4xl font-bold bg-linear-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
                  Customer Dashboard
                </h2>
                <p className="text-oceanic-700 dark:text-oceanic-300 mt-1">
                  Manage your invoices, payments, and account settings
                </p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="glassmorphism hover:shadow-glass transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center text-2xl">
                  🛍️
                </div>
                <div>
                  <p className="text-oceanic-600 dark:text-oceanic-400 text-sm font-medium">Total Purchases</p>
                  <p className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100">--</p>
                </div>
              </div>
            </Card>

            <Card className="glassmorphism hover:shadow-glass transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-emerald-100 to-success-100 dark:from-emerald-900/30 dark:to-success-900/30 rounded-xl flex items-center justify-center text-2xl">
                  💰
                </div>
                <div>
                  <p className="text-oceanic-600 dark:text-oceanic-400 text-sm font-medium">Total Spent</p>
                  <p className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100">-- π</p>
                </div>
              </div>
            </Card>

            <Card className="glassmorphism hover:shadow-glass transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-warning-100 to-amber-100 dark:from-warning-900/30 dark:to-amber-900/30 rounded-xl flex items-center justify-center text-2xl">
                  🏪
                </div>
                <div>
                  <p className="text-oceanic-600 dark:text-oceanic-400 text-sm font-medium">Merchants Used</p>
                  <p className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100">--</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Customer QR Code Section */}
          <Card className="mb-12 glassmorphism">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-linear-to-br from-oceanic-500 to-sky-600 rounded-xl flex items-center justify-center text-lg">
                  📱
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100">
                    Your Customer QR Code
                  </h3>
                  <p className="text-oceanic-600 dark:text-oceanic-400 text-sm">
                    Scan this at checkout for faster payment and loyalty rewards
                  </p>
                </div>
              </div>
            </div>

            {user && (
              <CustomerQRCode
                user={{
                  id: user.id,
                  username: user.piUsername
                }}
              />
            )}
          </Card>

          {/* Invoices Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-br from-oceanic-500 to-sky-600 rounded-xl flex items-center justify-center text-lg">
                📋
              </div>
              <div>
                <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100">
                  My Invoices
                </h3>
                <p className="text-oceanic-600 dark:text-oceanic-400 text-sm">
                  View and manage your purchase history
                </p>
              </div>
            </div>

            {user?.piUsername && (
              <InvoiceList username={user.piUsername} />
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-12">
            <h3 className="text-xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glassmorphism hover:shadow-glass transition-all duration-300 cursor-pointer group">
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-oceanic-100 to-sky-100 dark:from-oceanic-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      🔍
                    </div>
                    <div>
                      <h4 className="font-bold text-oceanic-900 dark:text-oceanic-100">Find Merchants</h4>
                      <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Discover nearby stores</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="glassmorphism hover:shadow-glass transition-all duration-300 cursor-pointer group">
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-emerald-100 to-success-100 dark:from-emerald-900/30 dark:to-success-900/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      💳
                    </div>
                    <div>
                      <h4 className="font-bold text-oceanic-900 dark:text-oceanic-100">Payment History</h4>
                      <p className="text-sm text-oceanic-600 dark:text-oceanic-400">View all transactions</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="glassmorphism hover:shadow-glass transition-all duration-300 cursor-pointer group">
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-warning-100 to-amber-100 dark:from-warning-900/30 dark:to-amber-900/30 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      ⚙️
                    </div>
                    <div>
                      <h4 className="font-bold text-oceanic-900 dark:text-oceanic-100">Account Settings</h4>
                      <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Manage preferences</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
