'use client';

import { useAuthStore } from '@/lib/store';
import ContextSwitcher from './ContextSwitcher';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { AnimatedLogoSmall } from './brand/AnimatedLogo';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="glass-card border-b border-[#14D3C5]/20 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="py-4">
          {/* Main Header Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <AnimatedLogoSmall size={40} />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  {title || 'myPiPOS'}
                </h1>
                {subtitle && (
                  <p className="text-xs md:text-sm text-brand-indigo-200">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Right Side: Context Switcher & User Info */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Settings Link */}
              {isAuthenticated && (
                <Link
                  href="/account-settings"
                  className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-[#14D3C5]/20 text-brand-indigo-300 hover:text-white transition-colors"
                  title="Account Settings"
                >
                  <Settings className="h-5 w-5" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              )}

              {/* Context Switcher - only shows if user has merchantId */}
              <ContextSwitcher />

              {/* User Info and Logout */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-white">
                      {user.piUsername}
                    </div>
                    <div className="text-xs text-brand-indigo-400 capitalize">
                      {user.role}
                    </div>
                  </div>

                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#14D3C5] to-[#11a79e] rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-glow">
                    {user.piUsername.charAt(0).toUpperCase()}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-brand-indigo-400 hover:text-red-400 transition-colors duration-200"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
