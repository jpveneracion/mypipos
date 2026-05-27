'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings, Save, ArrowLeft, User, Building2, Wallet, Loader2 } from 'lucide-react';

interface User {
  id: string;
  piUsername: string;
  userType?: 'customer' | 'merchant';
  user_type?: 'customer' | 'merchant'; // Database column name
  merchantId?: string;
  merchant_id?: string | null; // Database column name
  role?: string;
}

interface PersonalSettings {
  pi_wallet_address?: string;
  cashback_preferences: {
    enable_pi_cashback: boolean;
    enable_mypipos_tokens: boolean;
    cashback_percentage: number;
  };
  payment_preferences: {
    default_payment_method: 'pi' | 'cash' | 'card';
    save_payment_methods: boolean;
  };
  notification_preferences: {
    email_notifications: boolean;
    push_notifications: boolean;
    promotional_emails: boolean;
  };
}

export default function SimpleSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'business'>('personal');
  const [settings, setSettings] = useState<PersonalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [piAddress, setPiAddress] = useState('');
  const [enablePiCashback, setEnablePiCashback] = useState(true);
  const [enableMypiposTokens, setEnableMypiposTokens] = useState(true);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'pi' | 'cash' | 'card'>('pi');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [promotionalEmails, setPromotionalEmails] = useState(true);

  useEffect(() => {
    console.log('🚀 [SETTINGS] Page mounting...');

    // Get user from localStorage (mypipos uses 'mypipos-auth' key)
    const stored = localStorage.getItem('mypipos-auth');
    if (!stored) {
      router.push('/');
      return;
    }

    const parsed = JSON.parse(stored);
    console.log('👤 [SETTINGS] Auth data:', parsed);

    // The stored object contains user data in a nested structure
    const userData = parsed.user || parsed.state?.user || parsed;
    if (!userData || !userData.id) {
      router.push('/');
      return;
    }

    setUser(userData);

    // Fetch settings
    const fetchSettings = async () => {
      try {
        console.log('📡 [SETTINGS] Fetching settings...');
        const response = await fetch(`/api/user/settings?userId=${userData.id}`);
        const data = await response.json();
        console.log('✅ [SETTINGS] Response:', data);

        if (data.success && data.data) {
          const s = data.data.personal || data.data;
          setSettings(s);

          // Populate form
          setPiAddress(s.pi_wallet_address || '');
          setEnablePiCashback(s.cashback_preferences?.enable_pi_cashback ?? true);
          setEnableMypiposTokens(s.cashback_preferences?.enable_mypipos_tokens ?? true);
          setDefaultPaymentMethod(s.payment_preferences?.default_payment_method || 'pi');
          setEmailNotifications(s.notification_preferences?.email_notifications ?? true);
          setPromotionalEmails(s.notification_preferences?.promotional_emails ?? true);

          // Set default tab
          if (userData.userType === 'merchant' || userData.user_type === 'merchant' || userData.merchantId || userData.merchant_id) {
            setActiveTab('business');
          }
        }
      } catch (err) {
        console.error('❌ [SETTINGS] Error:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        userId: user?.id,
        pi_wallet_address: piAddress,
        cashback_preferences: {
          enable_pi_cashback: enablePiCashback,
          enable_mypipos_tokens: enableMypiposTokens,
          cashback_percentage: 2.5
        },
        payment_preferences: {
          default_payment_method: defaultPaymentMethod,
          save_payment_methods: false
        },
        notification_preferences: {
          email_notifications: emailNotifications,
          push_notifications: false,
          promotional_emails: promotionalEmails
        }
      };

      console.log('💾 [SETTINGS] Saving:', payload);

      const response = await fetch('/api/user/settings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('✅ [SETTINGS] Save response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('❌ [SETTINGS] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0F16]">
        <Loader2 className="w-8 h-8 animate-spin text-[#14D3C5]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0F16] p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#14D3C5] hover:text-[#25ede1] mb-4"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#14D3C5]/20 rounded-xl border border-[#14D3C5]/30">
            <Settings className="text-[#14D3C5]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-brand-indigo-300">{user?.piUsername}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'personal'
                ? 'bg-[#14D3C5] text-white'
                : 'bg-brand-indigo-900/50 text-brand-indigo-300 hover:bg-brand-indigo-900/70 border border-brand-indigo-800'
            }`}
          >
            <User size={18} className="inline mr-2" />
            Personal Settings
          </button>
          {(user?.userType === 'merchant' || user?.user_type === 'merchant' || user?.merchantId || user?.merchant_id) && (
            <button
              onClick={() => setActiveTab('business')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'business'
                  ? 'bg-[#14D3C5] text-white'
                  : 'bg-brand-indigo-900/50 text-brand-indigo-300 hover:bg-brand-indigo-900/70 border border-brand-indigo-800'
              }`}
            >
              <Building2 size={18} className="inline mr-2" />
              Business Settings
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-4 p-4 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg"
        >
          ✓ Settings saved successfully!
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-4 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg"
        >
          ❌ {error}
        </motion.div>
      )}

      {/* Personal Settings Form */}
      {activeTab === 'personal' && (
        <motion.form
          onSubmit={handleSave}
          className="max-w-4xl mx-auto glass-card p-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Pi Address */}
          <div>
            <label className="block text-sm font-medium text-brand-indigo-300 mb-2">
              Pi Address for Cashback
            </label>
            <input
              type="text"
              value={piAddress}
              onChange={(e) => setPiAddress(e.target.value.toUpperCase())}
              placeholder="GABS3P5..."
              className="w-full px-4 py-2 bg-brand-indigo-950/50 border border-brand-indigo-700 rounded-lg focus:ring-2 focus:ring-[#14D3C5] focus:border-[#14D3C5] uppercase font-mono text-brand-indigo-200 placeholder-brand-indigo-500"
            />
            <p className="text-sm text-brand-indigo-400 mt-1">
              Single address for both Pi tokens and mypipos tokens
            </p>
          </div>

          {/* Cashback Preferences */}
          <div className="border-t border-brand-indigo-800/50 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cashback Configuration</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-brand-indigo-900/30 border border-brand-indigo-800/50 rounded-lg">
                <div>
                  <span className="font-medium text-white">Enable Pi Cashback</span>
                  <p className="text-sm text-brand-indigo-400">Receive cashback in Pi tokens</p>
                </div>
                <input
                  type="checkbox"
                  checked={enablePiCashback}
                  onChange={(e) => setEnablePiCashback(e.target.checked)}
                  className="w-5 h-5 text-[#14D3C5] rounded focus:ring-[#14D3C5]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-brand-indigo-900/30 border border-brand-indigo-800/50 rounded-lg">
                <div>
                  <span className="font-medium text-white">Enable mypipos Tokens</span>
                  <p className="text-sm text-brand-indigo-400">Receive cashback in app tokens</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableMypiposTokens}
                  onChange={(e) => setEnableMypiposTokens(e.target.checked)}
                  className="w-5 h-5 text-[#14D3C5] rounded focus:ring-[#14D3C5]"
                />
              </label>
            </div>
          </div>

          {/* Payment Preferences */}
          <div className="border-t border-brand-indigo-800/50 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Preferences</h3>

            <div>
              <label className="block text-sm font-medium text-brand-indigo-300 mb-2">
                Default Payment Method
              </label>
              <select
                value={defaultPaymentMethod}
                onChange={(e) => setDefaultPaymentMethod(e.target.value as any)}
                className="w-full px-4 py-2 bg-brand-indigo-950/50 border border-brand-indigo-700 rounded-lg focus:ring-2 focus:ring-[#14D3C5] focus:border-[#14D3C5] text-brand-indigo-200"
              >
                <option value="pi">Pi Network</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="border-t border-brand-indigo-800/50 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-brand-indigo-900/30 border border-brand-indigo-800/50 rounded-lg">
                <div>
                  <span className="font-medium text-white">Email Notifications</span>
                  <p className="text-sm text-brand-indigo-400">Receive updates via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-5 h-5 text-[#14D3C5] rounded focus:ring-[#14D3C5]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-brand-indigo-900/30 border border-brand-indigo-800/50 rounded-lg">
                <div>
                  <span className="font-medium text-white">Promotional Emails</span>
                  <p className="text-sm text-brand-indigo-400">Receive offers and promotions</p>
                </div>
                <input
                  type="checkbox"
                  checked={promotionalEmails}
                  onChange={(e) => setPromotionalEmails(e.target.checked)}
                  className="w-5 h-5 text-[#14D3C5] rounded focus:ring-[#14D3C5]"
                />
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-brand-indigo-800/50">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 btn-cyan text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </motion.form>
      )}

      {/* Business Settings */}
      {activeTab === 'business' && (
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Business Settings</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Configure your merchant business settings and preferences
            </p>

            {/* Business Information */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Business Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business/Store Name
                  </label>
                  <input
                    type="text"
                    name="business_name"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="My Awesome Store"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your business display name
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Methods</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    disabled
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Pi Network</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Only payment method accepted</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Store Hours */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Store Hours</h3>
              <div className="space-y-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <div key={day} className="flex items-center justify-between p-2">
                    <span className="text-gray-700 dark:text-gray-300">{day}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">9:00 AM - 5:00 PM</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="pb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notifications</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Email Notifications</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive business updates via email</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Sales Reports</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Daily sales summary reports</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <button
                type="button"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
              >
                <Save size={16} />
                Save Business Settings
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
