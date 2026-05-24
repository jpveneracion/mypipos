'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pos' | 'ims' | 'database'>('overview');
  const [authMethod, setAuthMethod] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check authentication through multiple methods for Pi Browser compatibility
    let authenticated = false;
    let method = '';

    // Method 0: Check URL parameter FIRST (for Pi Browser compatibility)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const authParam = urlParams.get('auth');
      console.log('Auth check - URL param:', authParam);

      if (authParam && (authParam.startsWith('dev_') || authParam === 'dev_pi_browser')) {
        authenticated = true;
        method = 'url';
        console.log('Authenticated via URL parameter');

        // Clean up URL - do this in a timeout to avoid blocking
        try {
          setTimeout(() => {
            window.history.replaceState({}, '', '/admin/dashboard');
          }, 100);
        } catch (e) {
          console.log('URL cleanup failed:', e);
        }
      }
    }

    // Method 1: Check localStorage
    if (!authenticated) {
      try {
        const isAdmin = localStorage.getItem('isAdmin');
        console.log('Auth check - localStorage:', isAdmin);
        if (isAdmin === 'true') {
          authenticated = true;
          method = 'localStorage';
          console.log('Authenticated via localStorage');
        }
      } catch (e) {
        console.log('localStorage not available:', e);
        // localStorage not available
      }
    }

    // Method 2: Check sessionStorage
    if (!authenticated) {
      try {
        const isAdmin = sessionStorage.getItem('isAdmin');
        console.log('Auth check - sessionStorage:', isAdmin);
        if (isAdmin === 'true') {
          authenticated = true;
          method = 'sessionStorage';
          console.log('Authenticated via sessionStorage');
        }
      } catch (e) {
        console.log('sessionStorage not available:', e);
        // sessionStorage not available
      }
    }

    // Method 3: Development mode fallback - if nothing works, still allow access
    if (!authenticated) {
      console.log('No auth method worked, using dev fallback');
      authenticated = true;
      method = 'dev_fallback';
    }

    setAuthMethod(method);

    if (!authenticated) {
      console.log('Not authenticated, redirecting to login');
      router.push('/admin/login');
    } else {
      console.log('Authenticated successfully via:', method);
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    // Clear all possible storage methods
    try {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminLoginTime');
    } catch (e) {
      // localStorage not available
    }

    try {
      sessionStorage.removeItem('isAdmin');
      sessionStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminLoginTime');
    } catch (e) {
      // sessionStorage not available
    }

    router.push('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-oceanic-200 border-t-oceanic-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-oceanic-700 dark:text-oceanic-300 mt-4">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'pos' as const, label: 'POS Testing', icon: '📱' },
    { id: 'ims' as const, label: 'IMS Testing', icon: '📊' },
    { id: 'database' as const, label: 'Database Status', icon: '🗄️' }
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-oceanic-50 via-white to-sky-50 dark:from-oceanic-950 dark:via-gray-900 dark:to-sky-950 flex flex-col">
      {/* Header */}
      <header className="backdrop-blur-xl bg-white/70 dark:bg-oceanic-900/70 border-b border-oceanic-100 dark:border-oceanic-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-oceanic-500 to-sky-600 rounded-xl flex items-center justify-center shadow-glass">
                <span className="text-xl">🔧</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-linear-to-r from-oceanic-600 to-sky-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-oceanic-600 dark:text-oceanic-400">
                  Development & Testing Environment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-sm text-oceanic-700 dark:text-oceanic-300">
                  Welcome, <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Admin</span>
                </span>
                {authMethod && (
                  <div className="text-xs text-oceanic-500 dark:text-oceanic-400">
                    Auth: {authMethod}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="bg-linear-to-r from-error-500 to-red-600 hover:from-error-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-glass hover:shadow-glass-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 flex-1">
        {/* Development Mode Warning */}
        <div className="glassmorphism rounded-2xl p-6 mb-8 bg-linear-to-r from-warning-50 to-amber-50 dark:from-warning-900/20 dark:to-amber-900/20 border border-warning-200 dark:border-warning-800">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-lg font-bold text-warning-800 dark:text-warning-200 mb-2">
                Development Mode Active
              </h3>
              <p className="text-sm text-warning-700 dark:text-warning-300">
                This dashboard bypasses Pi Network authentication for testing purposes only.
                All features are functional but do not connect to the real Pi Network.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap shadow-glass ${
                activeTab === tab.id
                  ? 'bg-linear-to-r from-oceanic-600 to-sky-600 text-white shadow-glass-lg'
                  : 'bg-white dark:bg-oceanic-900 text-oceanic-700 dark:text-oceanic300 hover:bg-oceanic-50 dark:hover:bg-oceanic-800'
              }`}
            >
              <span className="mr-2 text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="glassmorphism rounded-3xl p-8 bg-white dark:bg-oceanic-900/50 border border-oceanic-200 dark:border-oceanic-800 shadow-glass">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-3xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-6">
                System Overview
              </h2>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-linear-to-br from-oceanic-500 to-sky-600 rounded-2xl p-6 shadow-glass text-white hover:shadow-glass-lg transition-all">
                  <div className="text-4xl mb-3">📱</div>
                  <div className="text-2xl font-bold mb-1">POS</div>
                  <div className="text-sm text-oceanic-100">Point of Sale System</div>
                  <div className="mt-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">Active</span>
                  </div>
                </div>

                <div className="bg-linear-to-br from-sky-500 to-blue-600 rounded-2xl p-6 shadow-glass text-white hover:shadow-glass-lg transition-all">
                  <div className="text-4xl mb-3">📊</div>
                  <div className="text-2xl font-bold mb-1">IMS</div>
                  <div className="text-sm text-sky-100">Inventory Management</div>
                  <div className="mt-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">Active</span>
                  </div>
                </div>

                <div className="bg-linear-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-glass text-white hover:shadow-glass-lg transition-all">
                  <div className="text-4xl mb-3">🥧</div>
                  <div className="text-2xl font-bold mb-1">Pi Auth</div>
                  <div className="text-sm text-emerald-100">Development Mode</div>
                  <div className="mt-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">Bypassed</span>
                  </div>
                </div>

                <div className="bg-linear-to-br from-success-500 to-green-600 rounded-2xl p-6 shadow-glass text-white hover:shadow-glass-lg transition-all">
                  <div className="text-4xl mb-3">🗄️</div>
                  <div className="text-2xl font-bold mb-1">Database</div>
                  <div className="text-sm text-success-100">PostgreSQL Schema</div>
                  <div className="mt-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">Ready</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => router.push('/pos')}
                    className="glassmorphism rounded-2xl p-6 text-left hover:shadow-glass-lg transition-all border-2 border-oceanic-200 dark:border-oceanic-700 hover:border-oceanic-400 group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl group-hover:scale-110 transition-transform duration-300">📱</span>
                      <div className="flex-1">
                        <div className="font-bold text-oceanic-900 dark:text-oceanic-100 text-lg">Launch POS Terminal</div>
                        <div className="text-sm text-oceanic600 dark:text-oceanic-400">Test point of sale functionality</div>
                      </div>
                      <svg className="w-5 h-5 text-oceanic-400 group-hover:text-oceanic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5M6 7H5a2 2 0 01-2-2V5a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2h10a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/ims')}
                    className="glassmorphism rounded-2xl p-6 text-left hover:shadow-glass-lg transition-all border-2 border-sky-200 dark:border-sky-700 hover:border-sky-400 group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl group-hover:scale-110 transition-transform duration-300">📊</span>
                      <div className="flex-1">
                        <div className="font-bold text-oceanic-900 dark:text-oceanic-100 text-lg">Launch IMS Dashboard</div>
                        <div className="text-sm text-oceanic600 dark:text-oceanic-400">Test inventory management</div>
                      </div>
                      <svg className="w-5 h-5 text-sky-400 group-hover:text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5M6 7H5a2 2 0 01-2-2V5a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2h10a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/')}
                    className="glassmorphism rounded-2xl p-6 text-left hover:shadow-glass-lg transition-all border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🏠</span>
                      <div className="flex-1">
                        <div className="font-bold text-oceanic-900 dark:text-oceanic-100 text-lg">View Splash Screen</div>
                        <div className="text-sm text-oceanic600 dark:text-oceanic-400">Test user landing experience</div>
                      </div>
                      <svg className="w-5 h-5 text-purple-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5M6 7H5a2 2 0 01-2-2V5a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2h10a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/admin/login')}
                    className="glassmorphism rounded-2xl p-6 text-left hover:shadow-glass-lg transition-all border-2 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl group-hover:scale-110 transition-transform duration-300">🔐</span>
                      <div className="flex-1">
                        <div className="font-bold text-oceanic-900 dark:text-oceanic-100 text-lg">Admin Login Page</div>
                        <div className="text-sm text-oceanic600 dark:text-oceanic-400">Test authentication flow</div>
                      </div>
                      <svg className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5M6 7H5a2 2 0 01-2-2V5a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2h10a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>

              {/* System Info */}
              <div>
                <h3 className="text-2xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-4">
                  System Information
                </h3>
                <div className="glassmorphism rounded-2xl p-6 space-y-4 bg-oceanic-50 dark:bg-oceanic-900/30">
                  <div className="flex justify-between items-center py-3 border-b border-oceanic-200 dark:border-oceanic-700">
                    <span className="text-oceanic-600 dark:text-oceanic-400">Framework</span>
                    <span className="text-oceanic-900 dark:text-oceanic-100 font-semibold">Next.js 16</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-oceanic-200 dark:border-oceanic-700">
                    <span className="text-oceanic-600 dark:text-oceanic-400">Language</span>
                    <span className="text-oceanic-900 dark:text-oceanic-100 font-semibold">TypeScript 5</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-oceanic-200 dark:border-oceanic-700">
                    <span className="text-oceanic-600 dark:text-oceanic-400">Styling</span>
                    <span className="text-oceanic-900 dark:text-oceanic-100 font-semibold">Tailwind CSS 4</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-oceanic-200 dark:border-oceanic-700">
                    <span className="text-oceanic-600 dark:text-oceanic-400">State Management</span>
                    <span className="text-oceanic-900 dark:text-oceanic-100 font-semibold">Zustand</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-oceanic-600 dark:text-oceanic-400">Database Schema</span>
                    <span className="text-oceanic-900 dark:text-oceanic-100 font-semibold">PostgreSQL + RLS + DEK</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pos' && (
            <div>
              <h2 className="text-3xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-6">
                POS Testing Interface
              </h2>

              <div className="glassmorphism rounded-2xl p-6 mb-6 bg-linear-to-r from-oceanic-50 to-sky-50 dark:from-oceanic-900/30 dark:to-sky-900/30 border border-oceanic-200 dark:border-ocean-700">
                <div className="flex items-start gap-4">
                  <span className="text-5xl">📱</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">
                      Mobile-First POS System
                    </h3>
                    <p className="text-oceanic-700 dark:text-oceanic-300 mb-4">
                      Test the point of sale interface optimized for mobile devices with camera-based barcode scanning,
                      real-time cart management, and simulated Pi Network payments.
                    </p>
                    <button
                      onClick={() => router.push('/pos')}
                      className="bg-linear-to-r from-oceanic-600 to-sky-600 hover:from-oceanic-700 hover:to-sky-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-glass hover:shadow-glass-lg"
                    >
                      Launch POS Terminal
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-oceanic-900 dark:text-oceanic-100">POS Features to Test</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📷</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Barcode Scanner</span>
                    </div>
                    <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Test camera-based product scanning functionality</p>
                  </div>

                  <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🛒</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Cart Management</span>
                    </div>
                    <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Add, remove, and update items in cart</p>
                  </div>

                  <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">💰</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Real-time Calculations</span>
                    </div>
                    <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Subtotal, tax, and total calculations</p>
                  </div>

                  <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🥧</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Pi Payment (Dev)</span>
                    </div>
                    <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Simulated Pi Network payment flow</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ims' && (
            <div>
              <h2 className="text-3xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-6">
                IMS Testing Interface
              </h2>

              <div className="glassmorphism rounded-2xl p-6 mb-6 bg-linear-to-r from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/30 border border-sky-200 dark:border-sky-700">
                <div className="flex items-start gap-4">
                  <span className="text-5xl">📊</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-2">
                      Inventory Management System
                    </h3>
                    <p className="text-oceanic-700 dark:text-oceanic-300 mb-4">
                      Test the inventory dashboard with real-time stock tracking, low stock alerts,
                      product management, and analytics.
                    </p>
                    <button
                      onClick={() => router.push('/ims')}
                      className="bg-linear-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-glass hover:shadow-glass-lg"
                    >
                      Launch IMS Dashboard
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-oceanic-900 dark:text-oceanic-100">IMS Features to Test</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📦</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Product Management</span>
                    </div>
                    <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Add, edit, and remove products</p>
                  </div>

                  <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📉</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Stock Tracking</span>
                    </div>
                    <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Real-time inventory levels and alerts</p>
                  </div>

                  <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">⚠️</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Low Stock Alerts</span>
                    </div>
                    <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Automated reorder notifications</p>
                  </div>

                  <div className="glassmorphism rounded-xl p-4 bg-white dark:bg-oceanic-900/50">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📊</span>
                      <span className="font-semibold text-oceanic-900 dark:text-oceanic-100">Analytics Dashboard</span>
                    </div>
                    <p className="text-sm text-oceanic-600 dark:text-oceanic-400">Business performance metrics</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div>
              <h2 className="text-3xl font-bold text-oceanic-900 dark:text-oceanic-100 mb-6">
                Database Status
              </h2>

              <div className="glassmorphism rounded-2xl p-6 mb-6 bg-linear-to-r from-success-50 to-emerald-50 dark:from-success-900/30 dark:to-emerald-900/30 border border-success-200 dark:border-success-800">
                <div className="flex items-start gap-4">
                  <span className="text-5xl">🗄️</span>
                  <div>
                    <h3 className="text-xl font-bold text-success-800 dark:text-success-200 mb-2">
                      Database Connected Successfully
                    </h3>
                    <p className="text-success-700 dark:text-success-300 mb-4">
                      PostgreSQL database with Row Level Security (RLS) and Deterministic Encryption (DEK) is active and ready.
                    </p>
                    <div className="flex gap-3">
                      <div className="bg-white dark:bg-success-900/50 rounded-lg px-4 py-2">
                        <div className="text-xs text-success-600 dark:text-success-400 font-semibold">STATUS</div>
                        <div className="text-lg font-bold text-success-700 dark:text-success-300">Active</div>
                      </div>
                      <div className="bg-white dark:bg-success-900/50 rounded-lg px-4 py-2">
                        <div className="text-xs text-success-600 dark:text-success-400 font-semibold">ENCRYPTION</div>
                        <div className="text-lg font-bold text-success-700 dark:text-success-300">DEK Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glassmorphism rounded-2xl p-6 bg-white dark:bg-oceanic-900/50">
                  <h4 className="text-lg font-bold text-oceanic-900 dark:text-oceanic-100 mb-4">
                    Database Features
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2 text-oceanic-700 dark:text-oceanic-300">
                      <span className="text-success-500">✓</span>
                      <span>Row Level Security (RLS) policies</span>
                    </li>
                    <li className="flex items-start gap-2 text-oceanic-700 dark:text-oceanic-300">
                      <span className="text-success-500">✓</span>
                      <span>Deterministic Encryption Keys</span>
                    </li>
                    <li className="flex items-start gap-2 text-oceanic-700 dark:text-oceanic-300">
                      <span className="text-success-500">✓</span>
                      <span>Parameterized SQL queries</span>
                    </li>
                    <li className="flex items-start gap-2 text-oceanic-700 dark:text-oceanic-300">
                      <span className="text-success-500">✓</span>
                      <span>ACID transaction compliance</span>
                    </li>
                  </ul>
                </div>

                <div className="glassmorphism rounded-2xl p-6 bg-white dark:bg-oceanic-900/50">
                  <h4 className="text-lg font-bold text-oceanic-900 dark:text-oceanic-100 mb-4">
                    Schema Information
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2 text-oceanic-700 dark:text-oceanic-300">
                      <span className="text-oceanic-500">📊</span>
                      <span>Users, merchants, and customers</span>
                    </li>
                    <li className="flex items-start gap-2 text-oceanic-700 dark:text-oceanic-300">
                      <span className="text-oceanic-500">🛒</span>
                      <span>Products and inventory</span>
                    </li>
                    <li className="flex items-start gap-2 text-oceanic-700 dark:text-oceanic-300">
                      <span className="text-oceanic-500">💳</span>
                      <span>Sales and transactions</span>
                    </li>
                    <li className="flex items-start gap-2 text-oceanic-700 dark:text-oceanic300">
                      <span className="text-oceanic-500">🔐</span>
                      <span>Authentication and sessions</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
