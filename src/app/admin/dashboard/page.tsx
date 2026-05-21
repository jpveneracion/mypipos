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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🔧</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-xs text-gray-300">Development & Testing Environment</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-sm text-gray-300">
                  Welcome, <span className="font-semibold text-white">Admin</span>
                </span>
                {authMethod && (
                  <div className="text-xs text-gray-400">
                    Auth: {authMethod}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Development Mode Warning */}
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-yellow-400 font-semibold mb-1">Development Mode Active</h3>
              <p className="text-sm text-gray-300">
                This dashboard bypasses Pi Network authentication for testing purposes only.
                All features are functional but do not connect to the real Pi Network.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">System Overview</h2>

              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6">
                  <div className="text-3xl mb-2">📱</div>
                  <div className="text-2xl font-bold text-white">POS</div>
                  <div className="text-sm text-purple-200">Point of Sale System</div>
                  <div className="mt-4 text-sm text-white">
                    <span className="bg-white/20 px-2 py-1 rounded">Active</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="text-2xl font-bold text-white">IMS</div>
                  <div className="text-sm text-blue-200">Inventory Management</div>
                  <div className="mt-4 text-sm text-white">
                    <span className="bg-white/20 px-2 py-1 rounded">Active</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl p-6">
                  <div className="text-3xl mb-2">🥧</div>
                  <div className="text-2xl font-bold text-white">Pi Auth</div>
                  <div className="text-sm text-pink-200">Development Mode</div>
                  <div className="mt-4 text-sm text-white">
                    <span className="bg-white/20 px-2 py-1 rounded">Bypassed</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-6">
                  <div className="text-3xl mb-2">🗄️</div>
                  <div className="text-2xl font-bold text-white">Database</div>
                  <div className="text-sm text-green-200">PostgreSQL Schema</div>
                  <div className="mt-4 text-sm text-white">
                    <span className="bg-white/20 px-2 py-1 rounded">Ready</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => router.push('/pos')}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">📱</span>
                      <div>
                        <div className="font-semibold">Launch POS Terminal</div>
                        <div className="text-sm text-purple-200">Test point of sale functionality</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/ims')}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">📊</span>
                      <div>
                        <div className="font-semibold">Launch IMS Dashboard</div>
                        <div className="text-sm text-blue-200">Test inventory management</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">🏠</span>
                      <div>
                        <div className="font-semibold">View Splash Screen</div>
                        <div className="text-sm text-indigo-200">Test user landing experience</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/admin/login')}
                    className="bg-gray-600 hover:bg-gray-700 text-white p-6 rounded-xl text-left transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">🔐</span>
                      <div>
                        <div className="font-semibold">Admin Login Page</div>
                        <div className="text-sm text-gray-200">Test authentication flow</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* System Info */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">System Information</h3>
                <div className="bg-white/5 rounded-lg p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Framework</span>
                    <span className="text-white font-medium">Next.js 16</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Language</span>
                    <span className="text-white font-medium">TypeScript</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Styling</span>
                    <span className="text-white font-medium">Tailwind CSS 4</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">State Management</span>
                    <span className="text-white font-medium">Zustand</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Database Schema</span>
                    <span className="text-white font-medium">PostgreSQL + RLS + DEK</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pos' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">POS Testing Interface</h2>

              <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">📱</span>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Mobile-First POS System</h3>
                    <p className="text-gray-300 mb-4">
                      Test the point of sale interface optimized for mobile devices with camera-based barcode scanning,
                      real-time cart management, and simulated Pi Network payments.
                    </p>
                    <button
                      onClick={() => router.push('/pos')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Launch POS Terminal
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">POS Features to Test</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📷</span>
                      <span className="text-white font-medium">Barcode Scanner</span>
                    </div>
                    <p className="text-sm text-gray-400">Test camera-based product scanning functionality</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🛒</span>
                      <span className="text-white font-medium">Cart Management</span>
                    </div>
                    <p className="text-sm text-gray-400">Add, remove, and update items in cart</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">💰</span>
                      <span className="text-white font-medium">Real-time Calculations</span>
                    </div>
                    <p className="text-sm text-gray-400">Subtotal, tax, and total calculations</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🥧</span>
                      <span className="text-white font-medium">Pi Payment (Dev)</span>
                    </div>
                    <p className="text-sm text-gray-400">Simulated Pi Network payment flow</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ims' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">IMS Testing Interface</h2>

              <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">📊</span>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Desktop-Optimized IMS</h3>
                    <p className="text-gray-300 mb-4">
                      Test the inventory management system with real-time stock tracking, low stock alerts,
                      product management, and barcode scanning integration.
                    </p>
                    <button
                      onClick={() => router.push('/ims')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Launch IMS Dashboard
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">IMS Features to Test</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📈</span>
                      <span className="text-white font-medium">Dashboard Statistics</span>
                    </div>
                    <p className="text-sm text-gray-400">Overview of inventory metrics and alerts</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">⚠️</span>
                      <span className="text-white font-medium">Low Stock Alerts</span>
                    </div>
                    <p className="text-sm text-gray-400">Real-time inventory threshold notifications</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📦</span>
                      <span className="text-white font-medium">Product Management</span>
                    </div>
                    <p className="text-sm text-gray-400">Add, edit, and remove inventory items</p>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">🔍</span>
                      <span className="text-white font-medium">Barcode Integration</span>
                    </div>
                    <p className="text-sm text-gray-400">Scan and add products via camera</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Database Schema Status</h2>

              <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">🗄️</span>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">PostgreSQL + Enterprise Security</h3>
                    <p className="text-gray-300 mb-4">
                      Comprehensive database schema with universal product catalog, multi-tenant architecture,
                      RLS policies, and DEK encryption system.
                    </p>
                    <div className="flex gap-3">
                      <span className="bg-green-500/30 text-green-300 px-3 py-1 rounded text-sm">Schema Ready</span>
                      <span className="bg-purple-500/30 text-purple-300 px-3 py-1 rounded text-sm">RLS Enabled</span>
                      <span className="bg-blue-500/30 text-blue-300 px-3 py-1 rounded text-sm">DEK Encryption</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Schema Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🆔</span>
                        <span className="text-white font-medium">Full UUID Coverage</span>
                      </div>
                      <p className="text-sm text-gray-400">All primary and foreign keys use UUIDs</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🔒</span>
                        <span className="text-white font-medium">Row-Level Security</span>
                      </div>
                      <p className="text-sm text-gray-400">Multi-tenant isolation with RLS policies</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🔐</span>
                        <span className="text-white font-medium">DEK Encryption</span>
                      </div>
                      <p className="text-sm text-gray-400">Per-merchant envelope encryption keys</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🌐</span>
                        <span className="text-white font-medium">Universal Products</span>
                      </div>
                      <p className="text-sm text-gray-400">Shared catalog with per-merchant pricing</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">👥</span>
                        <span className="text-white font-medium">Multi-Tenant</span>
                      </div>
                      <p className="text-sm text-gray-400">Isolated merchant data environments</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📝</span>
                        <span className="text-white font-medium">Audit Logging</span>
                      </div>
                      <p className="text-sm text-gray-400">Comprehensive change tracking system</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Implementation Status</h3>
                  <div className="bg-white/5 rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Schema Definition</span>
                        <span className="bg-green-500/30 text-green-300 px-3 py-1 rounded text-sm">Complete</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Migration Scripts</span>
                        <span className="bg-green-500/30 text-green-300 px-3 py-1 rounded text-sm">Complete</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Connection Setup</span>
                        <span className="bg-yellow-500/30 text-yellow-300 px-3 py-1 rounded text-sm">Pending</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Vercel Environment</span>
                        <span className="bg-yellow-500/30 text-yellow-300 px-3 py-1 rounded text-sm">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}