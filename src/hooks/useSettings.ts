import { useState, useEffect } from 'react';
import type { Settings } from '../types/settings';
import { IntegrationService } from '../services/integrations';
import { AlertService } from '../services/alerts';

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

  const integrationService = new IntegrationService();
  const alertService = new AlertService();

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    // Apply theme immediately
    document.documentElement.classList.toggle('dark', newSettings.general.theme === 'dark');
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Save to localStorage
      localStorage.setItem('devops-monitor-settings', JSON.stringify(settings));
      
      // Verify and connect integrations
      const updatedIntegrations = await Promise.all(
        settings.integrations.map(async (integration) => {
          try {
            let status;
            switch (integration.type) {
              case 'kubernetes':
                status = await integrationService.connectKubernetes(integration.config);
                break;
              case 'docker':
                status = await integrationService.connectDocker(integration.config);
                break;
              case 'jenkins':
                status = await integrationService.connectJenkins(integration.config);
                break;
              case 'azure_devops':
                status = await integrationService.connectAzureDevOps(integration.config);
                break;
              // Add other integration types
            }
            return {
              ...integration,
              status: 'connected',
              lastSync: new Date().toISOString()
            };
          } catch (err) {
            return {
              ...integration,
              status: 'error',
              error: err instanceof Error ? err.message : 'Connection failed'
            };
          }
        })
      );

      // Update alert rules
      await Promise.all(
        settings.alertRules.map(rule => 
          alertService.createAlertRule(rule)
        )
      );

      setSettings(prev => ({
        ...prev,
        integrations: updatedIntegrations
      }));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('devops-monitor-settings');
    document.documentElement.classList.remove('dark');
  };

  // Load settings on mount
  useEffect(() => {
    const theme = settings.general.theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
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