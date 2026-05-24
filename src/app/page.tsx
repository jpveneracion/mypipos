'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import LoginModal from '@/components/auth/LoginModal';

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated, user, merchantId, currentContext } = useAuthStore();
  const [isRouting, setIsRouting] = useState(false);
  const router = useRouter();

  // Handle post-login routing
  useEffect(() => {
    if (isAuthenticated && user && !isRouting) {
      if (!user.onboardingComplete) {
        setIsRouting(true);
        router.push('/onboarding');
        return;
      }

      setIsRouting(true);

      if (merchantId) {
        router.push('/mode-selection');
      } else {
        router.push('/customer');
      }
    }
  }, [isAuthenticated, user, merchantId, router, isRouting]);

  const handleLoginSuccess = (method: string) => {
    if (method === 'credentials') {
      console.log('IMS login not implemented');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex flex-col">
      {/* Premium Glassmorphic Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-oceanic-900/70 border-b border-oceanic-100 dark:border-oceanic-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-oceanic-500 to-sky-600 rounded-xl flex items-center justify-center shadow-glass-lg">
                <span className="text-2xl">🥧</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
                  myPiPOS
                </h1>
                <p className="text-xs text-oceanic-700 dark:text-oceanic-300 font-medium tracking-wide">
                  UNIVERSAL COMMERCE NETWORK
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowLoginModal(true)}
              className="glassmorphism hover:bg-oceanic-50 dark:hover:bg-oceanic-900/50"
            >
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-oceanic-400/20 dark:bg-oceanic-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-400/20 dark:bg-sky-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-oceanic-100 dark:bg-oceanic-900/50 text-oceanic-800 dark:text-oceanic-200 px-6 py-2 rounded-full text-sm font-semibold mb-6 shadow-glass">
              <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></span>
              Live on Pi Network
            </div>

            <h2 className="text-5xl md:text-7xl font-bold mb-6 bg-linear-to-r from-oceanic-600 via-sky-600 to-oceanic-600 bg-clip-text text-transparent leading-tight">
              One Pi Account
              <br />
              <span className="text-oceanic-800 dark:text-oceanic-200">Every Merchant</span>
            </h2>

            <p className="text-xl md:text-2xl text-oceanic-700 dark:text-oceanic-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              Join the universal commerce network where Pioneers connect once and shop at every myPiPOS merchant worldwide — no re-registration, ever.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 text-lg shadow-glass-lg hover:shadow-glass-xl transform hover:scale-105 transition-all duration-300"
              >
                <span className="mr-2">🥧</span>
                Connect with Pi
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 text-lg border-2 border-oceanic-200 dark:border-oceanic-700 hover:bg-oceanic-50 dark:hover:bg-oceanic-900/30"
              >
                <span className="mr-2">🔐</span>
                Desktop Login
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: '🌍', label: 'Global Reach', value: 'Millions' },
              { icon: '🔗', label: 'One Connection', value: 'Unlimited' },
              { icon: '📈', label: 'Network Effect', value: 'Growing' },
              { icon: '💎', label: 'Premium Users', value: 'Pi Pioneers' },
            ].map((stat, index) => (
              <div
                key={index}
                className="glassmorphism rounded-2xl p-6 text-center hover:shadow-glass-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className="text-2xl font-bold text-oceanic-800 dark:text-oceanic-100 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-oceanic-600 dark:text-oceanic-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 px-6 bg-white/50 dark:bg-oceanic-950/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 text-oceanic-900 dark:text-oceanic-100">
              The Power of Universal Access
            </h3>
            <p className="text-xl text-oceanic-700 dark:text-oceanic-300 max-w-2xl mx-auto">
              Stop forcing customers to create new accounts. Join the network where one Pi account opens every door.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🥧',
                title: 'Pioneers Connect Once',
                description: 'Customers create their Pi account once and instantly access every myPiPOS merchant — no more signup forms.',
                color: 'from-oceanic-500 to-sky-500',
              },
              {
                icon: '🏪',
                title: 'Merchants Grow Together',
                description: 'Every new merchant expands the customer base for everyone. Network effects work in your favor from day one.',
                color: 'from-sky-500 to-oceanic-500',
              },
              {
                icon: '🚀',
                title: 'Instant Market Access',
                description: 'Join myPiPOS and immediately tap into millions of Pi Pioneers worldwide — your customers are already here.',
                color: 'from-oceanic-600 to-sky-600',
              },
            ].map((benefit, index) => (
              <div
                key={index}
                className="glassmorphism rounded-2xl p-8 hover:shadow-glass-lg transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-glass`}>
                  {benefit.icon}
                </div>
                <h4 className="text-2xl font-bold mb-3 text-oceanic-900 dark:text-oceanic-100">
                  {benefit.title}
                </h4>
                <p className="text-oceanic-700 dark:text-oceanic-300 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Journey Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="glassmorphism rounded-3xl p-12 bg-linear-to-br from-oceanic-50 to-sky-50 dark:from-oceanic-900/30 dark:to-sky-900/30">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold mb-4 text-oceanic-900 dark:text-oceanic-100">
                The Pioneer Experience
              </h3>
              <p className="text-xl text-oceanic-700 dark:text-oceanic-300">
                One account. Endless possibilities. Zero friction.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  day: 'Monday',
                  merchant: 'Coffee Shop',
                  action: 'Create Pi account → Buy coffee → Profile created',
                  color: 'oceanic',
                  step: '1',
                },
                {
                  day: 'Tuesday',
                  merchant: 'Restaurant',
                  action: 'Same Pi login → Order lunch → No new account needed',
                  color: 'sky',
                  step: '2',
                },
                {
                  day: 'Wednesday',
                  merchant: 'Retail Store',
                  action: 'Same Pi login → Go shopping → Instant recognition',
                  color: 'oceanic',
                  step: '3',
                },
              ].map((journey, index) => (
                <div
                  key={index}
                  className="flex items-start gap-6 p-6 bg-white dark:bg-oceanic-900/50 rounded-2xl shadow-glass hover:shadow-glass-lg transition-all"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br from-${journey.color}-500 to-${journey.color}-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-glass`}>
                    {journey.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-oceanic-600 dark:text-oceanic-400 uppercase tracking-wide">
                        {journey.day}
                      </span>
                      <span className="text-oceanic-300 dark:text-oceanic-600">→</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">
                        {journey.merchant}
                      </span>
                    </div>
                    <p className="text-oceanic-700 dark:text-oceanic-300">
                      {journey.action}
                    </p>
                  </div>
                </div>
              ))}

              <div className="flex items-start gap-6 p-6 bg-gradient-to-r from-success-50 to-emerald-50 dark:from-success-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-success-200 dark:border-success-800">
                <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-glass">
                  ✓
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-oceanic-900 dark:text-oceanic-100 mb-2">
                    Result: Seamless Universal Experience
                  </div>
                  <p className="text-oceanic-700 dark:text-oceanic-300">
                    One account works at EVERY myPiPOS merchant, forever!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-linear-to-br from-oceanic-600 via-sky-600 to-oceanic-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="text-center">
            <h3 className="text-5xl font-bold mb-6 text-white">
              Ready to Join the Network?
            </h3>
            <p className="text-2xl text-oceanic-100 mb-12 max-w-2xl mx-auto">
              Connect with millions of Pi Pioneers and transform how you do business.
            </p>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowLoginModal(true)}
              className="px-12 py-5 text-xl shadow-glass-xl hover:shadow-glass-2xl transform hover:scale-105 transition-all duration-300"
            >
              <span className="mr-3">🥧</span>
              Get Started Now
            </Button>

            <div className="flex flex-wrap justify-center gap-8 mt-12 text-oceanic-100">
              {['Free to Start', 'Instant Access', 'Universal Base', 'Growing Network'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="text-success-300">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-oceanic-100 dark:border-oceanic-800 bg-white/50 dark:bg-oceanic-950/50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-oceanic-700 dark:text-oceanic-300">
              <span>Powered by</span>
              <span className="font-semibold">Pi Network</span>
              <span className="text-oceanic-600">🥧</span>
            </div>

            <div className="flex gap-8 text-sm text-oceanic-600 dark:text-oceanic-400">
              <a href="#" className="hover:text-oceanic-900 dark:hover:text-oceanic-200 transition-colors font-medium">
                Privacy
              </a>
              <a href="#" className="hover:text-oceanic-900 dark:hover:text-oceanic-200 transition-colors font-medium">
                Terms
              </a>
              <a href="#" className="hover:text-oceanic-900 dark:hover:text-oceanic-200 transition-colors font-medium">
                Support
              </a>
              <a href="#" className="hover:text-oceanic-900 dark:hover:text-oceanic-200 transition-colors font-medium">
                About
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
