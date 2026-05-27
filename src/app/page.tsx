'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import FeatureSlider from '@/components/ui/FeatureSlider';
import LoginModal from '@/components/auth/LoginModal';
import { AnimatedLogo } from '@/components/brand/AnimatedLogo';

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated, user, merchantId, currentContext } = useAuthStore();
  const [isRouting, setIsRouting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only run routing logic if we're actually on the home page
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      return;
    }

    if (isAuthenticated && user && !isRouting) {
      setIsRouting(true);

      // Check if user has completed onboarding
      if (!user.onboardingComplete) {
        router.push('/onboarding');
        return;
      }

      // Onboarding complete - route based on merchant status
      if (merchantId) {
        router.push('/mode-selection');
      } else {
        router.push('/customer');
      }
    }
  }, [isAuthenticated, user, merchantId, router, isRouting]);

  const handleLoginSuccess = (method: string) => {
    console.log('Login successful:', method);
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">

      {/* Splash Screen Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="py-8 px-6 relative z-20">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <AnimatedLogo size={48} />
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#14D3C5] to-[#11a79e]">
                  myPiPOS
                </h1>
                <p className="text-xs text-brand-indigo-300">
                  Universal Pi Commerce Network 🌍
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLoginModal(true)}
              className="glass-card px-6 py-2 rounded-full font-medium transition-all hover:scale-105 text-white"
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
            <div className="glass-card rounded-2xl p-8 mb-8 shadow-glass-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#14D3C5]/10 to-[#11a79e]/10"></div>
              <div className="relative z-10 text-center text-white">
                <div className="text-6xl mb-4">🌍</div>
                <h2 className="text-3xl font-bold mb-4">
                  One Pi Account = Every myPiPOS Merchant
                </h2>
                <p className="text-xl mb-6 text-brand-indigo-200">
                  Pioneers create ONE customer account that works at ALL myPiPOS merchants - no re-registration needed!
                </p>

                <div className="glass-card rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                  <p className="text-sm font-semibold mb-2">🎯 How it works:</p>
                  <p className="text-sm text-brand-indigo-200">
                    Shop at Merchant A today → Visit Merchant B tomorrow → <strong className="text-white">Same account, no new signup</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className="glass-card rounded-lg p-4">
                    <div className="text-3xl font-bold">🥧</div>
                    <div className="text-sm font-medium">Pioneers connect once</div>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <div className="text-3xl font-bold">🏪</div>
                    <div className="text-sm font-medium">Access all merchants</div>
                  </div>
                  <div className="glass-card rounded-lg p-4">
                    <div className="text-3xl font-bold">🚀</div>
                    <div className="text-sm font-medium">No new accounts needed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main CTA */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Join the Universal Pi Commerce Network
              </h2>
              <p className="text-xl text-brand-indigo-200 mb-8">
                Connect with millions of Pi Pioneers and merchants worldwide
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="btn-cyan text-lg font-bold py-4 px-8 rounded-full shadow-glow transform transition hover:scale-105"
                >
                  🥧 Get Started with Pi
                </button>

                <button
                  onClick={() => setShowLoginModal(true)}
                  className="glass-card text-white font-bold py-4 px-8 rounded-full text-lg transform transition hover:scale-105 border-2 border-[#14D3C5]/30 hover:border-[#14D3C5]/60"
                >
                  🔐 Desktop IMS Login
                </button>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
              <div className="glass-card rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-sm font-semibold text-white">Instant Setup</div>
                <div className="text-xs text-brand-indigo-300">Start selling in minutes</div>
              </div>
              <div className="glass-card rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🔒</div>
                <div className="text-sm font-semibold text-white">Secure Pi Auth</div>
                <div className="text-xs text-brand-indigo-300">Blockchain-protected</div>
              </div>
              <div className="glass-card rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🌐</div>
                <div className="text-sm font-semibold text-white">Global Network</div>
                <div className="text-xs text-brand-indigo-300">Millions of Pioneers</div>
              </div>
              <div className="glass-card rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-sm font-semibold text-white">Pi Payments</div>
                <div className="text-xs text-brand-indigo-300">Native cryptocurrency</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-brand-indigo-400 text-sm">
              <p>© 2026 myPiPOS - Universal Pi Commerce Network</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
