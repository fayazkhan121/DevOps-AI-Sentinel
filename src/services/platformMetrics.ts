import { apiFetch } from '@/lib/apiClient';

export interface PlatformMetric {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded";
  uptime: string;
  responseTime: string;
  errorRate: string;
  lastIncident: string;
}

function fromRows(rows: Array<{ name: string; value: number; timestamp: string }>): PlatformMetric[] {
  const byTs = new Map<string, PlatformMetric>();
  for (const row of rows) {
    const current = byTs.get(row.timestamp) || { timestamp: row.timestamp, cpu: 0, memory: 0, disk: 0, network: 0 };
    if (row.name === 'cpu_usage') current.cpu = row.value;
    if (row.name === 'memory_usage') current.memory = row.value;
    if (row.name === 'disk_usage') current.disk = row.value;
    if (row.name.includes('network')) current.network = row.value;
    byTs.set(row.timestamp, current);
  }
  return Array.from(byTs.values());
}

export const fetchPlatformMetrics = async (): Promise<PlatformMetric[]> => {
  const data = await apiFetch<{ metrics: Array<{ name: string; value: number; timestamp: string }> }>('/metrics?hours=6');
  const mapped = fromRows(data.metrics || []);
  return mapped.length ? mapped : [{
    timestamp: new Date().toISOString(),
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
  }];
};

export const fetchServiceStatuses = async (): Promise<ServiceStatus[]> => {
  const data = await apiFetch<{ services?: ServiceStatus[]; overview?: unknown; latest?: unknown[] }>('/metrics/overview');
  if (data.services && data.services.length > 0) return data.services;
  return [{
    name: 'sentinel-api',
    status: 'healthy',
    uptime: 'n/a',
    responseTime: 'n/a',
    errorRate: '0%',
    lastIncident: new Date().toISOString(),
  }];
};

export const saveSetting = async () => true;
export const getSetting = async () => null;
export const saveMetric = async () => true;
export const getMetrics = fetchPlatformMetrics;
