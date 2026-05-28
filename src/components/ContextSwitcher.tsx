'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useState, useEffect, useRef, useCallback } from 'react';

interface ContextSwitcherProps {
  className?: string;
}

export default function ContextSwitcher({ className = '' }: ContextSwitcherProps) {
  const router = useRouter();
  const { merchantId, currentContext, setContext, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const isNavigating = useRef(false);

  // Only show context switcher if user has a merchantId
  if (!merchantId) {
    return null;
  }

  const handleContextSwitch = useCallback((newContext: 'merchant' | 'customer') => {
    if (newContext === currentContext || isNavigating.current) return;

    isNavigating.current = true;

    // Smart routing - stay on current page if possible, redirect only if needed
    const currentPath = window.location.pathname;

    // First navigate, then update context to prevent race conditions
    if (newContext === 'merchant') {
      // Stay on current page unless it's customer-only
      if (currentPath === '/customer') {
        router.push('/mode-selection');
      } else {
        // Just update context, no navigation needed
        setContext(newContext);
        isNavigating.current = false;
        return;
      }
    } else {
      // Switching to customer - redirect from POS/IMS to customer
      if (currentPath.startsWith('/pos') || currentPath.startsWith('/ims') || currentPath === '/mode-selection') {
        router.push('/customer');
      } else {
        // Just update context, no navigation needed
        setContext(newContext);
        isNavigating.current = false;
        return;
      }
    }

    // Update context after navigation starts
    setTimeout(() => {
      setContext(newContext);
      isNavigating.current = false;
    }, 100);

    setIsOpen(false);
  }, [currentContext, router, setContext]);

  // Reset navigation flag after route changes
  useEffect(() => {
    const resetNavFlag = () => {
      isNavigating.current = false;
    };

    // Listen for route changes to reset the navigation flag
    window.addEventListener('popstate', resetNavFlag);
    return () => window.removeEventListener('popstate', resetNavFlag);
  }, []);

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
          className="flex items-center gap-2 px-3 py-1.5 btn-cyan text-sm rounded-lg transition-all duration-200 w-full justify-between"
          aria-label="Switch context"
        >
          <div className="flex items-center gap-2">
            {currentContext === 'merchant' ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium text-xs">Merchant</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium text-xs">Customer</span>
              </>
            )}
          </div>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className={`absolute top-full left-0 right-0 mt-1 glass-card rounded-lg shadow-glass-xl border border-[#14D3C5]/30 overflow-hidden z-50 transition-all duration-200 ${
              isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="p-1 space-y-1">
              <button
                onClick={() => handleContextSwitch('merchant')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all duration-200 ${
                  currentContext === 'merchant'
                    ? 'bg-[#14D3C5] text-white'
                    : 'text-brand-indigo-200 hover:bg-[#14D3C5]/20'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="font-medium text-white text-xs">Merchant Mode</div>
                  <div className="text-xs text-brand-indigo-400">Manage your business</div>
                </div>
              </button>

              <button
                onClick={() => handleContextSwitch('customer')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all duration-200 ${
                  currentContext === 'customer'
                    ? 'bg-[#14D3C5] text-white'
                    : 'text-brand-indigo-200 hover:bg-[#14D3C5]/20'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="font-medium text-white text-xs">Customer Mode</div>
                  <div className="text-xs text-brand-indigo-400">Shop and pay</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Inline Buttons */}
      <div className="hidden md:flex items-center gap-1 glass-card rounded-lg p-1 border border-[#14D3C5]/20">
        <button
          onClick={() => handleContextSwitch('merchant')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${
            currentContext === 'merchant'
              ? 'bg-[#14D3C5] text-white'
              : 'text-brand-indigo-200 hover:bg-[#14D3C5]/20'
          }`}
          aria-label="Switch to merchant mode"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="font-medium text-xs">Merchant</span>
        </button>

        <button
          onClick={() => handleContextSwitch('customer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${
            currentContext === 'customer'
              ? 'bg-[#14D3C5] text-white'
              : 'text-brand-indigo-200 hover:bg-[#14D3C5]/20'
          }`}
          aria-label="Switch to customer mode"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium text-xs">Customer</span>
        </button>
      </div>
    </div>
  );
}
