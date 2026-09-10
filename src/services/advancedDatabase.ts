import { apiFetch } from '@/lib/apiClient';
import { PlatformMetric } from './platformMetrics';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  name?: string;
  version?: number;
}

export interface DatabaseConnection {
  isConnected: boolean;
  type: string;
  lastConnected: Date;
  error?: string;
}

export class AdvancedDatabaseService {
  private connection: DatabaseConnection = {
    isConnected: false,
    type: 'sqlite',
    lastConnected: new Date(),
  };

  async saveMetric(metric: PlatformMetric | string, value?: unknown): Promise<boolean> {
    if (typeof metric === 'string') {
      return true;
    }
    try {
      await apiFetch('/metrics/collect', { method: 'POST' });
      return true;
    } catch {
      return Boolean(value);
    }
  }

  async getMetric(_metricId: string): Promise<unknown> {
    const data = await apiFetch<{ metrics: unknown[] }>('/metrics?hours=24');
    return data.metrics || [];
  }

  async getAllMetrics(): Promise<unknown[]> {
    const data = await apiFetch<{ metrics: unknown[] }>('/metrics?hours=24');
    return data.metrics || [];
  }

  getConnectionStatus(): DatabaseConnection {
    return { ...this.connection };
  }

  async testConnection(config?: { type?: string; host?: string; port?: number; username?: string; password?: string; database?: string; ssl?: boolean; connectionString?: string }): Promise<boolean> {
    try {
      const type = config?.type && config.type !== 'indexeddb' && config.type !== 'localStorage' && config.type !== 'memory'
        ? config.type
        : 'sqlite';
      const result = await apiFetch<{ success: boolean }>('/databases/test', {
        method: 'POST',
        body: JSON.stringify({
          type,
          host: config?.host,
          port: config?.port != null ? String(config.port) : undefined,
          username: config?.username,
          password: config?.password,
          database: config?.database,
          ssl: config?.ssl ? 'true' : 'false',
          connectionString: config?.connectionString,
        }),
      });
      this.connection.isConnected = result.success;
      this.connection.type = type;
      this.connection.lastConnected = new Date();
      return result.success;
    } catch {
      this.connection.isConnected = false;
      return false;
    }
  }

  async closeConnection(): Promise<void> {
    this.connection.isConnected = false;
  }

  async saveAlert(_alert: unknown): Promise<boolean> {
    return true;
  }

  async getAlerts(): Promise<unknown[]> {
    const data = await apiFetch<{ alerts: unknown[] }>('/alerts');
    return data.alerts || [];
  }

  async deleteMetric(_id: string): Promise<boolean> {
    return true;
  }
}

export const advancedDatabase = new AdvancedDatabaseService();
