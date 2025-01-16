import { useState, useEffect } from 'react';
import type { Settings } from '../types/settings';

const defaultSettings: Settings = {
  general: {
    theme: 'light',
    security: {
      mfa: false,
      sessionTimeout: 30,
      apiKeyRotation: 90
    },
    notifications: {
      email: true,
      slack: false,
      inApp: true
    }
  },
  integrations: [],
  alertRules: []
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [error, setError] = useState<Error | null>(null);

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    // Save to localStorage or your backend
    localStorage.setItem('settings', JSON.stringify(newSettings));
  };

  const saveSettings = async () => {
    try {
      // Save to backend if needed
      localStorage.setItem('settings', JSON.stringify(settings));
      return Promise.resolve();
    } catch (err) {
      setError(err as Error);
      return Promise.reject(err);
    }
  };

  useEffect(() => {
    // Load settings from localStorage or your backend
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (err) {
        setError(err as Error);
      }
    }
  }, []);

  return { settings, updateSettings, saveSettings, error };
}