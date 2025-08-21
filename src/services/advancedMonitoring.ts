import { PlatformMetric, PerformanceMetrics, HealthCheck, LogEntry, SecurityScan } from '../types';
import { advancedDatabase } from './advancedDatabase';

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  alerting: boolean;
  logging: boolean;
  metrics: {
    system: boolean;
    application: boolean;
    network: boolean;
    database: boolean;
    custom: boolean;
  };
}

export interface MonitoringTarget {
  id: string;
  name: string;
  type: 'http' | 'tcp' | 'icmp' | 'script' | 'database' | 'custom';
  target: string;
  interval: number;
  timeout: number;
  retries: number;
  isEnabled: boolean;
  lastCheck?: string;
  lastStatus?: 'healthy' | 'unhealthy' | 'unknown';
  metadata?: Record<string, any>;
}

export interface MonitoringResult {
  targetId: string;
  timestamp: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  errorMessage?: string;
  metrics: Record<string, number>;
  metadata?: Record<string, any>;
}

export class AdvancedMonitoringService {
  private config: MonitoringConfig;
  private targets: Map<string, MonitoringTarget> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private results: Map<string, MonitoringResult[]> = new Map();
  private callbacks: Map<string, (result: MonitoringResult) => void> = new Map();
  private isRunning: boolean = false;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeDefaultTargets();
  }

  private initializeDefaultTargets(): void {
    // System monitoring targets
    this.addTarget({
      id: 'system-cpu',
      name: 'CPU Usage',
      type: 'script',
      target: 'system',
      interval: 30,
      timeout: 10,
      retries: 2,
      isEnabled: true,
      metadata: { metric: 'cpu_usage' }
    });

    this.addTarget({
      id: 'system-memory',
      name: 'Memory Usage',
      type: 'script',
      target: 'system',
      interval: 30,
      timeout: 10,
      retries: 2,
      isEnabled: true,
      metadata: { metric: 'memory_usage' }
    });

    this.addTarget({
      id: 'system-disk',
      name: 'Disk Usage',
      type: 'script',
      target: 'system',
      interval: 60,
      timeout: 10,
      retries: 2,
      isEnabled: true,
      metadata: { metric: 'disk_usage' }
    });

    this.addTarget({
      id: 'system-network',
      name: 'Network Status',
      type: 'icmp',
      target: '8.8.8.8',
      interval: 30,
      timeout: 5,
      retries: 1,
      isEnabled: true,
      metadata: { metric: 'network_latency' }
    });
  }

  addTarget(target: MonitoringTarget): void {
    this.targets.set(target.id, target);
    this.results.set(target.id, []);
  }

  removeTarget(targetId: string): boolean {
    const removed = this.targets.delete(targetId);
    if (removed) {
      this.results.delete(targetId);
      this.callbacks.delete(targetId);
    }
    return removed;
  }

  getTarget(targetId: string): MonitoringTarget | undefined {
    return this.targets.get(targetId);
  }

  getAllTargets(): MonitoringTarget[] {
    return Array.from(this.targets.values());
  }

  updateTarget(targetId: string, updates: Partial<MonitoringTarget>): boolean {
    const target = this.targets.get(targetId);
    if (!target) return false;

    Object.assign(target, updates);
    this.targets.set(targetId, target);
    return true;
  }

  startMonitoring(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.runMonitoringCycle();
    }, this.config.interval * 1000);

    console.log('Advanced monitoring service started');
  }

  stopMonitoring(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Advanced monitoring service stopped');
  }

  private async runMonitoringCycle(): Promise<void> {
    const promises = Array.from(this.targets.values())
      .filter(target => target.isEnabled)
      .map(target => this.checkTarget(target));

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error during monitoring cycle:', error);
    }
  }

  private async checkTarget(target: MonitoringTarget): Promise<void> {
    try {
      const result = await this.performCheck(target);
      
      // Store result
      const targetResults = this.results.get(target.id) || [];
      targetResults.push(result);
      
      // Keep only recent results based on retention
      if (targetResults.length > this.config.retention) {
        targetResults.splice(0, targetResults.length - this.config.retention);
      }
      
      this.results.set(target.id, targetResults);

      // Update target status
      target.lastCheck = result.timestamp;
      target.lastStatus = result.status;
      this.targets.set(target.id, target);

      // Notify callbacks
      const callback = this.callbacks.get(target.id);
      if (callback) {
        callback(result);
      }

      // Store in database
      await this.storeMonitoringResult(result);

    } catch (error) {
      console.error(`Error checking target ${target.id}:`, error);
      
      // Record failure
      const failureResult: MonitoringResult = {
        targetId: target.id,
        timestamp: new Date().toISOString(),
        status: 'unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metrics: {},
        metadata: { error: true }
      };

      const targetResults = this.results.get(target.id) || [];
      targetResults.push(failureResult);
      this.results.set(target.id, targetResults);
    }
  }

  private async performCheck(target: MonitoringTarget): Promise<MonitoringResult> {
    const startTime = Date.now();
    
    try {
      let status: 'healthy' | 'unhealthy' | 'unknown' = 'unknown';
      let metrics: Record<string, number> = {};
      let errorMessage: string | undefined;

      switch (target.type) {
        case 'http':
          const httpResult = await this.checkHttpTarget(target);
          status = httpResult.status;
          metrics = httpResult.metrics;
          errorMessage = httpResult.errorMessage;
          break;

        case 'tcp':
          const tcpResult = await this.checkTcpTarget(target);
          status = tcpResult.status;
          metrics = tcpResult.metrics;
          errorMessage = tcpResult.errorMessage;
          break;

        case 'icmp':
          const icmpResult = await this.checkIcmpTarget(target);
          status = icmpResult.status;
          metrics = icmpResult.metrics;
          errorMessage = icmpResult.errorMessage;
          break;

        case 'script':
          const scriptResult = await this.checkScriptTarget(target);
          status = scriptResult.status;
          metrics = scriptResult.metrics;
          errorMessage = scriptResult.errorMessage;
          break;

        case 'database':
          const dbResult = await this.checkDatabaseTarget(target);
          status = dbResult.status;
          metrics = dbResult.metrics;
          errorMessage = dbResult.errorMessage;
          break;

        default:
          throw new Error(`Unsupported target type: ${target.type}`);
      }

      const responseTime = Date.now() - startTime;

      return {
        targetId: target.id,
        timestamp: new Date().toISOString(),
        status,
        responseTime,
        errorMessage,
        metrics,
        metadata: { targetType: target.type }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        targetId: target.id,
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metrics: {},
        metadata: { targetType: target.type, error: true }
      };
    }
  }

  private async checkHttpTarget(target: MonitoringTarget): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown', metrics: Record<string, number>, errorMessage?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), target.timeout * 1000);

      const startTime = Date.now();
      const response = await fetch(target.target, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'DevOps-AI-Sentinel/1.0' }
      });
      const responseTime = Date.now() - startTime;

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          status: 'healthy',
          metrics: {
            responseTime,
            statusCode: response.status,
            contentLength: parseInt(response.headers.get('content-length') || '0')
          }
        };
      } else {
        return {
          status: 'unhealthy',
          metrics: {
            responseTime,
            statusCode: response.status
          },
          errorMessage: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'unhealthy',
          metrics: {},
          errorMessage: 'Request timeout'
        };
      }
      throw error;
    }
  }

  private async checkTcpTarget(target: MonitoringTarget): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown', metrics: Record<string, number>, errorMessage?: string }> {
    // For browser environment, we'll simulate TCP check
    // In a real Node.js environment, you would use net module
    try {
      const startTime = Date.now();
      
      // Simulate TCP connection check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const responseTime = Date.now() - startTime;
      
      // Simulate success/failure based on target
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      if (isSuccess) {
        return {
          status: 'healthy',
          metrics: { responseTime }
        };
      } else {
        return {
          status: 'unhealthy',
          metrics: { responseTime },
          errorMessage: 'Connection refused'
        };
      }
    } catch (error) {
      throw error;
    }
  }

  private async checkIcmpTarget(target: MonitoringTarget): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown', metrics: Record<string, number>, errorMessage?: string }> {
    // For browser environment, we'll simulate ICMP check
    // In a real Node.js environment, you would use ping or similar
    try {
      const startTime = Date.now();
      
      // Simulate ICMP ping
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      const responseTime = Date.now() - startTime;
      
      // Simulate success/failure based on target
      const isSuccess = Math.random() > 0.05; // 95% success rate
      
      if (isSuccess) {
        return {
          status: 'healthy',
          metrics: { responseTime }
        };
      } else {
        return {
          status: 'unhealthy',
          metrics: { responseTime },
          errorMessage: 'Host unreachable'
        };
      }
    } catch (error) {
      throw error;
    }
  }

  private async checkScriptTarget(target: MonitoringTarget): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown', metrics: Record<string, number>, errorMessage?: string }> {
    try {
      const startTime = Date.now();
      
      // Simulate system metrics collection
      const metrics: Record<string, number> = {};
      
      if (target.metadata?.metric === 'cpu_usage') {
        metrics.cpuUsage = Math.random() * 100;
        metrics.loadAverage = Math.random() * 10;
      } else if (target.metadata?.metric === 'memory_usage') {
        metrics.memoryUsage = Math.random() * 100;
        metrics.availableMemory = Math.random() * 1000;
      } else if (target.metadata?.metric === 'disk_usage') {
        metrics.diskUsage = Math.random() * 100;
        metrics.availableSpace = Math.random() * 1000;
      }
      
      const responseTime = Date.now() - startTime;
      
      // Determine status based on metrics
      let status: 'healthy' | 'unhealthy' | 'unknown' = 'healthy';
      let errorMessage: string | undefined;
      
      if (metrics.cpuUsage && metrics.cpuUsage > 90) {
        status = 'unhealthy';
        errorMessage = 'CPU usage too high';
      } else if (metrics.memoryUsage && metrics.memoryUsage > 95) {
        status = 'unhealthy';
        errorMessage = 'Memory usage too high';
      } else if (metrics.diskUsage && metrics.diskUsage > 95) {
        status = 'unhealthy';
        errorMessage = 'Disk usage too high';
      }
      
      return {
        status,
        metrics,
        errorMessage
      };
      
    } catch (error) {
      throw error;
    }
  }

  private async checkDatabaseTarget(target: MonitoringTarget): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown', metrics: Record<string, number>, errorMessage?: string }> {
    try {
      const startTime = Date.now();
      
      // Check database connection
      const dbStatus = await advancedDatabase.getConnectionStatus();
      const responseTime = Date.now() - startTime;
      
      if (dbStatus.isConnected) {
        return {
          status: 'healthy',
          metrics: {
            responseTime,
            connectionStatus: 1
          }
        };
      } else {
        return {
          status: 'unhealthy',
          metrics: {
            responseTime,
            connectionStatus: 0
          },
          errorMessage: dbStatus.error || 'Database connection failed'
        };
      }
    } catch (error) {
      throw error;
    }
  }

  private async storeMonitoringResult(result: MonitoringResult): Promise<void> {
    try {
      // Convert to PlatformMetric for storage
      const metric: PlatformMetric = {
        id: `${result.targetId}-${Date.now()}`,
        name: `monitoring_${result.targetId}`,
        value: result.status === 'healthy' ? 1 : 0,
        unit: 'status',
        timestamp: result.timestamp,
        source: 'monitoring',
        category: 'availability',
        tags: {
          targetId: result.targetId,
          status: result.status,
          type: result.metadata?.targetType || 'unknown'
        },
        metadata: {
          responseTime: result.responseTime,
          errorMessage: result.errorMessage,
          metrics: result.metrics
        }
      };

      await advancedDatabase.saveMetric(metric);
    } catch (error) {
      console.error('Failed to store monitoring result:', error);
    }
  }

  onTargetUpdate(targetId: string, callback: (result: MonitoringResult) => void): void {
    this.callbacks.set(targetId, callback);
  }

  removeTargetCallback(targetId: string): void {
    this.callbacks.delete(targetId);
  }

  getTargetResults(targetId: string): MonitoringResult[] {
    return this.results.get(targetId) || [];
  }

  getTargetStatus(targetId: string): 'healthy' | 'unhealthy' | 'unknown' {
    const target = this.targets.get(targetId);
    return target?.lastStatus || 'unknown';
  }

  getOverallStatus(): 'healthy' | 'unhealthy' | 'degraded' {
    const targets = Array.from(this.targets.values());
    if (targets.length === 0) return 'unknown';

    const healthyCount = targets.filter(t => t.lastStatus === 'healthy').length;
    const unhealthyCount = targets.filter(t => t.lastStatus === 'unhealthy').length;
    const totalCount = targets.length;

    if (unhealthyCount === 0) return 'healthy';
    if (healthyCount === 0) return 'unhealthy';
    return 'degraded';
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const allResults = Array.from(this.results.values()).flat();
    const recentResults = allResults.filter(r => {
      const resultTime = new Date(r.timestamp).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return resultTime > oneHourAgo;
    });

    const responseTimes = recentResults
      .filter(r => r.responseTime)
      .map(r => r.responseTime!);

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    const healthyCount = recentResults.filter(r => r.status === 'healthy').length;
    const totalCount = recentResults.length;
    const availability = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      responseTime: avgResponseTime,
      throughput: totalCount,
      errorRate: totalCount > 0 ? ((totalCount - healthyCount) / totalCount) * 100 : 0,
      availability,
      cpuUtilization: 0, // Would be collected from system metrics
      memoryUtilization: 0, // Would be collected from system metrics
      diskUtilization: 0, // Would be collected from system metrics
      networkUtilization: 0 // Would be collected from system metrics
    };
  }

  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    Object.assign(this.config, newConfig);
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  isMonitoring(): boolean {
    return this.isRunning;
  }
}

export const advancedMonitoring = new AdvancedMonitoringService({
  enabled: true,
  interval: 30,
  retention: 1000,
  alerting: true,
  logging: true,
  metrics: {
    system: true,
    application: true,
    network: true,
    database: true,
    custom: true
  }
}); 