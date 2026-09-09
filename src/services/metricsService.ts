import { apiFetch } from '@/lib/apiClient';

export interface SystemMetric {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

export class MetricsService {
  private static instance: MetricsService;
  static getInstance(): MetricsService {
    if (!MetricsService.instance) MetricsService.instance = new MetricsService();
    return MetricsService.instance;
  }

  private latest: Record<string, number> = {};

  async refresh(): Promise<void> {
    const data = await apiFetch<{ metrics: Array<{ name: string; value: number }> }>('/metrics/latest');
    for (const metric of data.metrics || []) {
      this.latest[metric.name] = metric.value;
    }
  }

  generateSystemMetrics(): SystemMetric {
    return {
      timestamp: new Date().toISOString(),
      cpuUsage: this.latest.cpu_usage || 0,
      memoryUsage: this.latest.memory_usage || 0,
      diskUsage: this.latest.disk_usage || 0,
      networkIn: this.latest.network_in_kb || 0,
      networkOut: this.latest.network_out_kb || 0,
      activeConnections: 1,
      responseTime: this.latest.cpu_usage || 0,
      errorRate: 0,
      throughput: this.latest.load_average || 0,
    };
  }

  generateServiceMetrics() {
    return [{
      name: 'sentinel-api',
      status: 'healthy' as const,
      responseTime: this.latest.cpu_usage || 0,
      uptime: 100,
      lastCheck: new Date().toISOString(),
      errorCount: 0,
      requestCount: 0,
    }];
  }

  generateBusinessMetrics() {
    return {
      activeUsers: 0,
      revenue: 0,
      transactions: 0,
      conversionRate: 0,
      customerSatisfaction: 0,
    };
  }

  generateAlerts() {
    return [];
  }

  generateLogs() {
    return [];
  }

  getHistoricalData(metric: string, hours = 24) {
    return apiFetch<{ metrics: Array<{ value: number; timestamp: string }> }>(`/metrics?name=${encodeURIComponent(metric)}&hours=${hours}`)
      .then((data) => (data.metrics || []).map((row) => ({
        timestamp: row.timestamp,
        value: row.value,
      })))
      .catch(() => []);
  }

  async updateDashboardWidgets(_dashboardId: string): Promise<void> {
    await this.refresh();
  }
}

export const metricsService = MetricsService.getInstance();
