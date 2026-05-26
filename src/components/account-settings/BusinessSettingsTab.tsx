'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { BusinessSettings } from '@/types/settings';

interface BusinessSettingsTabProps {
  settings: BusinessSettings;
  onUpdate: (field: string, value: any) => Promise<void>;
  isSaving: boolean;
}

export default function BusinessSettingsTab({
  settings,
  onUpdate,
  isSaving
}: BusinessSettingsTabProps) {
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
      {/* Payment Methods */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enabled Payment Methods
              </label>
              <div className="space-y-2">
                {['pi', 'cash', 'card'].map((method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.business.payment_methods.enabled_methods.includes(method as any)}
                      onChange={(e) => {
                        const enabled = e.target.checked
                          ? [...settings.business.payment_methods.enabled_methods, method as any]
                          : settings.business.payment_methods.enabled_methods.filter(m => m !== method);
                        handleUpdate('payment_methods', {
                          ...settings.business.payment_methods,
                          enabled_methods: enabled
                        });
                      }}
                      disabled={isSaving}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Payment Method
              </label>
              <select
                value={settings.business.payment_methods.default_method}
                onChange={(e) => handleUpdate('payment_methods', {
                  ...settings.business.payment_methods,
                  default_method: e.target.value
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
        </div>
      </Card>

      {/* Store Hours */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Store Hours</h2>
          <div className="space-y-3">
            {Object.entries(settings.business.store_hours).map(([day, hours]) => (
              <div key={day} className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 capitalize">
                    {day}
                  </label>
                  {hours.closed ? (
                    <span className="ml-3 text-sm text-gray-500">Closed</span>
                  ) : (
                    <span className="ml-3 text-sm text-gray-600">
                      {hours.open} - {hours.close_time}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleUpdate('store_hours', {
                    ...settings.business.store_hours,
                    [day]: {
                      ...hours,
                      closed: !hours.closed
                    }
                  })}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    !hours.closed
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      !hours.closed
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Staff Permissions */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Staff Permissions</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Cashier Role
              </label>
              <select
                value={settings.business.staff_permissions.default_cashier_role}
                onChange={(e) => handleUpdate('staff_permissions', {
                  ...settings.business.staff_permissions,
                  default_cashier_role: e.target.value
                })}
                disabled={isSaving}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Allow Manager Analytics
                </label>
                <p className="text-sm text-gray-500">Managers can view analytics</p>
              </div>
              <button
                onClick={() => handleUpdate('staff_permissions', {
                  ...settings.business.staff_permissions,
                  allow_manager_analytics: !settings.business.staff_permissions.allow_manager_analytics
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.business.staff_permissions.allow_manager_analytics
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.business.staff_permissions.allow_manager_analytics
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Allow Manager Inventory
                </label>
                <p className="text-sm text-gray-500">Managers can manage inventory</p>
              </div>
              <button
                onClick={() => handleUpdate('staff_permissions', {
                  ...settings.business.staff_permissions,
                  allow_manager_inventory: !settings.business.staff_permissions.allow_manager_inventory
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.business.staff_permissions.allow_manager_inventory
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.business.staff_permissions.allow_manager_inventory
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Allow Staff Discounts
                </label>
                <p className="text-sm text-gray-500">Staff can apply discounts</p>
              </div>
              <button
                onClick={() => handleUpdate('staff_permissions', {
                  ...settings.business.staff_permissions,
                  allow_staff_discounts: !settings.business.staff_permissions.allow_staff_discounts
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.business.staff_permissions.allow_staff_discounts
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.business.staff_permissions.allow_staff_discounts
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Analytics Configuration */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Analytics Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Analytics
                </label>
                <p className="text-sm text-gray-500">Track business analytics</p>
              </div>
              <button
                onClick={() => handleUpdate('analytics_config', {
                  ...settings.business.analytics_config,
                  enable_analytics: !settings.business.analytics_config.enable_analytics
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.business.analytics_config.enable_analytics
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.business.analytics_config.enable_analytics
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Retention (Days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.business.analytics_config.retention_days}
                onChange={(e) => handleUpdate('analytics_config', {
                  ...settings.business.analytics_config,
                  retention_days: parseInt(e.target.value) || 30
                })}
                disabled={isSaving}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                How long to keep analytics data (1-365 days)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Permissions
              </label>
              <div className="space-y-2">
                {['admin', 'manager', 'cashier'].map((role) => (
                  <label key={role} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.business.analytics_config.export_permissions.includes(role as any)}
                      onChange={(e) => {
                        const permissions = e.target.checked
                          ? [...settings.business.analytics_config.export_permissions, role as any]
                          : settings.business.analytics_config.export_permissions.filter(r => r !== role);
                        handleUpdate('analytics_config', {
                          ...settings.business.analytics_config,
                          export_permissions: permissions
                        });
                      }}
                      disabled={isSaving}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 capitalize">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Billing Information */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Billing Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Email
              </label>
              <input
                type="email"
                value={settings.business.billing_info.invoice_email}
                onChange={(e) => handleUpdate('billing_info', {
                  ...settings.business.billing_info,
                  invoice_email: e.target.value
                })}
                disabled={isSaving}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={settings.business.billing_info.payment_method}
                onChange={(e) => handleUpdate('billing_info', {
                  ...settings.business.billing_info,
                  payment_method: e.target.value
                })}
                disabled={isSaving}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pi">Pi Network</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Tax Exempt
                </label>
                <p className="text-sm text-gray-500">Business is tax-exempt</p>
              </div>
              <button
                onClick={() => handleUpdate('billing_info', {
                  ...settings.business.billing_info,
                  tax_exempt: !settings.business.billing_info.tax_exempt
                })}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.business.billing_info.tax_exempt
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.business.billing_info.tax_exempt
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