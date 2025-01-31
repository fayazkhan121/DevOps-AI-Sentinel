import { saveSetting, getSetting } from './database';

export const saveSettings = async (key: string, value: any) => {
  return saveSetting(key, value);
};

export const getSettings = async (key: string) => {
  return getSetting(key);
};

export const initializeDefaultSettings = async () => {
  try {
    console.log('Initializing default settings');
    const defaultSettings = {
      general: {
        timeZone: 'UTC',
        refreshInterval: '30',
        retentionPeriod: '30'
      },
      notifications: {
        emailNotifications: false,
        slackNotifications: false,
        inAppNotifications: true
      },
      integrations: [],
      alerts: []
    };

    // Check each setting category and initialize if not exists
    for (const [key, value] of Object.entries(defaultSettings)) {
      const existingSettings = await getSettings(key);
      if (!existingSettings) {
        console.log(`Initializing default settings for ${key}`);
        await saveSettings(key, value);
      }
    }

    console.log('Default settings initialization complete');
    return true;
  } catch (error) {
    console.error('Error in initializeDefaultSettings:', error);
    throw new Error(`Failed to initialize default settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};