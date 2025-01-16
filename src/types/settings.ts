import type { AlertRule } from './alerts';

export interface Integration {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: any[];
  actions: any[];
}

export interface Settings {
  general: {
    theme: 'light' | 'dark';
    security: {
      mfa: boolean;
      sessionTimeout: number;
      apiKeyRotation: number;
    };
    notifications: {
      email: boolean;
      slack: boolean;
      inApp: boolean;
    };
  };
  integrations: Integration[];
  alertRules: AlertRule[];
}