'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import InvoiceList from './components/InvoiceList';
import CustomerQRCode from './components/CustomerQRCode';
import { TestPiClaimCard } from '@/components/customer/TestPiClaimCard';
import {
  User,
  ShoppingBag,
  DollarSign,
  Smartphone,
  FileText,
  Search,
  CreditCard,
  Settings,
  ArrowLeft
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 }
};

export default function CustomerPage() {
  const router = useRouter();
  const { isAuthenticated, user, merchantId, currentContext } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0F16] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-indigo-800 border-t-brand-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-indigo-300 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0F16] flex flex-col">
      <Header
        title="myPiPOS Customer"
        subtitle={`Welcome, ${user?.piUsername}`}
      />

      {/* Back to Mode Selection - only show if user has merchant access */}
      {merchantId && (
        <div className="px-6 py-3 bg-[#0D0F16]/50 border-b border-brand-indigo-800/30">
          <button
            onClick={() => router.push('/mode-selection')}
            className="flex items-center gap-2 text-brand-indigo-400 hover:text-[#14D3C5] transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Mode Selection</span>
          </button>
        </div>
      )}

      <main className="container mx-auto px-6 py-8 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-2xl flex items-center justify-center shadow-glow">
                <User className="w-6 h-6 text-brand-dark-950" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">
                  Customer Dashboard
                </h2>
                <p className="text-brand-indigo-400 mt-1">
                  Manage your invoices, payments, and account settings
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="glass-card">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan-400/5 rounded-full blur-3xl group-hover:bg-brand-cyan-400/10 transition-all"></div>
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30">
                      <ShoppingBag className="w-6 h-6 text-brand-cyan-400" />
                    </div>
                    <div>
                      <p className="text-brand-indigo-400 text-sm font-medium">Total Purchases</p>
                      <p className="text-lg font-display font-bold text-brand-indigo-200">--</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="glass-card">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan-400/5 rounded-full blur-3xl group-hover:bg-brand-cyan-400/10 transition-all"></div>
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30">
                      <DollarSign className="w-6 h-6 text-brand-cyan-400" />
                    </div>
                    <div>
                      <p className="text-brand-indigo-400 text-sm font-medium">Total Spent</p>
                      <p className="text-lg font-display font-bold text-brand-indigo-200">-- π</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Test Pi Claim Section - Above QR Code */}
          {user && <TestPiClaimCard userId={user.id} />}

          {/* Customer QR Code Section */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-12"
          >
            <Card className="glass-card">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-brand-dark-950" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-brand-indigo-100">
                      Your Customer QR Code
                    </h3>
                    <p className="text-brand-indigo-400 text-sm">
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
          </motion.div>

          {/* Invoices Section */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-brand-dark-950" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-brand-indigo-100">
                  My Invoices
                </h3>
                <p className="text-brand-indigo-400 text-sm">
                  View and manage your purchase history
                </p>
              </div>
            </div>

            {user?.piUsername && (
              <InvoiceList username={user.piUsername} />
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h3 className="text-lg font-display font-bold text-brand-indigo-100 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 hover:shadow-glass transition-all duration-300 cursor-pointer group">
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30 group-hover:scale-110 transition-transform">
                      <Search className="w-6 h-6 text-brand-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-indigo-200">Find Merchants</h4>
                      <p className="text-sm text-brand-indigo-400">Discover nearby stores</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 hover:shadow-glass transition-all duration-300 cursor-pointer group">
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30 group-hover:scale-110 transition-transform">
                      <CreditCard className="w-6 h-6 text-brand-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-indigo-200">Payment History</h4>
                      <p className="text-sm text-brand-indigo-400">View all transactions</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                className="bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 hover:shadow-glass transition-all duration-300 cursor-pointer group"
                onClick={() => router.push('/account-settings')}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30 group-hover:scale-110 transition-transform">
                      <Settings className="w-6 h-6 text-brand-cyan-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-indigo-200">Account Settings</h4>
                      <p className="text-sm text-brand-indigo-400">Manage preferences</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
