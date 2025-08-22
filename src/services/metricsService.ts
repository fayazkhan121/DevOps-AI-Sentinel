import { dashboardService } from './dashboardService';

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

export interface ServiceMetric {
  serviceName: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  responseTime: number;
  uptime: number;
  lastCheck: string;
  errorCount: number;
  requestCount: number;
}

export interface BusinessMetric {
  timestamp: string;
  activeUsers: number;
  revenue: number;
  transactions: number;
  conversionRate: number;
  customerSatisfaction: number;
}

export class MetricsService {
  private static instance: MetricsService;
  private metricsHistory: Map<string, any[]> = new Map();
  private lastUpdate: number = Date.now();

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // Generate realistic system metrics
  generateSystemMetrics(): SystemMetric {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdate;
    this.lastUpdate = now;

    // Simulate realistic variations
    const baseCPU = 45 + Math.sin(now / 60000) * 20; // Varies over time
    const baseMemory = 60 + Math.sin(now / 45000) * 15;
    const baseDisk = 55 + Math.sin(now / 120000) * 10;

    return {
      timestamp: new Date(now).toISOString(),
      cpuUsage: Math.max(0, Math.min(100, baseCPU + (Math.random() - 0.5) * 10)),
      memoryUsage: Math.max(0, Math.min(100, baseMemory + (Math.random() - 0.5) * 8)),
      diskUsage: Math.max(0, Math.min(100, baseDisk + (Math.random() - 0.5) * 5)),
      networkIn: Math.max(0, 100 + (Math.random() - 0.5) * 50),
      networkOut: Math.max(0, 80 + (Math.random() - 0.5) * 40),
      activeConnections: Math.floor(50 + Math.random() * 100),
      responseTime: Math.max(10, 50 + (Math.random() - 0.5) * 80),
      errorRate: Math.max(0, Math.min(5, 0.5 + Math.random() * 2)),
      throughput: Math.max(0, 1000 + (Math.random() - 0.5) * 500)
    };
  }

  // Generate service health metrics
  generateServiceMetrics(): ServiceMetric[] {
    const services = [
      'Web Server',
      'Database',
      'Cache Service',
      'Load Balancer',
      'API Gateway',
      'Message Queue',
      'File Storage',
      'Monitoring Service'
    ];

    return services.map(service => {
      const isHealthy = Math.random() > 0.1; // 90% healthy
      const status = isHealthy ? 'healthy' : (Math.random() > 0.5 ? 'warning' : 'critical');
      
      return {
        serviceName: service,
        status,
        responseTime: Math.max(5, 20 + Math.random() * 100),
        uptime: Math.max(95, 99 + Math.random() * 0.9),
        lastCheck: new Date(Date.now() - Math.random() * 60000).toISOString(),
        errorCount: Math.floor(Math.random() * (isHealthy ? 5 : 50)),
        requestCount: Math.floor(100 + Math.random() * 900)
      };
    });
  }

  // Generate business metrics
  generateBusinessMetrics(): BusinessMetric {
    const now = Date.now();
    const hour = new Date(now).getHours();
    
    // Simulate business hours patterns
    const isBusinessHours = hour >= 9 && hour <= 17;
    const businessMultiplier = isBusinessHours ? 1.5 : 0.3;
    
    return {
      timestamp: new Date(now).toISOString(),
      activeUsers: Math.floor((100 + Math.random() * 200) * businessMultiplier),
      revenue: Math.floor((1000 + Math.random() * 5000) * businessMultiplier),
      transactions: Math.floor((50 + Math.random() * 150) * businessMultiplier),
      conversionRate: Math.max(1, Math.min(10, 3 + (Math.random() - 0.5) * 4)),
      customerSatisfaction: Math.max(70, Math.min(100, 85 + (Math.random() - 0.5) * 20))
    };
  }

  // Generate alert data
  generateAlerts(): any[] {
    const alertTypes = [
      { severity: 'info', message: 'System backup completed successfully' },
      { severity: 'warning', message: 'High memory usage detected' },
      { severity: 'critical', message: 'Database connection timeout' },
      { severity: 'info', message: 'New deployment deployed to production' },
      { severity: 'warning', message: 'Response time above threshold' }
    ];

    const alerts = [];
    const numAlerts = Math.floor(Math.random() * 3) + 1; // 1-3 alerts

    for (let i = 0; i < numAlerts; i++) {
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      alerts.push({
        id: `alert-${Date.now()}-${i}`,
        severity: alertType.severity,
        message: alertType.message,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Last hour
        source: 'System Monitor',
        acknowledged: Math.random() > 0.7
      });
    }

    return alerts;
  }

