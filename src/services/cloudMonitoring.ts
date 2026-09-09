import { apiFetch } from '@/lib/apiClient';
import { CloudProvider, CloudResource, PlatformMetric } from '../types';

export interface CloudCredentials {
  aws?: { accessKeyId: string; secretAccessKey: string; region: string };
  azure?: { tenantId: string; clientId: string; clientSecret: string; subscriptionId: string };
  gcp?: { projectId: string; keyFilename?: string; credentials?: unknown };
}

export class CloudMonitoringService {
  private status: Record<string, boolean> = {};

  async refreshStatus(): Promise<void> {
    try {
      const data = await apiFetch<{ integrations: Array<{ type: string; status: string }> }>('/integrations');
      this.status = {};
      for (const row of data.integrations || []) {
        this.status[row.type] = row.status === 'connected';
      }
    } catch {
      this.status = {};
    }
  }

  startMonitoring(_cb?: (metrics: PlatformMetric[]) => void): void {
    void this.refreshStatus();
  }

  stopMonitoring(): void {}

  updateCredentials(credentials: CloudCredentials): void {
    const entries: Array<[string, unknown]> = [
      ['aws', credentials.aws],
      ['azure', credentials.azure],
      ['gcp', credentials.gcp],
    ];
    for (const [type, cfg] of entries) {
      if (!cfg) continue;
      void apiFetch('/integrations', {
        method: 'POST',
        body: JSON.stringify({ type, name: type.toUpperCase(), config: cfg }),
      }).then(() => this.refreshStatus());
    }
  }

  getProviderStatus(): { [key: string]: boolean } {
    void this.refreshStatus();
    return { ...this.status };
  }

  isMonitoring(): boolean {
    return Object.values(this.status).some(Boolean);
  }

  async getCostAnalysis(): Promise<{ total: number; aws: number; azure: number; gcp: number }> {
    const data = await apiFetch<{ metrics: Array<{ name: string; value: number; source: string }> }>('/metrics?hours=24');
    const cost = (data.metrics || []).filter((m) => m.name.includes('cost'));
    const by = (src: string) => cost.filter((m) => m.source === src).reduce((s, m) => s + m.value, 0);
    return { total: cost.reduce((s, m) => s + m.value, 0), aws: by('aws'), azure: by('azure'), gcp: by('gcp') };
  }

  async getResourceInventory(): Promise<CloudResource[]> {
    const data = await apiFetch<{ metrics: Array<{ name: string; value: number; source: string }> }>('/metrics/latest');
    return (data.metrics || [])
      .filter((m) => m.name.includes('instance') || m.name.includes('vm') || m.name.includes('ec2'))
      .map((m, i) => ({
        id: `${m.source}-${i}`,
        name: m.name,
        type: m.source,
        status: 'running',
        region: 'configured',
        metrics: { cpu: m.value, memory: 0, network: 0, cost: 0 },
      }));
  }
}

export const cloudMonitoring = new CloudMonitoringService();
