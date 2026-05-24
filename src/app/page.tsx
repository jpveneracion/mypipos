'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import LoginModal from '@/components/auth/LoginModal';
import {
  Globe,
  Link as LinkIcon,
  TrendingUp,
  Diamond,
  Store,
  Rocket,
  ShoppingBag,
  Check,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 }
};

interface LoginButtonProps {
  isLoading: boolean;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}

function LoginButton({ isLoading, disabled, onClick, className = '' }: LoginButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 md:px-8 py-3 md:py-4 rounded-xl text-base font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${className}`}
      style={{
        background: 'linear-gradient(135deg, #14D3C5, #11a79e)',
        color: '#0D0F16'
      }}
    >
      {isLoading ? 'Connecting to Pi...' : 'Login with Pi'}
    </button>
  );
}

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated, user, merchantId, currentContext } = useAuthStore();
  const [isRouting, setIsRouting] = useState(false);
  const router = useRouter();

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

  const handleLogin = async () => {
    setShowLoginModal(true);
  };

  const scrollToFlow = () => {
    document.getElementById('flow')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden pb-[env(safe-area-inset-bottom)]">

      {/* Navbar */}
      <nav className="relative z-20 px-2 sm:px-4 md:px-8 py-8">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{
              y: [0, -8, 0],
              opacity: [0, 1, 1],
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut"
            }}
            className="relative flex justify-center items-center gap-4"
          >
            <div className="w-12 h-12 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)' }}>
              <ShoppingBag className="w-6 h-6 text-[#0D0F16]" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-display font-bold text-white">myPiPOS</h1>
              <p className="text-xs text-brand-indigo-400 uppercase tracking-widest">
                Universal Commerce Network
              </p>
            </div>
          </motion.div>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowLoginModal(true)}
            className="border-brand-indigo-700 text-brand-indigo-300 hover:bg-brand-indigo-900/30"
          >
            Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-2 sm:px-4 md:px-8 py-12 md:py-24">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6 }}
            >
              <motion.h1
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-6"
              >
                One Pi account,{' '}
                <span className="text-cyan-shimmer">every myPiPOS merchant.</span>
              </motion.h1>

              <motion.p
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="font-body text-brand-indigo-200 text-base md:text-lg mb-8 leading-relaxed max-w-xl"
              >
                Join the universal commerce network where Pioneers connect once and shop at every myPiPOS merchant worldwide — no re-registration, ever.
              </motion.p>

              <motion.div
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4"
              >
                <LoginButton
                  isLoading={false}
                  disabled={false}
                  onClick={handleLogin}
                />
                <button
                  onClick={scrollToFlow}
                  className="px-6 md:px-8 py-3 md:py-4 rounded-xl text-base font-semibold border border-brand-indigo-700 text-brand-indigo-300 hover:border-brand-indigo-600 hover:text-brand-indigo-200 transition-all"
                >
                  View How It Works <LinkIcon className="inline ml-2" size={18} />
                </button>
              </motion.div>
            </motion.div>

            {/* Right - Empty/Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              {/* Placeholder for future visual element */}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Status Strip */}
      <section className="relative z-10 px-2 sm:px-4 md:px-8 py-6 border-y border-brand-indigo-800/50">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-start gap-3 md:gap-8">
            <div className="flex items-center gap-2 text-sm">
              <span>🚀</span>
              <span className="text-brand-indigo-300">Premium UI transformation complete</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-brand-indigo-700" />
            <div className="flex items-center gap-2 text-sm">
              <span>✅</span>
              <span className="text-brand-indigo-300">Professional myPiroll design system applied</span>
            </div>
          </div>
        </div>
      </section>

      {/* Current Flow Section */}
      <section id="flow" className="relative z-10 px-2 sm:px-4 md:px-8 py-16 md:py-24 bg-brand-indigo-900/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              How Universal Commerce Works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              { step: '1', text: 'Create your Pi account once' },
              { step: '2', text: 'Shop at any myPiPOS merchant' },
              { step: '3', text: 'No re-registration needed' },
              { step: '4', text: 'Pay seamlessly with Pi' },
              { step: '5', text: 'Build your purchase history' },
              { step: '6', text: 'Access everywhere, forever' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-brand-indigo-900/30 backdrop-blur-xl border border-brand-indigo-800/50 rounded-xl p-4 md:p-5"
              >
                <span className="inline-block px-3 py-1 rounded-lg text-sm font-bold mb-3" style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)', color: '#0D0F16' }}>
                  {item.step}
                </span>
                <p className="font-body text-brand-indigo-200 text-sm leading-relaxed">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-body text-brand-indigo-400 text-sm text-center mt-8"
          >
            One account. Every merchant. Unlimited possibilities.
          </motion.p>
        </div>
      </section>

      {/* Footer Line */}
      <section className="relative z-10 px-2 sm:px-4 md:px-8 py-12 border-t border-brand-indigo-800/50">
        <div className="max-w-7xl mx-auto">
          <p className="font-body text-brand-indigo-400 text-sm text-center">
            Built with premium design inspired by myPiroll. Powered by Pi Network.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-6 text-xs text-brand-indigo-500">
            <span>© 2026 myPiPOS</span>
            <span className="hidden md:inline">•</span>
            <a href="#" className="hover:text-brand-indigo-300 transition-colors">Terms of Service</a>
            <span className="hidden md:inline">•</span>
            <a href="#" className="hover:text-brand-indigo-300 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {}}
      />
    </div>
  );
}
