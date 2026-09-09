import { apiFetch } from '@/lib/apiClient';
import type { ResourceMetrics, KubernetesMetrics } from '../types';

export class MonitoringService {
  async getResourceMetrics(resourceId: string, _timeRange: string): Promise<ResourceMetrics> {
    const data = await apiFetch<{ metrics: Array<{ name: string; value: number }> }>('/metrics/latest');
    const get = (name: string) => data.metrics?.find((m) => m.name === name)?.value || 0;
    return {
      id: resourceId,
      cpu: get('cpu_usage'),
      memory: get('memory_usage'),
      disk: get('disk_usage'),
      network: get('network_in_kb'),
      timestamp: new Date().toISOString(),
    } as ResourceMetrics;
  }

  async getAwsMetrics() {
    const data = await apiFetch<{ metrics: Array<{ source: string; name: string; value: number }> }>('/metrics?hours=1');
    return (data.metrics || []).filter((m) => m.source === 'aws');
  }

  async getAzureMetrics() {
    const data = await apiFetch<{ metrics: Array<{ source: string; name: string; value: number }> }>('/metrics?hours=1');
    return (data.metrics || []).filter((m) => m.source === 'azure');
  }

  async getGcpMetrics() {
    const data = await apiFetch<{ metrics: Array<{ source: string; name: string; value: number }> }>('/metrics?hours=1');
    return (data.metrics || []).filter((m) => m.source === 'gcp');
  }

  async getKubernetesMetrics(): Promise<KubernetesMetrics> {
    const data = await apiFetch<{ metrics: Array<{ name: string; value: number }> }>('/metrics/latest');
    const pods = data.metrics?.find((m) => m.name === 'k8s_pod_count')?.value || 0;
    const nodes = data.metrics?.find((m) => m.name === 'k8s_node_count')?.value || 0;
    return { nodes, pods } as KubernetesMetrics;
  }
}

export const monitoringService = new MonitoringService();
