import { apiFetch } from '@/lib/apiClient';
import { AlertRule, AlertNotification, AlertChannel } from '../types/alerts';
import { AnomalyDetectionService } from './anomalyDetection';

export class AlertingService {
  private anomaly = new AnomalyDetectionService();

  async listRules(): Promise<AlertRule[]> {
    const data = await apiFetch<{ rules: AlertRule[] }>('/alert-rules');
    return data.rules || [];
  }

  async createRule(rule: Omit<AlertRule, 'id'>): Promise<void> {
    await apiFetch('/alert-rules', { method: 'POST', body: JSON.stringify(rule) });
  }

  async listChannels(): Promise<AlertChannel[]> {
    const data = await apiFetch<{ channels: AlertChannel[] }>('/channels');
    return data.channels || [];
  }

  async notify(_notification: AlertNotification): Promise<void> {
    return;
  }

  detectLogs(logs: string[]) {
    return this.anomaly.detectLogAnomalies(logs);
  }
}

export const alertingService = new AlertingService();
