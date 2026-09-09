import { apiFetch } from '@/lib/apiClient';
import type { AlertRule } from '../types';

export class AlertService {
  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const created = await apiFetch<{ id: string }>('/alert-rules', { method: 'POST', body: JSON.stringify(rule) });
    return { ...rule, id: created.id };
  }

  async updateAlertRule(id: string, rule: Partial<AlertRule>): Promise<AlertRule> {
    await apiFetch(`/alert-rules`, { method: 'POST', body: JSON.stringify({ ...rule, id }) });
    return { id, name: '', description: '', condition: { metric: '', operator: '>', value: 0, duration: '0' }, actions: {}, enabled: true, ...rule };
  }

  async sendEmailAlert(): Promise<unknown> {
    throw new Error('Use notification channels configured on the server');
  }

  async detectAnomalies(metrics: number[][]): Promise<boolean[]> {
    if (metrics.length < 8) return metrics.map(() => false);
    const values = metrics.map((m) => m[0] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
    return values.map((v) => Math.abs(v - mean) / std > 2.5);
  }
}

export const alertService = new AlertService();
