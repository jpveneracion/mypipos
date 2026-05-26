'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useSettingsStore } from '@/lib/settings-store';
import SettingsLayout from '@/components/account-settings/SettingsLayout';
import PersonalSettingsTab from '@/components/account-settings/PersonalSettingsTab';
import BusinessSettingsTab from '@/components/account-settings/BusinessSettingsTab';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const {
    personalSettings,
    businessSettings,
    activeTab,
    isLoading,
    isSaving,
    saveStatus,
    fetchPersonalSettings,
    fetchBusinessSettings,
    setActiveTab,
    updatePersonalSetting,
    updateBusinessSetting,
    resetSaveStatus,
    errorMessage
  } = useSettingsStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Fetch settings based on user role
    const loadSettings = async () => {
      try {
        console.log('🔍 Loading settings...');
        await fetchPersonalSettings();

        // Only fetch business settings if user is a merchant
        if (user?.merchantId) {
          await fetchBusinessSettings();
        }
      } catch (error) {
        console.error('❌ Failed to load settings:', error);
        setDebugInfo({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    };

    loadSettings();
  }, [isAuthenticated, user]);

  // Show success message when save completes
  useEffect(() => {
    if (saveStatus === 'success') {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        resetSaveStatus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus, resetSaveStatus]);

  const handleTabChange = (tab: 'personal' | 'business') => {
    setActiveTab(tab);
  };

  const handlePersonalUpdate = async (field: string, value: any) => {
    try {
      await updatePersonalSetting(field, value);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const handleBusinessUpdate = async (field: string, value: any) => {
    try {
      await updateBusinessSetting(field, value);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="ml-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 m-4 rounded">
          <h3 className="font-bold">Debug Info:</h3>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 m-4 rounded">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-lg z-50">
          Settings saved successfully!
        </div>
      )}

      {/* State Debug */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 m-4 rounded text-sm">
        <strong>State:</strong>
        <ul>
          <li>Active Tab: {activeTab}</li>
          <li>Personal Settings: {personalSettings ? '✅ Loaded' : '❌ Null'}</li>
          <li>Business Settings: {businessSettings ? '✅ Loaded' : '❌ Null'}</li>
          <li>Is Saving: {isSaving ? 'Yes' : 'No'}</li>
          <li>User: {user ? JSON.stringify(user) : 'Not loaded'}</li>
        </ul>
      </div>

      <SettingsLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'personal' && personalSettings ? (
          <PersonalSettingsTab
            settings={personalSettings}
            onUpdate={handlePersonalUpdate}
            isSaving={isSaving}
          />
        ) : activeTab === 'personal' ? (
          <div className="p-8 text-center text-gray-500">
            Personal settings not loaded. Please refresh the page.
          </div>
        ) : null}

        {activeTab === 'business' && businessSettings ? (
          <BusinessSettingsTab
            settings={businessSettings}
            onUpdate={handleBusinessUpdate}
            isSaving={isSaving}
          />
        ) : activeTab === 'business' ? (
          <div className="p-8 text-center text-gray-500">
            Business settings not available or not loaded.
          </div>
        ) : null}
      </SettingsLayout>
    </div>
  );
}
