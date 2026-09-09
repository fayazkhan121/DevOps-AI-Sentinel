import { metricsService, SystemMetric } from './metricsService';

export interface SystemPerformance {
  cpu: { usage: number; cores?: number; temperature?: number; load?: number[] };
  memory: { used: number; total?: number; available?: number; cached?: number };
  disk: { used: number; total?: number; available?: number; iops?: number; latency?: number };
  network: { bytesIn: number; bytesOut: number; packetsIn?: number; packetsOut?: number; errors?: number; dropped?: number };
  processes?: { total: number; running: number; sleeping: number; stopped: number; zombie: number };
}

export interface ApplicationMetrics {
  responseTime: { p50: number; p90: number; p95: number; p99: number; average: number };
  throughput: { requestsPerSecond: number; transactionsPerSecond: number; errorsPerSecond: number };
  availability: { uptime: number; lastDowntime: string; sla: number };
  resources: { connections: number; threads: number; heapUsage: number; gcTime: number };
}

export interface BusinessMetrics {
  users: { active: number; total: number; new: number; returning: number };
  performance: { conversionRate: number; bounceRate: number; sessionDuration: number; pageLoadTime: number };
  revenue: { daily: number; monthly: number; growth: number; transactions: number };
  engagement: { pageViews: number; clicks: number; shares: number; comments: number };
}

export class RealTimeDataService {
  private static instance: RealTimeDataService;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private subscribers = new Map<string, Set<(data: unknown) => void>>();

  static getInstance(): RealTimeDataService {
    if (!RealTimeDataService.instance) RealTimeDataService.instance = new RealTimeDataService();
    return RealTimeDataService.instance;
  }

  startRealTimeUpdates(intervalMs = 5000) {
    if (this.updateInterval) clearInterval(this.updateInterval);
    void metricsService.refresh();
    this.updateInterval = setInterval(() => {
      void metricsService.refresh().then(() => this.updateAllMetrics());
    }, intervalMs);
  }

  stopRealTimeUpdates() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = null;
  }

  subscribe(metricType: string, callback: (data: unknown) => void): () => void {
    if (!this.subscribers.has(metricType)) this.subscribers.set(metricType, new Set());
    this.subscribers.get(metricType)!.add(callback);
    if (!this.updateInterval) this.startRealTimeUpdates();
    return () => this.subscribers.get(metricType)?.delete(callback);
  }

  getSystemPerformance(): SystemPerformance {
    const s: SystemMetric = metricsService.generateSystemMetrics();
    return {
      cpu: { usage: s.cpuUsage, load: [s.throughput] },
      memory: { used: s.memoryUsage },
      disk: { used: s.diskUsage },
      network: { bytesIn: s.networkIn, bytesOut: s.networkOut },
      processes: { total: 1, running: 1, sleeping: 0, stopped: 0, zombie: 0 },
    };
  }

  getApplicationMetrics(): ApplicationMetrics {
    const s = metricsService.generateSystemMetrics();
    return {
      responseTime: { p50: s.responseTime, p90: s.responseTime, p95: s.responseTime, p99: s.responseTime, average: s.responseTime },
      throughput: { requestsPerSecond: s.throughput, transactionsPerSecond: s.throughput, errorsPerSecond: s.errorRate },
      availability: { uptime: 100, lastDowntime: new Date(0).toISOString(), sla: 99.9 },
      resources: { connections: s.activeConnections, threads: 1, heapUsage: s.memoryUsage, gcTime: 0 },
    };
  }

  getBusinessMetrics(): BusinessMetrics {
    return {
      users: { active: 0, total: 0, new: 0, returning: 0 },
      performance: { conversionRate: 0, bounceRate: 0, sessionDuration: 0, pageLoadTime: 0 },
      revenue: { daily: 0, monthly: 0, growth: 0, transactions: 0 },
      engagement: { pageViews: 0, clicks: 0, shares: 0, comments: 0 },
    };
  }

  getAlerts() { return []; }
  getLogs() { return []; }
  getHistoricalData(metric: string, hours = 24) { return metricsService.getHistoricalData(metric, hours); }

  private updateAllMetrics() {
    this.notify('system_performance', this.getSystemPerformance());
    this.notify('application_metrics', this.getApplicationMetrics());
    this.notify('business_metrics', this.getBusinessMetrics());
  }

  private notify(type: string, data: unknown) {
    this.subscribers.get(type)?.forEach((cb) => cb(data));
  }

  getMetricStatus(value: number, warning: number, critical: number): 'healthy' | 'warning' | 'critical' {
    if (value >= critical) return 'critical';
    if (value >= warning) return 'warning';
    return 'healthy';
  }
  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / 1024 ** i * 100) / 100} ${sizes[i]}`;
  }
  formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }
  formatPercentage(value: number): string { return `${value.toFixed(2)}%`; }
  getTrendIndicator(current: number, previous: number): 'up' | 'down' | 'stable' {
    const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    if (change > 1) return 'up';
    if (change < -1) return 'down';
    return 'stable';
  }
}

export const realTimeDataService = RealTimeDataService.getInstance();
