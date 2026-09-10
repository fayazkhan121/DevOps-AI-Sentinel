import { apiFetch } from '@/lib/apiClient';
import { AnomalyPrediction, LogCluster } from '../types/anomalies';

export class AnomalyDetectionService {
  async detectLogAnomalies(logs: string[]): Promise<LogCluster[]> {
    const data = await apiFetch<{ clusters: Array<{ pattern: string; count: number; logs: string[]; severity: string }> }>('/anomalies/logs', {
      method: 'POST',
      body: JSON.stringify({ logs }),
    });
    return (data.clusters || []).map((cluster, i) => ({
      id: `cluster-${i}`,
      pattern: cluster.pattern,
      count: cluster.count,
      logs: cluster.logs,
      severity: cluster.severity === 'high' ? 'anomalous' : cluster.severity === 'medium' ? 'suspicious' : 'normal',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    }));
  }

  async detectMetricAnomalies(): Promise<AnomalyPrediction[]> {
    const data = await apiFetch<{ anomalies: Array<{ value: number; timestamp: string; zScore: number; isAnomaly: boolean; severity: 'low' | 'medium' | 'high' }> }>('/anomalies');
    return (data.anomalies || []).map((a) => ({
      timestamp: a.timestamp,
      metric: 'cpu_usage',
      value: a.value,
      predicted: a.value,
      isAnomaly: a.isAnomaly,
      confidence: Math.min(99, Math.round(a.zScore * 20)),
      severity: a.severity,
    }));
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
