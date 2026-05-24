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

  const handleLoginSuccess = (method: string) => {
    if (method === 'credentials') {
      console.log('IMS login not implemented');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0F16] flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#1A1B29]/70 border-b border-[#363c4f]/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)' }}>
                <ShoppingBag className="w-6 h-6 text-[#0D0F16]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  myPiPOS
                </h1>
                <p className="text-xs text-[#9ea4b5] font-medium tracking-wide">
                  UNIVERSAL COMMERCE NETWORK
                </p>
              </div>
            </motion.div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowLoginModal(true)}
              className="border-[#363c4f] text-[#c5c9d4] hover:bg-[#1A1B29]/50"
            >
              Login
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-12 md:py-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#14D3C5]/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#14D3C5]/5 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-[#14D3C5]/10 text-[#14D3C5] px-6 py-2 rounded-full text-sm font-semibold mb-6 border border-[#14D3C5]/30">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live on Pi Network
            </div>

            <motion.h2
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold mb-6 text-[#e8eaf0] leading-tight break-words"
            >
              One Pi Account
              <br />
              <span style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Every Merchant</span>
            </motion.h2>

            <motion.p
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-[#9ea4b5] max-w-3xl mx-auto mb-8 leading-relaxed break-words"
            >
              Join the universal commerce network where Pioneers connect once and shop at every myPiPOS merchant worldwide — no re-registration, ever.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                size="lg"
                onClick={() => setShowLoginModal(true)}
                className="text-[#0D0F16] hover:opacity-90 font-semibold shadow-lg"
                style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)' }}
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Connect with Pi
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowLoginModal(true)}
                className="border-[#363c4f] text-[#c5c9d4] hover:bg-[#1A1B29]/50"
              >
                <Check className="w-5 h-5 mr-2" />
                Desktop Login
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto"
          >
            {[
              { icon: Globe, label: 'Global Reach', value: 'Millions' },
              { icon: LinkIcon, label: 'One Connection', value: 'Unlimited' },
              { icon: TrendingUp, label: 'Network Effect', value: 'Growing' },
              { icon: Diamond, label: 'Premium Users', value: 'Pi Pioneers' },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-[#1A1B29]/50 backdrop-blur-xl border border-[#363c4f]/50 rounded-2xl p-4 md:p-6 text-center hover:shadow-lg transition-all"
              >
                <stat.icon className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 md:mb-3 text-[#14D3C5]" />
                <div className="text-xl md:text-2xl font-bold text-[#e8eaf0] mb-1">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-[#768096] font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-20 px-6 bg-[#1A1B29]/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h3 className="text-3xl md:text-5xl font-bold mb-4 text-[#e8eaf0]">
              The Power of Universal Access
            </h3>
            <p className="text-lg md:text-xl text-[#9ea4b5] max-w-2xl mx-auto">
              Stop forcing customers to create new accounts. Join the network where one Pi account opens every door.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: ShoppingBag,
                title: 'Pioneers Connect Once',
                description: 'Customers create their Pi account once and instantly access every myPiPOS merchant — no more signup forms.',
              },
              {
                icon: Store,
                title: 'Merchants Grow Together',
                description: 'Every new merchant expands the customer base for everyone. Network effects work in your favor from day one.',
              },
              {
                icon: Rocket,
                title: 'Instant Market Access',
                description: 'Join myPiPOS and immediately tap into millions of Pi Pioneers worldwide — your customers are already here.',
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-[#1A1B29]/50 backdrop-blur-xl border border-[#363c4f]/50 rounded-2xl p-6 md:p-8 hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg" style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)' }}>
                  <benefit.icon className="w-7 h-7 md:w-8 md:h-8 text-[#0D0F16]" />
                </div>
                <h4 className="text-xl md:text-2xl font-bold mb-3 text-[#e8eaf0]">
                  {benefit.title}
                </h4>
                <p className="text-[#9ea4b5] leading-relaxed text-sm md:text-base">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="bg-[#1A1B29]/50 backdrop-blur-xl border border-[#363c4f]/50 rounded-3xl p-8 md:p-12"
          >
            <div className="text-center mb-8 md:mb-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-[#e8eaf0]">
                The Pioneer Experience
              </h3>
              <p className="text-lg md:text-xl text-[#9ea4b5]">
                One account. Endless possibilities. Zero friction.
              </p>
            </div>

            <div className="space-y-4 md:space-y-6">
              {[
                {
                  day: 'Monday',
                  merchant: 'Coffee Shop',
                  action: 'Create Pi account → Buy coffee → Profile created',
                  step: '1',
                },
                {
                  day: 'Tuesday',
                  merchant: 'Restaurant',
                  action: 'Same Pi login → Order lunch → No new account needed',
                  step: '2',
                },
                {
                  day: 'Wednesday',
                  merchant: 'Retail Store',
                  action: 'Same Pi login → Go shopping → Instant recognition',
                  step: '3',
                },
              ].map((journey, index) => (
                <motion.div
                  key={index}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-start gap-4 md:gap-6 p-4 md:p-6 bg-[#0D0F16]/50 rounded-2xl border border-[#363c4f]/50 hover:border-[#14D3C5]/50 transition-all"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[#0D0F16] font-bold text-base md:text-lg shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)' }}>
                    {journey.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs md:text-sm font-semibold text-[#14D3C5] uppercase tracking-wide">
                        {journey.day}
                      </span>
                      <span className="text-[#5a6378]">→</span>
                      <span className="font-semibold text-[#e8eaf0] truncate">
                        {journey.merchant}
                      </span>
                    </div>
                    <p className="text-[#9ea4b5] text-sm md:text-base break-words">
                      {journey.action}
                    </p>
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex items-start gap-4 md:gap-6 p-4 md:p-6 bg-green-900/20 backdrop-blur-xl rounded-2xl border-2 border-green-700/50"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[#0D0F16] font-bold text-base md:text-lg shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  <Check className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#e8eaf0] mb-2">
                    Result: Seamless Universal Experience
                  </div>
                  <p className="text-[#9ea4b5] text-sm md:text-base">
                    One account works at EVERY myPiPOS merchant, forever!
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-20 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #14D3C5, #11a79e)' }}>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="container mx-auto max-w-4xl relative z-10"
        >
          <div className="text-center">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 md:mb-6 text-[#0D0F16]">
              Ready to Join the Network?
            </h3>
            <p className="text-xl md:text-2xl text-[#0D0F16]/80 mb-8 md:mb-12 max-w-2xl mx-auto">
              Connect with millions of Pi Pioneers and transform how you do business.
            </p>

            <Button
              size="lg"
              onClick={() => setShowLoginModal(true)}
              className="bg-[#0D0F16] text-[#14D3C5] hover:bg-[#0D0F16]/90 px-10 md:px-12 py-4 md:py-5 text-lg md:text-xl shadow-lg"
            >
              <Rocket className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
              Get Started Now
            </Button>

            <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-8 md:mt-12 text-[#0D0F16]">
              {['Free to Start', 'Instant Access', 'Universal Base', 'Growing Network'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm md:text-base">
                  <Check className="w-4 h-4 md:w-5 md:h-5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="py-6 md:py-8 px-6 border-t border-[#363c4f]/50 bg-[#1A1B29]/30">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 text-[#9ea4b5] text-sm md:text-base">
              <span>Powered by</span>
              <span className="font-semibold text-[#c5c9d4]">Pi Network</span>
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-[#14D3C5]" />
            </div>

            <div className="flex gap-6 md:gap-8 text-sm text-[#9ea4b5]">
              <a href="#" className="hover:text-[#14D3C5] transition-colors font-medium">
                Privacy
              </a>
              <a href="#" className="hover:text-[#14D3C5] transition-colors font-medium">
                Terms
              </a>
              <a href="#" className="hover:text-[#14D3C5] transition-colors font-medium">
                Support
              </a>
              <a href="#" className="hover:text-[#14D3C5] transition-colors font-medium">
                About
              </a>
            </div>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
