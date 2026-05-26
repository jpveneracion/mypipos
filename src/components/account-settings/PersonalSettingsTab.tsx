'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { PersonalSettings } from '@/types/settings';

interface PersonalSettingsTabProps {
  settings: PersonalSettings;
  onUpdate: (field: string, value: any) => Promise<void>;
  isSaving: boolean;
}

export default function PersonalSettingsTab({
  settings,
  onUpdate,
  isSaving
}: PersonalSettingsTabProps) {
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleUpdate = async (field: string, value: any) => {
    setEditingField(field);
    try {
      await onUpdate(field, value);
    } finally {
      setEditingField(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                value={settings.profile.username}
                disabled
                className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
              />
            </div>
            {settings.profile.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.profile.email}
                  disabled
                  className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Cashback Configuration */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Cashback Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pi Address for Cashback
              </label>
              <input
                type="text"
                value={settings.personal.pi_wallet_address || ''}
                onChange={(e) => handleUpdate('pi_wallet_address', e.target.value)}
                placeholder="Enter your Pi address"
                disabled={isSaving || editingField === 'pi_wallet_address'}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Single address for both Pi tokens and mypipos tokens
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Pi Cashback
                </label>
                <p className="text-sm text-gray-500">Receive cashback in Pi tokens</p>
              </div>
              <button
                onClick={() => handleUpdate('cashback_preferences', {
                  ...settings.personal.cashback_preferences,
                  enable_pi_cashback: !settings.personal.cashback_preferences.enable_pi_cashback
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.personal.cashback_preferences.enable_pi_cashback
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.personal.cashback_preferences.enable_pi_cashback
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable mypipos Tokens
                </label>
                <p className="text-sm text-gray-500">Receive cashback in app tokens</p>
              </div>
              <button
                onClick={() => handleUpdate('cashback_preferences', {
                  ...settings.personal.cashback_preferences,
                  enable_mypipos_tokens: !settings.personal.cashback_preferences.enable_mypipos_tokens
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.personal.cashback_preferences.enable_mypipos_tokens
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.personal.cashback_preferences.enable_mypipos_tokens
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Preferences */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Payment Preferences</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Payment Method
            </label>
            <select
              value={settings.personal.payment_preferences.default_payment_method}
              onChange={(e) => handleUpdate('payment_preferences', {
                ...settings.personal.payment_preferences,
                default_payment_method: e.target.value
              })}
              disabled={isSaving}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pi">Pi Network</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email Notifications
                </label>
                <p className="text-sm text-gray-500">Receive updates via email</p>
              </div>
              <button
                onClick={() => handleUpdate('notification_preferences', {
                  ...settings.personal.notification_preferences,
                  email_notifications: !settings.personal.notification_preferences.email_notifications
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.personal.notification_preferences.email_notifications
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.personal.notification_preferences.email_notifications
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Promotional Emails
                </label>
                <p className="text-sm text-gray-500">Receive offers and promotions</p>
              </div>
              <button
                onClick={() => handleUpdate('notification_preferences', {
                  ...settings.personal.notification_preferences,
                  promotional_emails: !settings.personal.notification_preferences.promotional_emails
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.personal.notification_preferences.promotional_emails
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.personal.notification_preferences.promotional_emails
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
