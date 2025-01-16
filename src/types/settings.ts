import type { AlertRule } from './alerts';

export interface Integration {
  id: string;
  type: string;
  name: string;
  config: {
    // Common fields
    [key: string]: any;
    
    // Monitoring specific fields
    monitoring?: {
      prometheus?: boolean;
      grafana?: boolean;
      alertManager?: boolean;
      retention?: string;
      scrapeInterval?: string;
    };
  };
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  error?: string;
}

export interface Settings {
  integrations: Integration[];
  alertRules: AlertRule[];
  general: {
    theme: 'light' | 'dark';
    refreshInterval: number;
    timezone: string;
    retentionPeriod: string;
    notifications: {
      email: boolean;
      slack: boolean;
      inApp: boolean;
    };
    security: {
      mfa: boolean;
      sessionTimeout: number;
      apiKeyRotation: number;
    };
  };
}