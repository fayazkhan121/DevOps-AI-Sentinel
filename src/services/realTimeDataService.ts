import { metricsService } from './metricsService';

export interface RealTimeMetric {
  timestamp: string;
  value: number;
  label: string;
  category: string;
  source: string;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface SystemPerformance {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    available: number;
    swap: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    iops: number;
    latency: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
    dropped: number;
  };
  processes: {
    total: number;
    running: number;
    sleeping: number;
    stopped: number;
    zombie: number;
  };
}

export interface ApplicationMetrics {
  responseTime: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    average: number;
  };
  throughput: {
    requestsPerSecond: number;
    transactionsPerSecond: number;
    errorsPerSecond: number;
  };
  availability: {
    uptime: number;
    lastDowntime: string;
    sla: number;
  };
  resources: {
    connections: number;
    threads: number;
    heapUsage: number;
    gcTime: number;
  };
}

export interface BusinessMetrics {
  users: {
    active: number;
    total: number;
    new: number;
    returning: number;
  };
  performance: {
    conversionRate: number;
    bounceRate: number;
    sessionDuration: number;
    pageLoadTime: number;
  };
  revenue: {
    daily: number;
    monthly: number;
    growth: number;
    transactions: number;
  };
  engagement: {
    pageViews: number;
    clicks: number;
    shares: number;
    comments: number;
  };
}

export class RealTimeDataService {
  private static instance: RealTimeDataService;
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  static getInstance(): RealTimeDataService {
    if (!RealTimeDataService.instance) {
      RealTimeDataService.instance = new RealTimeDataService();
    }
    return RealTimeDataService.instance;
  }