  // Generate log data
  generateLogs(): any[] {
    const logLevels = ['info', 'warn', 'error', 'debug'];
    const services = ['web-server', 'database', 'api', 'cache', 'auth'];
    const messages = [
      'Request processed successfully',
      'Database query executed',
      'Cache hit',
      'User authentication successful',
      'File uploaded',
      'Email sent',
      'Payment processed',
      'Backup started'
    ];

    const logs = [];
    const numLogs = Math.floor(Math.random() * 10) + 5; // 5-15 logs

    for (let i = 0; i < numLogs; i++) {
      logs.push({
        id: `log-${Date.now()}-${i}`,
        level: logLevels[Math.floor(Math.random() * logLevels.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(), // Last 5 minutes
        service: services[Math.floor(Math.random() * services.length)],
        userId: Math.random() > 0.8 ? `user-${Math.floor(Math.random() * 1000)}` : null,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`
      });
    }

    return logs;
  }

  // Get historical data for charts
  getHistoricalData(metric: string, hours: number = 24): any[] {
    const data = [];
    const now = Date.now();
    const interval = (hours * 60 * 60 * 1000) / 24; // 24 data points

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now - i * interval).toISOString();
      let value = 0;

      switch (metric) {
        case 'cpu':
          value = 45 + Math.sin((now - i * interval) / 60000) * 20 + (Math.random() - 0.5) * 10;
          break;
        case 'memory':
          value = 60 + Math.sin((now - i * interval) / 45000) * 15 + (Math.random() - 0.5) * 8;
          break;
        case 'disk':
          value = 55 + Math.sin((now - i * interval) / 120000) * 10 + (Math.random() - 0.5) * 5;
          break;
        case 'network':
          value = 100 + Math.sin((now - i * interval) / 30000) * 30 + (Math.random() - 0.5) * 20;
          break;
        case 'responseTime':
          value = 50 + Math.sin((now - i * interval) / 45000) * 25 + (Math.random() - 0.5) * 15;
          break;
        default:
          value = 50 + (Math.random() - 0.5) * 50;
      }

      data.push({
        timestamp,
        value: Math.max(0, Math.min(100, value))
      });
    }

    return data;
  }

  // Update dashboard widgets with fresh data
  async updateDashboardWidgets(dashboardId: string): Promise<void> {
    try {
      const dashboard = await dashboardService.getDashboard(dashboardId);
      if (!dashboard) return;

      const updatedWidgets = await Promise.all(
        dashboard.widgets.map(async (widget) => {
          let data = null;

          switch (widget.type) {
            case 'metric':
              if (widget.title.includes('CPU')) {
                data = { value: this.generateSystemMetrics().cpuUsage, unit: '%', trend: 'up', change: 2.1 };
              } else if (widget.title.includes('Memory')) {
                data = { value: this.generateSystemMetrics().memoryUsage, unit: '%', trend: 'down', change: -1.5 };
              } else if (widget.title.includes('Health')) {
                data = { value: 98.5, unit: '%', trend: 'up', change: 0.8 };
              } else {
                data = { value: Math.floor(Math.random() * 100), unit: '%', trend: Math.random() > 0.5 ? 'up' : 'down', change: Math.floor(Math.random() * 20) };
              }
              break;

            case 'chart':
              if (widget.title.includes('CPU')) {
                data = this.getHistoricalData('cpu');
              } else if (widget.title.includes('Memory')) {
                data = this.getHistoricalData('memory');
              } else if (widget.title.includes('Network')) {
                data = this.getHistoricalData('network');
              } else {
                data = this.getHistoricalData('responseTime');
              }
              break;

            case 'status':
              data = this.generateServiceMetrics();
              break;

            case 'table':
              if (widget.title.includes('Alert')) {
                data = this.generateAlerts();
              } else if (widget.title.includes('Service')) {
                data = this.generateServiceMetrics();
              } else {
                data = this.generateLogs();
              }
              break;

            default:
              data = null;
          }

          return {
            ...widget,
            data,
            lastUpdated: new Date().toISOString()
          };
        })
      );

      await dashboardService.updateDashboard(dashboardId, {
        widgets: updatedWidgets,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update dashboard widgets:', error);
    }
  }
}

export const metricsService = MetricsService.getInstance();
