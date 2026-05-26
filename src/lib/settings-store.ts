import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PersonalSettings,
  BusinessSettings
} from '@/types/settings';

interface SettingsStore {
  // State
  personalSettings: PersonalSettings | null;
  businessSettings: BusinessSettings | null;
  activeTab: 'personal' | 'business';
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  errorMessage?: string;

  // Actions
  fetchPersonalSettings: () => Promise<void>;
  fetchBusinessSettings: () => Promise<void>;
  updatePersonalSetting: (field: string, value: any) => Promise<void>;
  updateBusinessSetting: (field: string, value: any) => Promise<void>;
  setActiveTab: (tab: 'personal' | 'business') => void;
  resetSaveStatus: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      personalSettings: null,
      businessSettings: null,
      activeTab: 'personal',
      isLoading: false,
      isSaving: false,
      saveStatus: 'idle',
      errorMessage: undefined,

      // Fetch personal settings
      fetchPersonalSettings: async () => {
        set({ isLoading: true, errorMessage: undefined });
        try {
          const response = await fetch('/api/user/settings');
          if (!response.ok) {
            throw new Error('Failed to fetch personal settings');
          }
          const result = await response.json();
          set({ personalSettings: result.data, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
      },

      // Fetch business settings
      fetchBusinessSettings: async () => {
        set({ isLoading: true, errorMessage: undefined });
        try {
          const response = await fetch('/api/merchant/settings');
          if (!response.ok) {
            throw new Error('Failed to fetch business settings');
          }
          const result = await response.json();
          set({ businessSettings: result.data, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
      },

      // Update personal setting
      updatePersonalSetting: async (field, value) => {
        set({ isSaving: true, saveStatus: 'idle', errorMessage: undefined });
        try {
          const response = await fetch('/api/user/settings/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update setting');
          }

          const data = await response.json();

          // Update local state with new value
          set((state) => ({
            personalSettings: state.personalSettings
              ? {
                  ...state.personalSettings,
                  personal: {
                    ...state.personalSettings.personal,
                    [field]: value
                  }
                }
              : null,
            isSaving: false,
            saveStatus: 'success'
          }));

          return data;
        } catch (error) {
          set({
            isSaving: false,
            saveStatus: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
      },

      // Update business setting
      updateBusinessSetting: async (field, value) => {
        set({ isSaving: true, saveStatus: 'idle', errorMessage: undefined });
        try {
          const response = await fetch('/api/merchant/settings/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update setting');
          }

          const data = await response.json();

          // Update local state with new value
          set((state) => ({
            businessSettings: state.businessSettings
              ? {
                  ...state.businessSettings,
                  business: {
                    ...state.businessSettings.business,
                    [field]: value
                  }
                }
              : null,
            isSaving: false,
            saveStatus: 'success'
          }));

          return data;
        } catch (error) {
          set({
            isSaving: false,
            saveStatus: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
      },

      // Set active tab
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Reset save status
      resetSaveStatus: () => set({ saveStatus: 'idle', errorMessage: undefined })
    }),
    {
      name: 'mypipos-settings',
      partialize: (state) => ({
        personalSettings: state.personalSettings,
        businessSettings: state.businessSettings,
        activeTab: state.activeTab
      })
    }
  )
);
