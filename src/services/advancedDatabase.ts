import { PlatformMetric, AlertRule, EmailAlert, Integration, CloudProvider } from '../types';

export interface DatabaseConfig {
  type: 'indexeddb' | 'localStorage' | 'memory';
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
  private config: DatabaseConfig;
  private connection: DatabaseConnection;
  private db: any;
  private fallbackToLocal: boolean = false;
  private inMemoryStorage: Map<string, any> = new Map();

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.connection = {
      isConnected: false,
      type: config.type,
      lastConnected: new Date()
    };
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      switch (this.config.type) {
        case 'indexeddb':
          await this.initializeIndexedDB();
          break;
        case 'localStorage':
          await this.initializeLocalStorage();
          break;
        case 'memory':
          await this.initializeMemoryStorage();
          break;
        default:
          await this.initializeIndexedDB();
          break;
      }
    } catch (error) {
      console.error('Failed to initialize database, falling back to memory storage:', error);
      this.fallbackToLocal = true;
      await this.initializeMemoryStorage();
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    try {
      // Use the existing idb library or fallback to localStorage
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        this.db = 'indexeddb';
        await this.createIndexedDBTables();
        this.connection.isConnected = true;
        this.connection.lastConnected = new Date();
      } else {
        throw new Error('IndexedDB not supported');
      }
    } catch (error) {
      console.warn('IndexedDB initialization failed, falling back to localStorage:', error);
      await this.initializeLocalStorage();
    }
  }

  private async initializeLocalStorage(): Promise<void> {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      this.db = 'localStorage';
      this.connection.isConnected = true;
      this.connection.lastConnected = new Date();
    } else {
      throw new Error('localStorage not supported');
    }
  }

  private async initializeMemoryStorage(): Promise<void> {
    this.db = 'memory';
    this.connection.isConnected = true;
    this.connection.lastConnected = new Date();
  }

  private async createIndexedDBTables(): Promise<void> {
    // This would create IndexedDB tables in a real implementation
    // For now, we'll just simulate it
    console.log('IndexedDB tables would be created here');
  }

  async saveMetric(metric: PlatformMetric): Promise<boolean> {
    try {
      switch (this.db) {
        case 'indexeddb':
          return await this.saveMetricToIndexedDB(metric);
        case 'localStorage':
          return await this.saveMetricToLocalStorage(metric);
        case 'memory':
          return await this.saveMetricToMemory(metric);
        default:
          return await this.saveMetricToMemory(metric);
      }
    } catch (error) {
      console.error('Failed to save metric:', error);
      return false;
    }
  }

  private async saveMetricToIndexedDB(metric: PlatformMetric): Promise<boolean> {
    try {
      // In a real implementation, this would save to IndexedDB
      // For now, we'll simulate it
      const key = `metric_${metric.id}`;
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        localStorage.setItem(key, JSON.stringify(metric));
      }
      return true;
    } catch (error) {
      console.error('Failed to save metric to IndexedDB:', error);
      return false;
    }
  }

  private async saveMetricToLocalStorage(metric: PlatformMetric): Promise<boolean> {
    try {
      const key = `metric_${metric.id}`;
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        localStorage.setItem(key, JSON.stringify(metric));
      }
      return true;
    } catch (error) {
      console.error('Failed to save metric to localStorage:', error);
      return false;
    }
  }

  private async saveMetricToMemory(metric: PlatformMetric): Promise<boolean> {
    try {
      const key = `metric_${metric.id}`;
      this.inMemoryStorage.set(key, metric);
      return true;
    } catch (error) {
      console.error('Failed to save metric to memory:', error);
      return false;
    }
  }

  async getMetric(metricId: string): Promise<PlatformMetric | null> {
    try {
      switch (this.db) {
        case 'indexeddb':
          return await this.getMetricFromIndexedDB(metricId);
        case 'localStorage':
          return await this.getMetricFromLocalStorage(metricId);
        case 'memory':
          return await this.getMetricFromMemory(metricId);
        default:
          return await this.getMetricFromMemory(metricId);
      }
    } catch (error) {
      console.error('Failed to get metric:', error);
      return null;
    }
  }

  private async getMetricFromIndexedDB(metricId: string): Promise<PlatformMetric | null> {
    try {
      const key = `metric_${metricId}`;
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get metric from IndexedDB:', error);
      return null;
    }
  }

  private async getMetricFromLocalStorage(metricId: string): Promise<PlatformMetric | null> {
    try {
      const key = `metric_${metricId}`;
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get metric from localStorage:', error);
      return null;
    }
  }

  private async getMetricFromMemory(metricId: string): Promise<PlatformMetric | null> {
    try {
      const key = `metric_${metricId}`;
      return this.inMemoryStorage.get(key) || null;
    } catch (error) {
      console.error('Failed to get metric from memory:', error);
      return null;
    }
  }

  async getAllMetrics(): Promise<PlatformMetric[]> {
    try {
      const metrics: PlatformMetric[] = [];
      
      if (this.db === 'memory') {
        for (const [key, value] of this.inMemoryStorage.entries()) {
          if (key.startsWith('metric_')) {
            metrics.push(value);
          }
        }
      } else if (typeof window !== 'undefined' && 'localStorage' in window) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('metric_')) {
            try {
              const data = localStorage.getItem(key);
              if (data) {
                metrics.push(JSON.parse(data));
              }
            } catch (error) {
              console.warn('Failed to parse metric from storage:', error);
            }
          }
        }
      }
      
      return metrics;
    } catch (error) {
      console.error('Failed to get all metrics:', error);
      return [];
    }
  }

  getConnectionStatus(): DatabaseConnection {
    return { ...this.connection };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test the current database connection
      const testMetric: PlatformMetric = {
        id: 'test-connection',
        name: 'test',
        value: 1,
        unit: 'test',
        timestamp: new Date().toISOString(),
        source: 'test',
        category: 'test',
        tags: {}
      };

      const saved = await this.saveMetric(testMetric);
      if (saved) {
        await this.deleteMetric('test-connection');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private async deleteMetric(metricId: string): Promise<boolean> {
    try {
      const key = `metric_${metricId}`;
      
      if (this.db === 'memory') {
        this.inMemoryStorage.delete(key);
      } else if (typeof window !== 'undefined' && 'localStorage' in window) {
        localStorage.removeItem(key);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete metric:', error);
      return false;
    }
  }

  async closeConnection(): Promise<void> {
    this.connection.isConnected = false;
    this.inMemoryStorage.clear();
  }

  // Additional methods for other data types
  async saveAlert(alert: any): Promise<boolean> {
    try {
      const key = `alert_${alert.id}`;
      if (this.db === 'memory') {
        this.inMemoryStorage.set(key, alert);
      } else if (typeof window !== 'undefined' && 'localStorage' in window) {
        localStorage.setItem(key, JSON.stringify(alert));
      }
      return true;
    } catch (error) {
      console.error('Failed to save alert:', error);
      return false;
    }
  }

  async getAlerts(): Promise<any[]> {
    try {
      const alerts: any[] = [];
      
      if (this.db === 'memory') {
        for (const [key, value] of this.inMemoryStorage.entries()) {
          if (key.startsWith('alert_')) {
            alerts.push(value);
          }
        }
      } else if (typeof window !== 'undefined' && 'localStorage' in window) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('alert_')) {
            try {
              const data = localStorage.getItem(key);
              if (data) {
                alerts.push(JSON.parse(data));
              }
            } catch (error) {
              console.warn('Failed to parse alert from storage:', error);
            }
          }
        }
      }
      
      return alerts;
    } catch (error) {
      console.error('Failed to get alerts:', error);
      return [];
    }
  }
}

export const advancedDatabase = new AdvancedDatabaseService({
  type: 'indexeddb'
}); 