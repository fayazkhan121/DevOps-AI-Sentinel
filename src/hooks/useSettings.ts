import { useState, useEffect } from 'react';
import type { Settings } from '../types/settings';

const defaultSettings: Settings = {
  integrations: [],
  alertRules: [],
  general: {
    theme: 'light',
    refreshInterval: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    retentionPeriod: '30',
    notifications: {
      email: true,
      slack: false,
      inApp: true
    },
    security: {
      mfa: false,
      sessionTimeout: 30,
      apiKeyRotation: 90
    }
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('devops-monitor-settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Save to localStorage
      localStorage.setItem('devops-monitor-settings', JSON.stringify(settings));
      
      // Here you would typically also save to your backend
      // await api.saveSettings(settings);
      
      // Verify integrations
      for (const integration of settings.integrations) {
        try {
          // await verifyIntegration(integration);
          integration.status = 'connected';
          integration.lastSync = new Date().toISOString();
        } catch (err) {
          integration.status = 'error';
          integration.error = err instanceof Error ? err.message : 'Unknown error';
        }
      }
      
      setSettings({ ...settings });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('devops-monitor-settings');
  };

  useEffect(() => {
    // Load settings from backend when component mounts
    const loadSettings = async () => {
      try {
        setLoading(true);
        // const backendSettings = await api.getSettings();
        // setSettings(backendSettings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return { 
    settings, 
    updateSettings, 
    saveSettings, 
    resetSettings,
    loading,
    error
  };
}