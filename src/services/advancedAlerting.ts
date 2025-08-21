import { AlertRule, EmailAlert, PlatformMetric } from '../types';
import { advancedDatabase } from './advancedDatabase';

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push';
  name: string;
  config: any;
  enabled: boolean;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  value: number;
  duration?: number; // Duration in seconds for sustained conditions
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'script' | 'escalation';
  config: any;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
  enabled: boolean;
}

export interface EscalationLevel {
  level: number;
  delay: number; // Delay in minutes before escalating
  actions: AlertAction[];
  contacts: string[];
}

export class AdvancedAlertingService {
  private channels: Map<string, NotificationChannel> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private activeAlerts: Map<string, any> = new Map();
  private alertHistory: any[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsCallback: ((metrics: PlatformMetric[]) => void) | null = null;

  constructor() {
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
    this.initializeDefaultEscalationPolicies();
  }

  private initializeDefaultChannels(): void {
    // Email channel
    this.channels.set('email-default', {
      id: 'email-default',
      type: 'email',
      name: 'Default Email',
      config: {
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: '',
            pass: ''
          }
        },
        from: '',
        to: []
      },
      enabled: false
    });

    // Slack channel
    this.channels.set('slack-default', {
      id: 'slack-default',
      type: 'slack',
      name: 'Default Slack',
      config: {
        webhookUrl: '',
        channel: '#alerts',
        username: 'DevOps AI Sentinel'
      },
      enabled: false
    });

