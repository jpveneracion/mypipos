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
    resetSaveStatus
  } = useSettingsStore();

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // Fetch settings based on user role
    const loadSettings = async () => {
      try {
        await fetchPersonalSettings();

        // Only fetch business settings if user is a merchant
        if (user?.merchantId) {
          await fetchBusinessSettings();
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-lg z-50">
          Settings saved successfully!
        </div>
      )}

      <SettingsLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'personal' && personalSettings && (
          <PersonalSettingsTab
            settings={personalSettings}
            onUpdate={handlePersonalUpdate}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'business' && businessSettings && (
          <BusinessSettingsTab
            settings={businessSettings}
            onUpdate={handleBusinessUpdate}
            isSaving={isSaving}
          />
        )}
      </SettingsLayout>
    </div>
  );
}
