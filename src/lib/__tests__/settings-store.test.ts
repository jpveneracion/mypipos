// src/lib/__tests__/settings-store.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../settings-store';

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useSettingsStore.getState().reset();
    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const state = useSettingsStore.getState();
    expect(state.personalSettings).toBeNull();
    expect(state.businessSettings).toBeNull();
    expect(state.activeTab).toBe('personal');
    expect(state.isLoading).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.saveStatus).toBe('idle');
    expect(state.errorMessage).toBeUndefined();
  });

  it('should set active tab', () => {
    useSettingsStore.getState().setActiveTab('business');
    expect(useSettingsStore.getState().activeTab).toBe('business');

    useSettingsStore.getState().setActiveTab('personal');
    expect(useSettingsStore.getState().activeTab).toBe('personal');
  });

  it('should reset save status', () => {
    useSettingsStore.setState({ saveStatus: 'success' });
    useSettingsStore.getState().resetSaveStatus();
    expect(useSettingsStore.getState().saveStatus).toBe('idle');
    expect(useSettingsStore.getState().errorMessage).toBeUndefined();
  });

  it('should reset entire store', () => {
    // Set some state
    useSettingsStore.setState({
      activeTab: 'business',
      isLoading: true,
      isSaving: true,
      saveStatus: 'success',
      errorMessage: 'Test error'
    });

    // Reset
    useSettingsStore.getState().reset();

    // Check defaults
    const state = useSettingsStore.getState();
    expect(state.personalSettings).toBeNull();
    expect(state.businessSettings).toBeNull();
    expect(state.activeTab).toBe('personal');
    expect(state.isLoading).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.saveStatus).toBe('idle');
    expect(state.errorMessage).toBeUndefined();
  });
});