    // Webhook channel
    this.channels.set('webhook-default', {
      id: 'webhook-default',
      type: 'webhook',
      name: 'Default Webhook',
      config: {
        url: '',
        method: 'POST',
        headers: {},
        timeout: 30000
      },
      enabled: false
    });
  }

  private initializeDefaultRules(): void {
    // High CPU Usage Rule
    this.rules.set('high-cpu-usage', {
      id: 'high-cpu-usage',
      name: 'High CPU Usage',
      description: 'Alert when CPU usage exceeds 80% for more than 5 minutes',
      conditions: [{
        metric: 'cpu_usage',
        operator: 'gt',
        value: 80,
        duration: 300
      }],
      severity: 'warning',
      enabled: true,
      actions: ['email-default', 'slack-default'],
      tags: ['performance', 'cpu']
    });

    // High Memory Usage Rule
    this.rules.set('high-memory-usage', {
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      description: 'Alert when memory usage exceeds 90%',
      conditions: [{
        metric: 'memory_usage',
        operator: 'gt',
        value: 90,
        duration: 60
      }],
      severity: 'critical',
      enabled: true,
      actions: ['email-default', 'slack-default', 'webhook-default'],
      tags: ['performance', 'memory']
    });

    // Service Down Rule
    this.rules.set('service-down', {
      id: 'service-down',
      name: 'Service Down',
      description: 'Alert when service health check fails',
      conditions: [{
        metric: 'service_health',
        operator: 'eq',
        value: 0,
        duration: 30
      }],
      severity: 'critical',
      enabled: true,
      actions: ['email-default', 'slack-default', 'webhook-default'],
      tags: ['availability', 'service']
    });
  }

  private initializeDefaultEscalationPolicies(): void {
    // Critical Issues Escalation
    this.escalationPolicies.set('critical-issues', {
      id: 'critical-issues',
      name: 'Critical Issues Escalation',
      levels: [
        {
          level: 1,
          delay: 5, // 5 minutes
          actions: [{ type: 'notification', config: { channels: ['email-default'] } }],
          contacts: ['oncall@company.com']
        },
        {
          level: 2,
          delay: 15, // 15 minutes
          actions: [{ type: 'notification', config: { channels: ['slack-default', 'webhook-default'] } }],
          contacts: ['manager@company.com', 'devops@company.com']
        },
        {
          level: 3,
          delay: 30, // 30 minutes
          actions: [{ type: 'notification', config: { channels: ['email-default', 'slack-default'] } }],
          contacts: ['cto@company.com', 'emergency@company.com']
        }
      ],
      enabled: true
    });
  }

  // Channel Management
  addNotificationChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    console.log(`Notification channel ${channel.name} added`);
  }

  removeNotificationChannel(channelId: string): boolean {
    const removed = this.channels.delete(channelId);
    if (removed) {
      console.log(`Notification channel ${channelId} removed`);
    }
    return removed;
  }

  updateNotificationChannel(channelId: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.channels.get(channelId);
    if (channel) {
      Object.assign(channel, updates);
      console.log(`Notification channel ${channelId} updated`);
      return true;
    }
    return false;
  }

  getNotificationChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  // Rule Management
  addAlertRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`Alert rule ${rule.name} added`);
  }

  removeAlertRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      console.log(`Alert rule ${ruleId} removed`);
    }
    return removed;
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      console.log(`Alert rule ${ruleId} updated`);
      return true;
    }
    return false;
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  // Escalation Policy Management
  addEscalationPolicy(policy: EscalationPolicy): void {
    this.escalationPolicies.set(policy.id, policy);
    console.log(`Escalation policy ${policy.name} added`);
  }

  removeEscalationPolicy(policyId: string): boolean {
    const removed = this.escalationPolicies.delete(policyId);
    if (removed) {
      console.log(`Escalation policy ${policyId} removed`);
    }
    return removed;
  }

  updateEscalationPolicy(policyId: string, updates: Partial<EscalationPolicy>): boolean {
    const policy = this.escalationPolicies.get(policyId);
    if (policy) {
      Object.assign(policy, updates);
      console.log(`Escalation policy ${policyId} updated`);
      return true;
    }
    return false;
  }

  getEscalationPolicies(): EscalationPolicy[] {
    return Array.from(this.escalationPolicies.values());
  }

  // Alert Evaluation
  async evaluateMetrics(metrics: PlatformMetric[]): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      for (const metric of metrics) {
        if (await this.evaluateRule(rule, metric)) {
          await this.triggerAlert(rule, metric);
        }
      }
    }
  }

  private async evaluateRule(rule: AlertRule, metric: PlatformMetric): Promise<boolean> {
    for (const condition of rule.conditions) {
      if (metric.name === condition.metric || metric.id === condition.metric) {
        const value = metric.value;
        const conditionMet = this.evaluateCondition(value, condition.operator, condition.value);
        
        if (conditionMet && condition.duration) {
          // Check if condition is sustained for the required duration
          return await this.checkSustainedCondition(rule.id, metric.id, condition);
        } else if (conditionMet) {
          return true;
        }
      }
    }
    return false;
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private async checkSustainedCondition(ruleId: string, metricId: string, condition: AlertCondition): Promise<boolean> {
    const alertKey = `${ruleId}-${metricId}`;
    const now = Date.now();
    
    if (!this.activeAlerts.has(alertKey)) {
      this.activeAlerts.set(alertKey, {
        startTime: now,
        ruleId,
        metricId,
        condition
      });
      return false;
    }

    const alert = this.activeAlerts.get(alertKey);
    const duration = (now - alert.startTime) / 1000; // Convert to seconds
    
    return duration >= (condition.duration || 0);
  }

  private async triggerAlert(rule: AlertRule, metric: PlatformMetric): Promise<void> {
    const alert = {
      id: `${rule.id}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `Alert: ${rule.name} - ${metric.name} = ${metric.value}`,
      metric: metric,
      timestamp: new Date().toISOString(),
      status: 'active',
      actions: rule.actions
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Execute actions
    await this.executeAlertActions(alert);

    // Check for escalation
    await this.checkEscalation(alert);

    console.log(`Alert triggered: ${alert.message}`);
  }

  private async executeAlertActions(alert: any): Promise<void> {
    for (const actionId of alert.actions) {
      const channel = this.channels.get(actionId);
      if (channel && channel.enabled) {
        try {
          switch (channel.type) {
            case 'email':
              await this.sendEmailAlert(channel, alert);
              break;
            case 'slack':
              await this.sendSlackAlert(channel, alert);
              break;
            case 'webhook':
              await this.sendWebhookAlert(channel, alert);
              break;
            default:
              console.log(`Unsupported notification type: ${channel.type}`);
          }
        } catch (error) {
          console.error(`Failed to execute action ${actionId}:`, error);
        }
      }
    }
  }

  private async sendEmailAlert(channel: NotificationChannel, alert: any): Promise<void> {
    try {
      // In a real implementation, this would send an email
      // For now, we'll simulate it
      console.log(`Email alert sent via ${channel.name}:`, {
        to: channel.config.to,
        subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
        body: alert.message
      });

      // Store in database
      await advancedDatabase.saveAlert({
        id: alert.id,
        type: 'email',
        channel: channel.id,
        alert: alert,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  private async sendSlackAlert(channel: NotificationChannel, alert: any): Promise<void> {
    try {
      // In a real implementation, this would send a Slack message
      // For now, we'll simulate it
      console.log(`Slack alert sent via ${channel.name}:`, {
        channel: channel.config.channel,
        message: `[${alert.severity.toUpperCase()}] ${alert.message}`
      });

      // Store in database
      await advancedDatabase.saveAlert({
        id: alert.id,
        type: 'slack',
        channel: channel.id,
        alert: alert,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private async sendWebhookAlert(channel: NotificationChannel, alert: any): Promise<void> {
    try {
      // In a real implementation, this would send an HTTP request
      // For now, we'll simulate it
      console.log(`Webhook alert sent via ${channel.name}:`, {
        url: channel.config.url,
        method: channel.config.method,
        data: {
          alert: alert,
          timestamp: new Date().toISOString()
        }
      });

      // Store in database
      await advancedDatabase.saveAlert({
        id: alert.id,
        type: 'webhook',
        channel: channel.id,
        alert: alert,
        timestamp: new Date().toISOString(),
        status: 'sent'
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  private async checkEscalation(alert: any): Promise<void> {
    // Find applicable escalation policies
    for (const policy of this.escalationPolicies.values()) {
      if (policy.enabled && this.shouldEscalate(alert, policy)) {
        await this.executeEscalation(policy, alert);
      }
    }
  }

  private shouldEscalate(alert: any, policy: EscalationPolicy): boolean {
    // Simple escalation logic - escalate critical alerts
    return alert.severity === 'critical';
  }

  private async executeEscalation(policy: EscalationPolicy, alert: any): Promise<void> {
    console.log(`Executing escalation policy: ${policy.name}`);
    
    for (const level of policy.levels) {
      // In a real implementation, this would handle delays and execute actions
      console.log(`Escalation level ${level.level}: ${level.contacts.join(', ')}`);
    }
  }

  // Start monitoring
  startMonitoring(callback: (metrics: PlatformMetric[]) => void): void {
    this.metricsCallback = callback;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      if (this.metricsCallback) {
        // In a real implementation, this would collect metrics from various sources
        // For now, we'll use the callback to get metrics
        console.log('Alerting service monitoring active');
      }
    }, 10000); // Check every 10 seconds

    console.log('Advanced alerting service started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Advanced alerting service stopped');
  }

  // Get alerts
  getActiveAlerts(): any[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit?: number): any[] {
    const history = [...this.alertHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date().toISOString();
      console.log(`Alert ${alertId} acknowledged`);
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
      this.activeAlerts.delete(alertId);
      console.log(`Alert ${alertId} resolved`);
      return true;
    }
    return false;
  }

  // Test notification channels
  async testNotificationChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const testAlert = {
      id: `test-${Date.now()}`,
      ruleId: 'test',
      ruleName: 'Test Alert',
      severity: 'info',
      message: 'This is a test alert to verify channel configuration',
      metric: { name: 'test', value: 0 },
      timestamp: new Date().toISOString(),
      status: 'test',
      actions: [channelId]
    };

    try {
      await this.executeAlertActions(testAlert);
      return true;
    } catch (error) {
      console.error('Channel test failed:', error);
      return false;
    }
  }

  // Get service status
  getServiceStatus(): { [key: string]: any } {
    return {
      monitoring: this.monitoringInterval !== null,
      channels: this.channels.size,
      rules: this.rules.size,
      escalationPolicies: this.escalationPolicies.size,
      activeAlerts: this.activeAlerts.size,
      totalAlerts: this.alertHistory.length
    };
  }

  isMonitoring(): boolean {
    return this.monitoringInterval !== null;
  }
}

export const advancedAlerting = new AdvancedAlertingService(); 