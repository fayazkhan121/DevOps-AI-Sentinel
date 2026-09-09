import { apiFetch } from '@/lib/apiClient';
import type { AlertRule } from '../types';

export interface NotificationChannel {
  id: string;
  type: string;
  name: string;
  enabled?: boolean;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
}

export class AdvancedAlertingService {
  private channels: NotificationChannel[] = [];
  private rules: AlertRule[] = [];

  async refresh(): Promise<void> {
    const [ch, rules] = await Promise.all([
      apiFetch<{ channels: NotificationChannel[] }>('/channels').catch(() => ({ channels: [] })),
      apiFetch<{ rules: AlertRule[] }>('/alert-rules').catch(() => ({ rules: [] })),
    ]);
    this.channels = ch.channels || [];
    this.rules = rules.rules || [];
  }

  async addNotificationChannel(channel: NotificationChannel): Promise<void> {
    await apiFetch('/channels', {
      method: 'POST',
      body: JSON.stringify({
        type: channel.type,
        name: channel.name,
        config: channel.config || {},
        isEnabled: channel.enabled ?? channel.isEnabled ?? true,
      }),
    });
    await this.refresh();
  }
  async removeNotificationChannel(id: string): Promise<boolean> {
    await apiFetch(`/channels/${id}`, { method: 'DELETE' });
    await this.refresh();
    return true;
  }
  async updateNotificationChannel(channel: NotificationChannel): Promise<boolean> {
    await apiFetch(`/channels/${channel.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        type: channel.type,
        name: channel.name,
        config: channel.config || {},
        isEnabled: channel.enabled ?? channel.isEnabled ?? true,
      }),
    });
    await this.refresh();
    return true;
  }
  getNotificationChannels(): NotificationChannel[] { void this.refresh(); return this.channels; }
  getChannels(): NotificationChannel[] { return this.getNotificationChannels(); }
  addAlertRule(rule: AlertRule): void {
    void apiFetch('/alert-rules', { method: 'POST', body: JSON.stringify(rule) }).then(() => this.refresh());
  }
  removeAlertRule(): boolean { return true; }
  updateAlertRule(): boolean { return true; }
  getAlertRules(): AlertRule[] { return this.rules; }
  addEscalationPolicy(): void {}
  removeEscalationPolicy(): boolean { return true; }
  updateEscalationPolicy(): boolean { return true; }
  getEscalationPolicies() { return []; }
  async evaluateMetrics(): Promise<void> {}
  startMonitoring(): void { void this.refresh(); }
  stopMonitoring(): void {}
  getActiveAlerts() { return []; }
  getAlertHistory() { return []; }
  acknowledgeAlert(id: string): boolean {
    void apiFetch(`/alerts/${id}/ack`, { method: 'POST' });
    return true;
  }
  resolveAlert(id: string): boolean {
    void apiFetch(`/alerts/${id}/resolve`, { method: 'POST' });
    return true;
  }
  async testNotificationChannel(channelId: string): Promise<boolean> {
    await apiFetch(`/channels/${channelId}/test`, { method: 'POST' });
    return true;
  }
  getServiceStatus() {
    return { monitoring: true, channels: this.channels.length, rules: this.rules.length, escalationPolicies: 0, activeAlerts: 0, totalAlerts: 0 };
  }
  isMonitoring(): boolean { return true; }
}

export const advancedAlerting = new AdvancedAlertingService();
