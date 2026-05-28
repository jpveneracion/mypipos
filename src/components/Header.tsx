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

  const handleLogout = async () => {
    try {
      // First clear Pi session if exists
      if (typeof window !== 'undefined' && localStorage.getItem('pi_auth_session')) {
        localStorage.removeItem('pi_auth_session');
      }

      // Then call logout function
      logout();

      // Navigate to home
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation even if error occurs
      router.push('/');
    }
  };

  return (
    <header className="glass-card border-b border-[#14D3C5]/20 sticky top-0 z-40">
      <div className="px-4 md:px-6">
        <div className="py-3">
          {/* Main Header Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <AnimatedLogoSmall size={36} />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">
                  {title || 'myPiPOS'}
                </h1>
                {subtitle && (
                  <p className="text-xs text-brand-indigo-300">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Right Side: Context Switcher & User Info */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Settings Link */}
              {isAuthenticated && (
                <Link
                  href="/account-settings"
                  className="hidden sm:flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-[#14D3C5]/20 text-brand-indigo-300 hover:text-white transition-colors"
                  title="Account Settings"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Settings</span>
                </Link>
              )}

              {/* Context Switcher - only shows if user has merchantId */}
              <ContextSwitcher />

              {/* User Info and Logout */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <div className="text-xs font-medium text-white">
                      {user.piUsername}
                    </div>
                    <div className="text-xs text-brand-indigo-400 capitalize">
                      {user.role}
                    </div>
                  </div>

                  <div className="w-7 h-7 bg-gradient-to-br from-[#14D3C5] to-[#11a79e] rounded-full flex items-center justify-center text-white font-bold text-xs shadow-glow">
                    {user.piUsername.charAt(0).toUpperCase()}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-brand-indigo-400 hover:text-red-400 transition-colors duration-200"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
