import { apiFetch } from '@/lib/apiClient';
import type { PerformanceMetrics } from '../types';

export interface MonitoringTarget {
  id: string;
  name: string;
  type: string;
  target: string;
  interval: number;
  timeout: number;
  retries: number;
  isEnabled: boolean;
  lastStatus?: 'healthy' | 'unhealthy' | 'unknown';
}

export interface MonitoringResult {
  targetId: string;
  timestamp: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
}

export class AdvancedMonitoringService {
  private targets: MonitoringTarget[] = [];
  private callbacks = new Map<string, () => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private overall: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  private perf: PerformanceMetrics = {
    timestamp: new Date().toISOString(),
    responseTime: 0,
    throughput: 0,
    errorRate: 0,
    availability: 100,
    cpuUtilization: 0,
    memoryUtilization: 0,
  };

  startMonitoring(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), 15000);
  }
  stopMonitoring(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  private async refresh() {
    const data = await apiFetch<{ overview: { systemHealth: number; responseTimeMs: number }; latest: Array<{ name: string; value: number; source: string }> }>('/metrics/overview');
    const cpu = data.latest?.find((m) => m.name === 'cpu_usage')?.value || 0;
    const health = data.overview?.systemHealth ?? 100;
    this.overall = health < 50 ? 'unhealthy' : health < 80 ? 'degraded' : 'healthy';
    this.perf = {
      timestamp: new Date().toISOString(),
      responseTime: data.overview?.responseTimeMs || 0,
      throughput: 0,
      errorRate: 0,
      availability: health,
      cpuUtilization: cpu,
      memoryUtilization: data.latest?.find((m) => m.name === 'memory_usage')?.value || 0,
      diskUtilization: data.latest?.find((m) => m.name === 'disk_usage')?.value || 0,
      networkUtilization: data.latest?.find((m) => m.name === 'network_in_kb')?.value || 0,
    };
    const sources = Array.from(new Set((data.latest || []).map((m) => m.source)));
    this.targets = sources.map((source) => ({
      id: source,
      name: source,
      type: 'custom',
      target: source,
      interval: 30,
      timeout: 10,
      retries: 1,
      isEnabled: true,
      lastStatus: 'healthy' as const,
    }));
    this.callbacks.forEach((cb) => cb());
  }
  onTargetUpdate(targetId: string, cb: () => void): void { this.callbacks.set(targetId, cb); }
  removeTargetCallback(targetId: string): void { this.callbacks.delete(targetId); }
  getAllTargets(): MonitoringTarget[] { return this.targets; }
  getOverallStatus() { return this.overall; }
  getPerformanceMetrics() { return this.perf; }
  addTarget(target: MonitoringTarget): void { this.targets.push(target); }
  removeTarget(id: string): boolean {
    const before = this.targets.length;
    this.targets = this.targets.filter((t) => t.id !== id);
    return this.targets.length < before;
  }
  getTarget(id: string) { return this.targets.find((t) => t.id === id); }
  updateTarget(id: string, updates: Partial<MonitoringTarget>): boolean {
    const t = this.getTarget(id);
    if (!t) return false;
    Object.assign(t, updates);
    return true;
  }
  getTargetResults(): MonitoringResult[] { return []; }
  getTargetStatus(): 'healthy' | 'unhealthy' | 'unknown' { return this.overall === 'unhealthy' ? 'unhealthy' : 'healthy'; }
  updateConfig(): void {}
  getConfig() { return { enabled: true, interval: 30, retention: 7, alerting: true, logging: true, metrics: { system: true, application: true, network: true, database: true, custom: true } }; }
  isMonitoring(): boolean { return this.timer !== null; }
}

export const advancedMonitoring = new AdvancedMonitoringService();
