'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import FeatureSlider from '@/components/ui/FeatureSlider';
import LoginModal from '@/components/auth/LoginModal';

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated, user, merchantId, currentContext, setAuth } = useAuthStore();
  const [isRouting, setIsRouting] = useState(false);
  const router = useRouter();

  // Handle post-login routing
  useEffect(() => {
    if (isAuthenticated && user && !isRouting) {
      // Check if user needs onboarding first
      if (!user.onboardingComplete) {
        console.log('👋 User needs onboarding - redirecting');
        setIsRouting(true);
        router.push('/onboarding');
        return;
      }

      setIsRouting(true);

      // Route based on merchant_id - send merchants to mode selection
      if (merchantId) {
        // User is a merchant - go to mode selection first
        router.push('/mode-selection');
      } else {
        // User is not a merchant - go to customer dashboard
        router.push('/customer');
      }
    }
  }, [isAuthenticated, user, merchantId, router, isRouting]);

  const handleLoginSuccess = (method: string) => {
    if (method === 'credentials') {
      // Desktop IMS login - not implemented yet
      console.log('IMS login not implemented');
    } else {
      // Pi Network login - auth store will be updated by PiAuthButton
      // The useEffect above will handle routing
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 via-white to-secondary-50 flex flex-col text-neutral-800">
      {/* Splash Screen Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="py-8 px-6">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-r from-primary-600 to-secondary-600 rounded-xl flex items-center justify-center shadow-soft">
                <span className="text-2xl">🥧</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">
                  myPiPOS
                </h1>
                <p className="text-xs text-neutral-600">
                  Universal Pi Commerce Network 🌍
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-white hover:bg-neutral-50 text-neutral-800 px-6 py-2 rounded-full font-medium shadow-soft transition-all hover:scale-105 border border-neutral-200"
            >
              Login
            </button>
          </div>
        </header>

        {/* Feature Slider */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-6xl">
            <FeatureSlider />
          </div>
        </div>

        {/* Bottom CTA Section */}
        <div className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            {/* Universal Customer Base Banner */}
            <div className="bg-linear-to-r from-primary-600 via-secondary-600 to-primary-600 rounded-2xl p-8 mb-8 shadow-strong relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10"></div>
              <div className="relative z-10 text-center text-white">
                <div className="text-6xl mb-4">🌍</div>
                <h2 className="text-3xl font-bold mb-4">
                  One Pi Account = Every myPiPOS Merchant
                </h2>
                <p className="text-xl mb-6 text-primary-100">
                  Pioneers create ONE customer account that works at ALL myPiPOS merchants - no re-registration needed!
                </p>

                <div className="bg-white/10 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                  <p className="text-sm font-semibold mb-2">🎯 How it works:</p>
                  <p className="text-sm text-primary-100">
                    Shop at Merchant A today → Visit Merchant B tomorrow → <strong className="text-white">Same account, no new signup</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl font-bold">🥧</div>
                    <div className="text-sm font-medium">Pioneers connect once</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl font-bold">🏪</div>
                    <div className="text-sm font-medium">Access all merchants</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl font-bold">🚀</div>
                    <div className="text-sm font-medium">No new accounts needed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main CTA */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-neutral-800 mb-4">
                Join the Universal Pi Commerce Network
              </h2>
              <p className="text-xl text-neutral-600 mb-8">
                Connect with millions of Pi Pioneers and merchants worldwide
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-linear-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white font-bold py-4 px-8 rounded-full text-lg shadow-strong transform transition hover:scale-105"
                >
                  🥧 Get Started with Pi
                </button>

                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-white hover:bg-neutral-50 text-neutral-800 font-bold py-4 px-8 rounded-full text-lg shadow-soft transform transition hover:scale-105 border-2 border-primary-200"
                >
                  🔐 Desktop IMS Login
                </button>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
              <div className="bg-white rounded-lg p-4 shadow-soft text-center">
                <div className="text-3xl mb-2">🌐</div>
                <div className="text-sm font-semibold text-neutral-800">Global Reach</div>
                <div className="text-xs text-neutral-600">Millions of Pioneers</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-soft text-center">
                <div className="text-3xl mb-2">🔗</div>
                <div className="text-sm font-semibold text-neutral-800">One Connection</div>
                <div className="text-xs text-neutral-600">Unlimited Merchants</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-soft text-center">
                <div className="text-3xl mb-2">📈</div>
                <div className="text-sm font-semibold text-neutral-800">Network Effect</div>
                <div className="text-xs text-neutral-600">Growing Daily</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-soft text-center">
                <div className="text-3xl mb-2">💎</div>
                <div className="text-sm font-semibold text-neutral-800">Premium Users</div>
                <div className="text-xs text-neutral-600">Pi Network Community</div>
              </div>
            </div>

            {/* Customer Journey Example */}
            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-neutral-800 mb-4 text-center">
                🎯 Pioneer Experience: One Account, Endless Shopping
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                  <div>
                    <div className="font-semibold text-neutral-800">Monday - Coffee Shop</div>
                    <div className="text-neutral-600">Create Pi account → Buy coffee → Profile created</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-secondary-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                  <div>
                    <div className="font-semibold text-neutral-800">Tuesday - Restaurant</div>
                    <div className="text-neutral-600">Same Pi login → Order lunch → No new account needed</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                  <div>
                    <div className="font-semibold text-neutral-800">Wednesday - Retail Store</div>
                    <div className="text-neutral-600">Same Pi login → Go shopping → Instant recognition</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-success-600 text-white rounded-full flex items-center justify-center shrink-0 font-bold">✓</div>
                  <div>
                    <div className="font-semibold text-neutral-800">Result: Seamless Universal Experience</div>
                    <div className="text-neutral-600">One account works at EVERY myPiPOS merchant, forever!</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-neutral-600">
              <div className="flex items-center gap-2">
                <span className="text-success-600">✓</span>
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-success-600">✓</span>
                <span>Instant customer access</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-success-600">✓</span>
                <span>Universal customer base</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-success-600">✓</span>
                <span>Network growth</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-neutral-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="font-semibold">Pi Network</span>
            <span className="text-primary-600">🥧</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-primary-600 transition-colors">Support</a>
            <a href="#" className="hover:text-primary-600 transition-colors">About</a>
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