  // Start real-time data updates
  startRealTimeUpdates(intervalMs: number = 5000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateAllMetrics();
    }, intervalMs);
  }

  // Stop real-time updates
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Subscribe to metric updates
  subscribe(metricType: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(metricType)) {
      this.subscribers.set(metricType, new Set());
    }
    
    this.subscribers.get(metricType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(metricType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(metricType);
        }
      }
    };
  }

  // Get real-time system performance data
  getSystemPerformance(): SystemPerformance {
    const systemMetrics = metricsService.generateSystemMetrics();
    
    return {
      cpu: {
        usage: systemMetrics.cpuUsage,
        cores: navigator.hardwareConcurrency || 4,
        temperature: 45 + Math.random() * 20, // Simulated temperature
        load: [0.5, 0.3, 0.8, 0.2, 0.6, 0.4, 0.7, 0.1].map(v => v + Math.random() * 0.3)
      },
      memory: {
        total: 16 * 1024 * 1024 * 1024, // 16GB
        used: (systemMetrics.memoryUsage / 100) * 16 * 1024 * 1024 * 1024,
        available: ((100 - systemMetrics.memoryUsage) / 100) * 16 * 1024 * 1024 * 1024,
        swap: 2 * 1024 * 1024 * 1024 // 2GB swap
      },
      disk: {
        total: 500 * 1024 * 1024 * 1024, // 500GB
        used: (systemMetrics.diskUsage / 100) * 500 * 1024 * 1024 * 1024,
        available: ((100 - systemMetrics.diskUsage) / 100) * 500 * 1024 * 1024 * 1024,
        iops: 1000 + Math.random() * 5000,
        latency: 5 + Math.random() * 15
      },
      network: {
        bytesIn: systemMetrics.networkIn * 1024 * 1024,
        bytesOut: systemMetrics.networkOut * 1024 * 1024,
        packetsIn: 1000 + Math.random() * 5000,
        packetsOut: 800 + Math.random() * 4000,
        errors: Math.floor(Math.random() * 10),
        dropped: Math.floor(Math.random() * 5)
      },
      processes: {
        total: 150 + Math.floor(Math.random() * 50),
        running: 20 + Math.floor(Math.random() * 30),
        sleeping: 120 + Math.floor(Math.random() * 40),
        stopped: 5 + Math.floor(Math.random() * 10),
        zombie: Math.floor(Math.random() * 3)
      }
    };
  }

  // Get real-time application metrics
  getApplicationMetrics(): ApplicationMetrics {
    const systemMetrics = metricsService.generateSystemMetrics();
    
    return {
      responseTime: {
        p50: systemMetrics.responseTime * 0.8,
        p90: systemMetrics.responseTime * 1.2,
        p95: systemMetrics.responseTime * 1.5,
        p99: systemMetrics.responseTime * 2.0,
        average: systemMetrics.responseTime
      },
      throughput: {
        requestsPerSecond: systemMetrics.throughput / 1000,
        transactionsPerSecond: (systemMetrics.throughput / 1000) * 0.8,
        errorsPerSecond: systemMetrics.errorRate * 10
      },
      availability: {
        uptime: 99.9 + Math.random() * 0.09,
        lastDowntime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        sla: 99.95
      },
      resources: {
        connections: systemMetrics.activeConnections,
        threads: 50 + Math.floor(Math.random() * 100),
        heapUsage: 256 + Math.random() * 512, // MB
        gcTime: 5 + Math.random() * 20 // ms
      }
    };
  }

  // Get real-time business metrics
  getBusinessMetrics(): BusinessMetrics {
    const businessMetrics = metricsService.generateBusinessMetrics();
    
    return {
      users: {
        active: businessMetrics.activeUsers,
        total: 10000 + Math.floor(Math.random() * 5000),
        new: Math.floor(Math.random() * 50),
        returning: Math.floor(businessMetrics.activeUsers * 0.7)
      },
      performance: {
        conversionRate: businessMetrics.conversionRate,
        bounceRate: 30 + Math.random() * 20,
        sessionDuration: 180 + Math.random() * 300, // seconds
        pageLoadTime: 1.5 + Math.random() * 2.5 // seconds
      },
      revenue: {
        daily: businessMetrics.revenue,
        monthly: businessMetrics.revenue * 30,
        growth: 5 + Math.random() * 15, // percentage
        transactions: businessMetrics.transactions
      },
      engagement: {
        pageViews: 500 + Math.random() * 1000,
        clicks: 100 + Math.random() * 300,
        shares: 20 + Math.random() * 50,
        comments: 30 + Math.random() * 80
      }
    };
  }

  // Get real-time alerts
  getAlerts() {
    return metricsService.generateAlerts();
  }

  // Get real-time logs
  getLogs() {
    return metricsService.generateLogs();
  }

  // Get historical data for charts
  getHistoricalData(metric: string, hours: number = 24) {
    return metricsService.getHistoricalData(metric, hours);
  }

  // Update all metrics and notify subscribers
  private updateAllMetrics() {
    const systemPerformance = this.getSystemPerformance();
    const applicationMetrics = this.getApplicationMetrics();
    const businessMetrics = this.getBusinessMetrics();
    const alerts = this.getAlerts();
    const logs = this.getLogs();

    // Notify system performance subscribers
    this.notifySubscribers('system_performance', systemPerformance);
    
    // Notify application metrics subscribers
    this.notifySubscribers('application_metrics', applicationMetrics);
    
    // Notify business metrics subscribers
    this.notifySubscribers('business_metrics', businessMetrics);
    
    // Notify alerts subscribers
    this.notifySubscribers('alerts', alerts);
    
    // Notify logs subscribers
    this.notifySubscribers('logs', logs);
  }

  // Notify subscribers of a specific metric type
  private notifySubscribers(metricType: string, data: any) {
    const subscribers = this.subscribers.get(metricType);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in subscriber callback for ${metricType}:`, error);
        }
      });
    }
  }

  // Get metric status based on thresholds
  getMetricStatus(value: number, warning: number, critical: number): 'healthy' | 'warning' | 'critical' {
    if (value >= critical) return 'critical';
    if (value >= warning) return 'warning';
    return 'healthy';
  }

  // Format bytes to human readable format
  formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Format time to human readable format
  formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  // Get trend indicator
  getTrendIndicator(current: number, previous: number): 'up' | 'down' | 'stable' {
    const change = ((current - previous) / previous) * 100;
    if (change > 1) return 'up';
    if (change < -1) return 'down';
    return 'stable';
  }
}

export const realTimeDataService = RealTimeDataService.getInstance();
