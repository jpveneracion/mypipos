'use client';

import { useAuthStore } from '@/lib/store';
import ContextSwitcher from './ContextSwitcher';
import { useRouter } from 'next/navigation';

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
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="py-4">
          {/* Main Header Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="text-3xl">🥧</div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                  {title || 'myPiPOS'}
                </h1>
                {subtitle && (
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Right Side: Context Switcher & User Info */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Context Switcher - only shows if user has merchantId */}
              <ContextSwitcher />

              {/* User Info and Logout */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium text-gray-800 dark:text-white">
                      {user.piUsername}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {user.role}
                    </div>
                  </div>

                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-md">
                    {user.piUsername.charAt(0).toUpperCase()}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200"
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
