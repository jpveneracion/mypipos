'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import {
  Store,
  User,
  ChevronRight,
  ShoppingCart,
  Barcode,
  BarChart3,
  CreditCard,
  FileText,
  Smartphone,
  Target
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 }
};

export default function ModeSelectionPage() {
  const router = useRouter();
  const { isAuthenticated, user, merchantId, currentContext, setContext } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasRouted, setHasRouted] = useState(false);
  const isNavigating = useRef(false);

  useEffect(() => {
    // Prevent routing loops
    if (hasRouted || isNavigating.current) return;

    if (!isAuthenticated) {
      setHasRouted(true);
      router.push('/');
      return;
    }

    // Only show this page if user has merchantId
    if (!merchantId) {
      setHasRouted(true);
      router.push('/customer');
      return;
    }

    setIsLoading(false);
  }, [isAuthenticated, merchantId, router, hasRouted]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0F16]">
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
        title="myPiPOS"
        subtitle={`Welcome back, ${user?.piUsername}`}
      />

      <main className="container mx-auto px-6 py-12 flex-1">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-3xl shadow-glow mb-6">
              <Target className="w-6 h-6 text-brand-dark-950" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-4">
              Choose Your Mode
            </h2>
            <p className="text-lg text-brand-indigo-300 max-w-2xl mx-auto">
              You have access to both Merchant and Customer modes
            </p>
          </motion.div>

          {/* Mode Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Merchant Mode Card */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <button
                onClick={() => {
                  // Prevent multiple clicks
                  if (hasRouted || isNavigating.current) return;
                  isNavigating.current = true;
                  setHasRouted(true);

                  // Navigate first, then update context to prevent race conditions
                  router.push('/pos');
                  setTimeout(() => {
                    setContext('merchant');
                    isNavigating.current = false;
                  }, 50);
                }}
                className="glass-card p-8 text-left hover:shadow-glass transition-all duration-300 group w-full"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400 to-brand-cyan-600 rounded-2xl flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                      <Store className="w-6 h-6 text-brand-dark-950" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-display font-bold text-brand-indigo-100 mb-2">
                        Merchant Mode
                      </h3>
                    </div>
                  </div>

                  <p className="text-brand-indigo-300 mb-6 text-lg">
                    Manage products, sales, inventory, and business analytics
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-brand-indigo-400">
                      <div className="w-2 h-2 bg-brand-cyan-400 rounded-full"></div>
                      <span>Point of Sale (POS)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-indigo-400">
                      <div className="w-2 h-2 bg-brand-cyan-400 rounded-full"></div>
                      <span>Inventory Management</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-indigo-400">
                      <div className="w-2 h-2 bg-brand-cyan-400 rounded-full"></div>
                      <span>Sales Analytics</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-brand-indigo-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-brand-indigo-400">Go to Dashboard</span>
                      <ChevronRight className="w-5 h-5 text-brand-cyan-400" />
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>

            {/* Customer Mode Card */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <button
                onClick={() => {
                  // Prevent multiple clicks
                  if (hasRouted || isNavigating.current) return;
                  isNavigating.current = true;
                  setHasRouted(true);

                  // Navigate first, then update context to prevent race conditions
                  router.push('/customer');
                  setTimeout(() => {
                    setContext('customer');
                    isNavigating.current = false;
                  }, 50);
                }}
                className="glass-card p-8 text-left hover:shadow-glass transition-all duration-300 group w-full"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-500 to-brand-cyan-700 rounded-2xl flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                      <User className="w-6 h-6 text-brand-dark-950" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-display font-bold text-brand-indigo-100 mb-2">
                        Customer Mode
                      </h3>
                    </div>
                  </div>

                  <p className="text-brand-indigo-300 mb-6 text-lg">
                    Shop, pay with Pi Network, and manage your invoices
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-brand-indigo-400">
                      <div className="w-2 h-2 bg-brand-cyan-400 rounded-full"></div>
                      <span>Pay Invoices</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-indigo-400">
                      <div className="w-2 h-2 bg-brand-cyan-400 rounded-full"></div>
                      <span>View Order History</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-brand-indigo-400">
                      <div className="w-2 h-2 bg-brand-cyan-400 rounded-full"></div>
                      <span>QR Code Payment</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-brand-indigo-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-brand-indigo-400">Go to Customer Portal</span>
                      <ChevronRight className="w-5 h-5 text-brand-cyan-400" />
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          </div>

          {/* Quick Info */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-linear-to-br from-brand-cyan-400/10 to-brand-cyan-600/10 rounded-xl flex items-center justify-center border border-brand-cyan-700/30 shrink-0">
                <Target className="w-6 h-6 text-brand-cyan-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-display font-bold text-brand-indigo-100 mb-2">
                  Pro Tip
                </h4>
                <p className="text-sm text-brand-indigo-300">
                  You can quickly switch between modes anytime. Your current mode is always highlighted in the navigation.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
