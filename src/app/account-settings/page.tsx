'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings, Save, ArrowLeft, User, Building2, Wallet, Loader2 } from 'lucide-react';

interface User {
  id: string;
  piUsername: string;
  userType?: 'customer' | 'merchant';
  merchantId?: string;
  role?: string;
}

interface PersonalSettings {
  pi_address?: string;
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
          setPiAddress(s.pi_address || '');
          setEnablePiCashback(s.cashback_preferences?.enable_pi_cashback ?? true);
          setEnableMypiposTokens(s.cashback_preferences?.enable_mypipos_tokens ?? true);
          setDefaultPaymentMethod(s.payment_preferences?.default_payment_method || 'pi');
          setEmailNotifications(s.notification_preferences?.email_notifications ?? true);
          setPromotionalEmails(s.notification_preferences?.promotional_emails ?? true);

          // Set default tab
          if (userData.userType === 'merchant') {
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
        pi_address: piAddress,
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Settings className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600">{user?.piUsername}</p>
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
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <User size={18} className="inline mr-2" />
            Personal Settings
          </button>
          {user?.userType === 'merchant' && (
            <button
              onClick={() => setActiveTab('business')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'business'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
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
          className="max-w-4xl mx-auto mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg"
        >
          ✓ Settings saved successfully!
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg"
        >
          ❌ {error}
        </motion.div>
      )}

      {/* Personal Settings Form */}
      {activeTab === 'personal' && (
        <motion.form
          onSubmit={handleSave}
          className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Pi Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pi Address for Cashback
            </label>
            <input
              type="text"
              value={piAddress}
              onChange={(e) => setPiAddress(e.target.value.toUpperCase())}
              placeholder="GABS3P5..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono"
            />
            <p className="text-sm text-gray-500 mt-1">
              Single address for both Pi tokens and mypipos tokens
            </p>
          </div>

          {/* Cashback Preferences */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cashback Configuration</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">Enable Pi Cashback</span>
                  <p className="text-sm text-gray-500">Receive cashback in Pi tokens</p>
                </div>
                <input
                  type="checkbox"
                  checked={enablePiCashback}
                  onChange={(e) => setEnablePiCashback(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">Enable mypipos Tokens</span>
                  <p className="text-sm text-gray-500">Receive cashback in app tokens</p>
                </div>
                <input
                  type="checkbox"
                  checked={enableMypiposTokens}
                  onChange={(e) => setEnableMypiposTokens(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Payment Preferences */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Preferences</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Payment Method
              </label>
              <select
                value={defaultPaymentMethod}
                onChange={(e) => setDefaultPaymentMethod(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pi">Pi Network</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">Email Notifications</span>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">Promotional Emails</span>
                  <p className="text-sm text-gray-500">Receive offers and promotions</p>
                </div>
                <input
                  type="checkbox"
                  checked={promotionalEmails}
                  onChange={(e) => setPromotionalEmails(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

      {/* Business Settings (placeholder) */}
      {activeTab === 'business' && (
        <motion.div
          className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-gray-500 text-center py-8">
            Business settings coming soon...
          </p>
        </motion.div>
      )}
    </div>
  );
}
