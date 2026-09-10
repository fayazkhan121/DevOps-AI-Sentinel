import { apiFetch } from '@/lib/apiClient';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
  poolSize?: number;
  timeout?: number;
  isActive: boolean;
  lastConnected?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface DatabaseQuery {
  query: string;
  params?: unknown[];
  timeout?: number;
}

export interface DatabaseResult {
  success: boolean;
  data?: unknown;
  error?: string;
  rowsAffected?: number;
  executionTime?: number;
}

const DB_INTEGRATION_TYPES = new Set(['postgresql', 'mysql', 'mongodb', 'redis', 'sqlite']);

export class DatabaseManager {
  private connections: Map<string, DatabaseConnection> = new Map();
  private defaultConnection: string = '';

  private pickDefaultConnection(): string {
    const stored = localStorage.getItem('default_database_connection');
    if (stored && stored !== 'local' && stored !== 'indexeddb' && this.connections.has(stored)) {
      this.defaultConnection = stored;
      return stored;
    }
    const first = this.connections.values().next().value as DatabaseConnection | undefined;
    this.defaultConnection = first?.id || '';
    return this.defaultConnection;
  }

  private async refreshFromApi(): Promise<void> {
    const data = await apiFetch<{ integrations: Array<{ id: string; type: string; name: string; status: string; error?: string; last_sync?: string }> }>('/integrations');
    const next = new Map<string, DatabaseConnection>();
    for (const row of data.integrations || []) {
      if (!DB_INTEGRATION_TYPES.has(row.type)) continue;
      next.set(row.id, {
        id: row.id,
        name: row.name,
        type: row.type as DatabaseConnection['type'],
        isActive: row.status === 'connected',
        error: row.error,
        lastConnected: row.last_sync,
      });
    }
    this.connections = next;
    this.pickDefaultConnection();
  }

  async addConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      const testResult = await this.testConnection(connection);
      connection.isActive = testResult.success;
      connection.lastConnected = testResult.success ? new Date().toISOString() : undefined;
      connection.error = testResult.success ? undefined : testResult.error;

      const saved = await apiFetch<{ id: string }>('/integrations', {
        method: 'POST',
        body: JSON.stringify({
          type: connection.type,
          name: connection.name,
          config: {
            type: connection.type,
            host: connection.host,
            port: String(connection.port || ''),
            username: connection.username,
            password: connection.password,
            database: connection.database,
            ssl: connection.ssl ? 'true' : 'false',
            connectionString: connection.connectionString,
          },
        }),
      });
      connection.id = saved.id;
      this.connections.set(connection.id, connection);
      return true;
    } catch (error) {
      console.error('Failed to add database connection:', error);
      return false;
    }
  }

  async removeConnection(connectionId: string): Promise<boolean> {
    try {
      await apiFetch(`/integrations/${connectionId}`, { method: 'DELETE' });
      this.connections.delete(connectionId);
      return true;
    } catch (error) {
      console.error('Failed to remove database connection:', error);
      return false;
    }
  }

  async testConnection(connection: DatabaseConnection): Promise<DatabaseResult> {
    const started = Date.now();
    try {
      const result = await apiFetch<{ success: boolean; message: string; latencyMs: number }>('/databases/test', {
        method: 'POST',
        body: JSON.stringify({
          type: connection.type,
          host: connection.host,
          port: String(connection.port || ''),
          username: connection.username,
          password: connection.password,
          database: connection.database,
          ssl: String(!!connection.ssl),
          connectionString: connection.connectionString,
        }),
      });
      return {
        success: result.success,
        data: result.message,
        executionTime: result.latencyMs ?? Date.now() - started,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        executionTime: Date.now() - started,
      };
    }
  }

  async executeQuery(_connectionId: string, _query: DatabaseQuery): Promise<DatabaseResult> {
    return { success: false, error: 'Ad-hoc queries against remote databases are not enabled' };
  }

  async closeConnection(connectionId: string): Promise<boolean> {
    this.connections.delete(connectionId);
    return true;
  }

  async getConnectionStatus(connectionId: string): Promise<DatabaseConnection | null> {
    return this.connections.get(connectionId) || null;
  }

  async getAllConnections(): Promise<DatabaseConnection[]> {
    try {
      await this.refreshFromApi();
    } catch {
      this.pickDefaultConnection();
    }
    return Array.from(this.connections.values());
  }

  async setDefaultConnection(connectionId: string): Promise<boolean> {
    if (this.connections.has(connectionId)) {
      this.defaultConnection = connectionId;
      localStorage.setItem('default_database_connection', connectionId);
      return true;
    }
    return false;
  }

  getDefaultConnection(): string {
    return this.pickDefaultConnection();
  }

  async migrateData(_sourceConnectionId: string, _targetConnectionId: string): Promise<DatabaseResult> {
    return { success: false, error: 'Cross-database migration is not supported' };
  }

  async backupDatabase(connectionId: string): Promise<DatabaseResult> {
    try {
      const created = await apiFetch<{ id: string; createdAt: string }>('/backups', {
        method: 'POST',
        body: JSON.stringify({ connectionId }),
      });
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Backup failed' };
    }
  }

  async restoreDatabase(_connectionId: string, backupId: string): Promise<DatabaseResult> {
    try {
      await apiFetch(`/backups/${backupId}/restore`, { method: 'POST' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Restore failed' };
    }
  }

  async listBackups(): Promise<unknown[]> {
    try {
      const data = await apiFetch<{ backups: unknown[] }>('/backups');
      return data.backups || [];
    } catch {
      return [];
    }
  }

  async getDatabaseMetrics(connectionId: string): Promise<DatabaseResult> {
    try {
      const data = await apiFetch<{ metrics: Array<{ name: string; value: number; source: string }> }>('/metrics/latest');
      const related = (data.metrics || []).filter((m) => m.name.startsWith('db_') || m.source === this.connections.get(connectionId)?.type);
      return {
        success: true,
        data: {
          connectionId,
          timestamp: new Date().toISOString(),
          type: this.connections.get(connectionId)?.type,
          status: this.connections.get(connectionId)?.isActive ? 'active' : 'inactive',
          lastConnected: this.connections.get(connectionId)?.lastConnected,
          performance: {
            avgQueryTime: related.find((m) => m.name === 'db_latency_ms')?.value || 0,
            activeConnections: related.find((m) => m.name === 'db_up')?.value || 0,
            totalQueries: related.length,
          },
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get metrics' };
    }
  }
}

export const databaseManager = new DatabaseManager();
