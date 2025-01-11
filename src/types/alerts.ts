export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook'
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  conditions: {
    metric: string;
    operator: '>' | '<' | '==' | '>=' | '<=';
    threshold: number;
    duration?: string;
  }[];
  channels: {
    type: AlertChannel;
    config: any;
  }[];
  enabled: boolean;
}

export interface AlertNotification {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  channel: AlertChannel;
  metadata: any;
}