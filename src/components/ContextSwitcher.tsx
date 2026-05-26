'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useState, useEffect } from 'react';

interface ContextSwitcherProps {
  className?: string;
}

export default function ContextSwitcher({ className = '' }: ContextSwitcherProps) {
  const router = useRouter();
  const { merchantId, currentContext, setContext, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Only show context switcher if user has a merchantId
  if (!merchantId) {
    return null;
  }

  const handleContextSwitch = (newContext: 'merchant' | 'customer') => {
    if (newContext === currentContext) return;

    setContext(newContext);

    // Smart routing - stay on current page if possible, redirect only if needed
    const currentPath = window.location.pathname;

    if (newContext === 'merchant') {
      // If currently on a customer-only page, go to merchant home
      if (currentPath === '/customer') {
        router.push('/mode-selection');
      }
      // Otherwise stay on current page (it might work for both contexts)
    } else {
      // If switching to customer
      if (currentPath.startsWith('/pos') || currentPath.startsWith('/ims') || currentPath === '/mode-selection') {
        router.push('/customer');
      }
      // Otherwise stay on current page
    }

    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (isOpen) {
      setIsAnimating(false);
      setTimeout(() => setIsOpen(false), 150);
    } else {
      setIsOpen(true);
      setTimeout(() => setIsAnimating(true), 10);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Mobile Dropdown */}
      <div className="md:hidden">
        <button
          onClick={toggleDropdown}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-lg transition-all duration-200 w-full justify-between"
          aria-label="Switch context"
        >
          <div className="flex items-center gap-2">
            {currentContext === 'merchant' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium">Merchant Mode</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Customer Mode</span>
              </>
            )}
          </div>
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className={`absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-purple-200 dark:border-purple-700 overflow-hidden z-50 transition-all duration-200 ${
              isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="p-2 space-y-1">
              <button
                onClick={() => handleContextSwitch('merchant')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  currentContext === 'merchant'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="font-medium">Merchant Mode</div>
                  <div className="text-xs opacity-70">Manage your business</div>
                </div>
                {currentContext === 'merchant' && (
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => handleContextSwitch('customer')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  currentContext === 'customer'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="font-medium">Customer Mode</div>
                  <div className="text-xs opacity-70">Shop and pay</div>
                </div>
                {currentContext === 'customer' && (
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Inline Buttons */}
      <div className="hidden md:flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 border border-purple-200 dark:border-purple-700">
        <button
          onClick={() => handleContextSwitch('merchant')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
            currentContext === 'merchant'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
          }`}
          aria-label="Switch to merchant mode"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="font-medium">Merchant</span>
        </button>

        <button
          onClick={() => handleContextSwitch('customer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
            currentContext === 'customer'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
          }`}
          aria-label="Switch to customer mode"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium">Customer</span>
        </button>
      </div>

      {/* Active Indicator */}
      <div className="mt-2 text-center md:hidden">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {currentContext === 'merchant' ? 'Managing business' : 'Shopping as customer'}
        </span>
      </div>
    </div>
  );
}
