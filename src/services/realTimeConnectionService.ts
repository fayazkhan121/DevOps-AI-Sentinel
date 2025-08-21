import { PlatformMetric, CloudProvider } from '../types';
import { advancedDatabase } from './advancedDatabase';

export interface ConnectionConfig {
  id: string;
  name: string;
  type: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'docker' | 'database' | 'email' | 'slack';
  enabled: boolean;
  credentials: any;
  settings: any;
  lastConnected?: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  errorMessage?: string;
}

export interface RealTimeMetrics {
  timestamp: string;
  source: string;
  metrics: PlatformMetric[];
  connectionStatus: 'healthy' | 'degraded' | 'down';
}

export class RealTimeConnectionService {
  private connections: Map<string, ConnectionConfig> = new Map();
  private activeConnections: Map<string, any> = new Map();
  private metricsStreams: Map<string, NodeJS.Timeout> = new Map();
  private websocketConnections: Map<string, WebSocket> = new Map();
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.initializeDefaultConnections();
  }

  private initializeDefaultConnections(): void {
    // AWS Connection
    this.connections.set('aws-default', {
      id: 'aws-default',
      name: 'AWS Production',
      type: 'aws',
      enabled: false,
      credentials: {
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-east-1'
      },
      settings: {
        refreshInterval: 30000,
        services: ['ec2', 'cloudwatch', 'cost-explorer'],
        regions: ['us-east-1', 'us-west-2']
      },
      status: 'disconnected'
    });

    // Azure Connection
    this.connections.set('azure-default', {
      id: 'azure-default',
      name: 'Azure Production',
      type: 'azure',
      enabled: false,
      credentials: {
        tenantId: '',
        clientId: '',
        clientSecret: '',
        subscriptionId: ''
      },
      settings: {
        refreshInterval: 30000,
        services: ['compute', 'monitor'],
        resourceGroups: []
      },
      status: 'disconnected'
    });

    // GCP Connection
    this.connections.set('gcp-default', {
      id: 'gcp-default',
      name: 'GCP Production',
      type: 'gcp',
      enabled: false,
      credentials: {
        projectId: '',
        keyFile: '',
        credentials: {}
      },
      settings: {
        refreshInterval: 30000,
        services: ['compute', 'monitoring'],
        zones: ['us-central1-a', 'us-east1-a']
      },
      status: 'disconnected'
    });

    // Kubernetes Connection
    this.connections.set('k8s-default', {
      id: 'k8s-default',
      name: 'Kubernetes Cluster',
      type: 'kubernetes',
      enabled: false,
      credentials: {
        kubeconfig: '',
        context: '',
        token: ''
      },
      settings: {
        refreshInterval: 15000,
        namespaces: ['default', 'kube-system'],
        watchEvents: true
      },
      status: 'disconnected'
    });

    // PostgreSQL Connection
    this.connections.set('postgres-default', {
      id: 'postgres-default',
      name: 'PostgreSQL Database',
      type: 'database',
      enabled: false,
      credentials: {
        host: 'localhost',
        port: 5432,
        database: '',
        username: '',
        password: ''
      },
      settings: {
        refreshInterval: 60000,
        poolSize: 10,
        ssl: false,
        monitoring: ['connections', 'queries', 'locks']
      },
      status: 'disconnected'
    });

    // Email/SMTP Connection
    this.connections.set('email-default', {
      id: 'email-default',
      name: 'Email Notifications',
      type: 'email',
      enabled: false,
      credentials: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: '',
        password: ''
      },
      settings: {
        from: '',
        to: [],
        templates: {}
      },
      status: 'disconnected'
    });

    // Slack Connection
    this.connections.set('slack-default', {
      id: 'slack-default',
      name: 'Slack Notifications',
      type: 'slack',
      enabled: false,
      credentials: {
        token: '',
        webhookUrl: ''
      },
      settings: {
        channel: '#alerts',
        username: 'DevOps AI Sentinel',
        iconEmoji: ':robot_face:'
      },
      status: 'disconnected'
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved connections from database
      await this.loadConnections();
      
      // Start auto-reconnection for enabled connections
      this.startAutoReconnection();
      
      this.isInitialized = true;
      console.log('RealTimeConnectionService initialized');
    } catch (error) {
      console.error('Failed to initialize RealTimeConnectionService:', error);
      throw error;
    }
  }

  private async loadConnections(): Promise<void> {
    try {
      const savedConnections = await advancedDatabase.getMetric('connections');
      if (savedConnections && Array.isArray(savedConnections)) {
        for (const conn of savedConnections) {
          this.connections.set(conn.id, conn);
        }
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }

  private async saveConnections(): Promise<void> {
    try {
      const connections = Array.from(this.connections.values());
      await advancedDatabase.saveMetric('connections', connections);
    } catch (error) {
      console.error('Failed to save connections:', error);
    }
  }

  // Connection Management
  async addConnection(config: Omit<ConnectionConfig, 'id' | 'status'>): Promise<string> {
    const id = `${config.type}-${Date.now()}`;
    const connection: ConnectionConfig = {
      ...config,
      id,
      status: 'disconnected'
    };

    this.connections.set(id, connection);
    await this.saveConnections();
    
    console.log(`Connection added: ${connection.name}`);
    return id;
  }

  async updateConnection(id: string, updates: Partial<ConnectionConfig>): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection) return false;

    Object.assign(connection, updates);
    await this.saveConnections();
    
    // Restart connection if it was active
    if (this.activeConnections.has(id)) {
      await this.disconnectSource(id);
      if (connection.enabled) {
        await this.connectSource(id);
      }
    }
    
    console.log(`Connection updated: ${connection.name}`);
    return true;
  }

  async removeConnection(id: string): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection) return false;

    // Disconnect if active
    await this.disconnectSource(id);
    
    // Remove from storage
    this.connections.delete(id);
    await this.saveConnections();
    
    console.log(`Connection removed: ${connection.name}`);
    return true;
  }

  // Real-time Connection Methods
  async connectSource(connectionId: string): Promise<boolean> {
    const config = this.connections.get(connectionId);
    if (!config) {
      console.error(`Connection not found: ${connectionId}`);
      return false;
    }

    try {
      config.status = 'connecting';
      this.connections.set(connectionId, config);

      let connection: any;
      switch (config.type) {
        case 'aws':
          connection = await this.connectAWS(config);
          break;
        case 'azure':
          connection = await this.connectAzure(config);
          break;
        case 'gcp':
          connection = await this.connectGCP(config);
          break;
        case 'kubernetes':
          connection = await this.connectKubernetes(config);
          break;
        case 'database':
          connection = await this.connectDatabase(config);
          break;
        case 'email':
          connection = await this.connectEmail(config);
          break;
        case 'slack':
          connection = await this.connectSlack(config);
          break;
        default:
          throw new Error(`Unsupported connection type: ${config.type}`);
      }

      this.activeConnections.set(connectionId, connection);
      config.status = 'connected';
      config.lastConnected = new Date().toISOString();
      config.errorMessage = undefined;
      
      // Start metrics collection
      this.startMetricsCollection(connectionId);
      
      console.log(`Connected to ${config.name}`);
      this.emit('connection-status', { connectionId, status: 'connected', config });
      return true;

    } catch (error) {
      config.status = 'error';
      config.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to connect to ${config.name}:`, error);
      this.emit('connection-status', { connectionId, status: 'error', error: config.errorMessage });
      return false;
    } finally {
      this.connections.set(connectionId, config);
      await this.saveConnections();
    }
  }

  async disconnectSource(connectionId: string): Promise<boolean> {
    const config = this.connections.get(connectionId);
    if (!config) return false;

    try {
      // Stop metrics collection
      this.stopMetricsCollection(connectionId);
      
      // Close connection
      const connection = this.activeConnections.get(connectionId);
      if (connection) {
        if (typeof connection.close === 'function') {
          await connection.close();
        } else if (typeof connection.end === 'function') {
          await connection.end();
        }
      }
      
      this.activeConnections.delete(connectionId);
      config.status = 'disconnected';
      config.errorMessage = undefined;
      
      console.log(`Disconnected from ${config.name}`);
      this.emit('connection-status', { connectionId, status: 'disconnected', config });
      return true;

    } catch (error) {
      console.error(`Failed to disconnect from ${config.name}:`, error);
      return false;
    } finally {
      this.connections.set(connectionId, config);
      await this.saveConnections();
    }
  }

  // Cloud Provider Connections
  private async connectAWS(config: ConnectionConfig): Promise<any> {
    try {
      // Import AWS SDK modules dynamically
      const { EC2Client } = await import('@aws-sdk/client-ec2');
      const { CloudWatchClient } = await import('@aws-sdk/client-cloudwatch');
      const { CostExplorerClient } = await import('@aws-sdk/client-cost-explorer');

      const credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };

      const ec2Client = new EC2Client({
        region: config.credentials.region,
        credentials
      });

      const cloudWatchClient = new CloudWatchClient({
        region: config.credentials.region,
        credentials
      });

      const costExplorerClient = new CostExplorerClient({
        region: config.credentials.region,
        credentials
      });

      return {
        ec2: ec2Client,
        cloudwatch: cloudWatchClient,
        costExplorer: costExplorerClient,
        region: config.credentials.region
      };
    } catch (error) {
      console.error('AWS connection failed:', error);
      throw new Error('Failed to initialize AWS SDK. Please check your credentials.');
    }
  }

  private async connectAzure(config: ConnectionConfig): Promise<any> {
    try {
      // Import Azure SDK modules dynamically
      const { DefaultAzureCredential, ClientSecretCredential } = await import('@azure/identity');

      const credential = new ClientSecretCredential(
        config.credentials.tenantId,
        config.credentials.clientId,
        config.credentials.clientSecret
      );

      // For now, return a mock connection since Azure ARM packages aren't available
      return {
        credential,
        subscriptionId: config.credentials.subscriptionId,
        mockConnection: true
      };
    } catch (error) {
      console.error('Azure connection failed:', error);
      throw new Error('Failed to initialize Azure SDK. Please check your credentials.');
    }
  }

  private async connectGCP(config: ConnectionConfig): Promise<any> {
    try {
      // For now, return a mock connection since GCP packages may not be fully compatible
      return {
        projectId: config.credentials.projectId,
        mockConnection: true
      };
    } catch (error) {
      console.error('GCP connection failed:', error);
      throw new Error('Failed to initialize GCP SDK. Please check your credentials.');
    }
  }

  private async connectKubernetes(config: ConnectionConfig): Promise<any> {
    try {
      // Import Kubernetes SDK dynamically
      const k8s = await import('@kubernetes/client-node');
      
      const kc = new k8s.KubeConfig();
      
      if (config.credentials.kubeconfig) {
        kc.loadFromString(config.credentials.kubeconfig);
      } else {
        kc.loadFromDefault();
      }

      const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
      const appsV1Api = kc.makeApiClient(k8s.AppsV1Api);
      const metricsApi = kc.makeApiClient(k8s.Metrics);

      return {
        core: coreV1Api,
        apps: appsV1Api,
        metrics: metricsApi,
        kubeConfig: kc
      };
    } catch (error) {
      console.error('Kubernetes connection failed:', error);
      throw new Error('Failed to initialize Kubernetes client. Please check your kubeconfig.');
    }
  }

  private async connectDatabase(config: ConnectionConfig): Promise<any> {
    try {
      // Import database drivers dynamically
      const { Client } = await import('pg');

      const client = new Client({
        host: config.credentials.host,
        port: config.credentials.port,
        database: config.credentials.database,
        user: config.credentials.username,
        password: config.credentials.password,
        ssl: config.settings.ssl
      });

      await client.connect();
      
      // Test connection
      await client.query('SELECT NOW()');

      return client;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error('Failed to connect to database. Please check your credentials.');
    }
  }

  private async connectEmail(config: ConnectionConfig): Promise<any> {
    try {
      // Import nodemailer dynamically
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransporter({
        host: config.credentials.host,
        port: config.credentials.port,
        secure: config.credentials.secure,
        auth: {
          user: config.credentials.user,
          pass: config.credentials.password,
        },
      });

      // Verify connection
      await transporter.verify();

      return transporter;
    } catch (error) {
      console.error('Email connection failed:', error);
      throw new Error('Failed to connect to email server. Please check your SMTP settings.');
    }
  }

  private async connectSlack(config: ConnectionConfig): Promise<any> {
    try {
      // Import Slack SDK dynamically
      const { WebClient } = await import('@slack/web-api');

      const web = new WebClient(config.credentials.token);

      // Test connection
      await web.auth.test();

      return web;
    } catch (error) {
      console.error('Slack connection failed:', error);
      throw new Error('Failed to connect to Slack. Please check your token.');
    }
  }

  // Metrics Collection
  private startMetricsCollection(connectionId: string): void {
    const config = this.connections.get(connectionId);
    if (!config) return;

    const interval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics(connectionId);
        if (metrics.length > 0) {
          this.emit('metrics', { connectionId, metrics });
          
          // Store metrics in database
          for (const metric of metrics) {
            await advancedDatabase.saveMetric('real-time-metrics', metric);
          }
        }
      } catch (error) {
        console.error(`Failed to collect metrics for ${config.name}:`, error);
        config.status = 'error';
        config.errorMessage = error instanceof Error ? error.message : 'Metrics collection failed';
        this.emit('connection-status', { connectionId, status: 'error', error: config.errorMessage });
      }
    }, config.settings.refreshInterval || 30000);

    this.metricsStreams.set(connectionId, interval);
  }

  private stopMetricsCollection(connectionId: string): void {
    const interval = this.metricsStreams.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.metricsStreams.delete(connectionId);
    }
  }

  private async collectMetrics(connectionId: string): Promise<PlatformMetric[]> {
    const config = this.connections.get(connectionId);
    const connection = this.activeConnections.get(connectionId);
    
    if (!config || !connection) return [];

    const metrics: PlatformMetric[] = [];
    const timestamp = new Date().toISOString();

    try {
      switch (config.type) {
        case 'aws':
          const awsMetrics = await this.collectAWSMetrics(connection, config);
          metrics.push(...awsMetrics);
          break;
        case 'azure':
          const azureMetrics = await this.collectAzureMetrics(connection, config);
          metrics.push(...azureMetrics);
          break;
        case 'gcp':
          const gcpMetrics = await this.collectGCPMetrics(connection, config);
          metrics.push(...gcpMetrics);
          break;
        case 'kubernetes':
          const k8sMetrics = await this.collectKubernetesMetrics(connection, config);
          metrics.push(...k8sMetrics);
          break;
        case 'database':
          const dbMetrics = await this.collectDatabaseMetrics(connection, config);
          metrics.push(...dbMetrics);
          break;
      }
    } catch (error) {
      console.error(`Failed to collect metrics for ${config.name}:`, error);
    }

    return metrics;
  }

  private async collectAWSMetrics(connection: any, config: ConnectionConfig): Promise<PlatformMetric[]> {
    const metrics: PlatformMetric[] = [];
    
    try {
      // Import AWS SDK commands dynamically
      const { DescribeInstancesCommand } = await import('@aws-sdk/client-ec2');
      const { GetMetricDataCommand } = await import('@aws-sdk/client-cloudwatch');

      // Get EC2 instances
      const instancesResponse = await connection.ec2.send(new DescribeInstancesCommand({}));
      
      for (const reservation of instancesResponse.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          if (instance.InstanceId && instance.State?.Name === 'running') {
            // CPU Utilization
            const cpuData = await this.getCloudWatchMetric(
              connection.cloudwatch,
              'AWS/EC2',
              'CPUUtilization',
              instance.InstanceId,
              'InstanceId'
            );

            metrics.push({
              id: `aws-ec2-cpu-${instance.InstanceId}-${Date.now()}`,
              name: 'AWS EC2 CPU Utilization',
              value: cpuData || 0,
              unit: '%',
              timestamp: new Date().toISOString(),
              source: 'aws',
              category: 'performance',
              tags: {
                provider: 'aws',
                service: 'ec2',
                instanceId: instance.InstanceId,
                instanceType: instance.InstanceType,
                region: connection.region
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to collect AWS metrics:', error);
    }

    return metrics;
  }

  private async getCloudWatchMetric(
    cloudWatchClient: any,
    namespace: string,
    metricName: string,
    dimensionValue: string,
    dimensionName: string = 'InstanceId'
  ): Promise<number> {
    try {
      const { GetMetricDataCommand } = await import('@aws-sdk/client-cloudwatch');
      
      const command = new GetMetricDataCommand({
        MetricDataQueries: [
          {
            Id: 'm1',
            MetricStat: {
              Metric: {
                Namespace: namespace,
                MetricName: metricName,
                Dimensions: [
                  {
                    Name: dimensionName,
                    Value: dimensionValue,
                  },
                ],
              },
              Period: 300,
              Stat: 'Average',
            },
          },
        ],
        StartTime: new Date(Date.now() - 600000), // 10 minutes ago
        EndTime: new Date(),
      });

      const response = await cloudWatchClient.send(command);
      const values = response.MetricDataResults?.[0]?.Values;
      
      return values && values.length > 0 ? values[values.length - 1] : 0;
    } catch (error) {
      console.error('Failed to get CloudWatch metric:', error);
      return 0;
    }
  }

  private async collectAzureMetrics(connection: any, config: ConnectionConfig): Promise<PlatformMetric[]> {
    const metrics: PlatformMetric[] = [];
    
    try {
      if (connection.mockConnection) {
        // Return mock metrics for Azure
        metrics.push({
          id: `azure-vm-status-mock-${Date.now()}`,
          name: 'Azure VM Status',
          value: 1,
          unit: 'status',
          timestamp: new Date().toISOString(),
          source: 'azure',
          category: 'availability',
          tags: {
            provider: 'azure',
            service: 'compute',
            vmName: 'vm-web-001',
            vmSize: 'Standard_B1s',
            location: 'East US'
          }
        });

        metrics.push({
          id: `azure-cpu-mock-${Date.now()}`,
          name: 'Azure VM CPU Usage',
          value: 45.2 + (Math.random() - 0.5) * 20,
          unit: '%',
          timestamp: new Date().toISOString(),
          source: 'azure',
          category: 'performance',
          tags: {
            provider: 'azure',
            service: 'compute',
            vmName: 'vm-web-001',
            metric: 'cpu'
          }
        });
      }
    } catch (error) {
      console.error('Failed to collect Azure metrics:', error);
    }

    return metrics;
  }

  private async collectGCPMetrics(connection: any, config: ConnectionConfig): Promise<PlatformMetric[]> {
    const metrics: PlatformMetric[] = [];
    
    try {
      if (connection.mockConnection) {
        // Return mock metrics for GCP
        metrics.push({
          id: `gcp-instance-status-mock-${Date.now()}`,
          name: 'GCP Instance Status',
          value: 1,
          unit: 'status',
          timestamp: new Date().toISOString(),
          source: 'gcp',
          category: 'availability',
          tags: {
            provider: 'gcp',
            service: 'compute',
            instanceName: 'web-instance-1',
            zone: 'us-central1-a',
            machineType: 'e2-micro'
          }
        });

        metrics.push({
          id: `gcp-cpu-mock-${Date.now()}`,
          name: 'GCP Instance CPU Usage',
          value: 38.7 + (Math.random() - 0.5) * 15,
          unit: '%',
          timestamp: new Date().toISOString(),
          source: 'gcp',
          category: 'performance',
          tags: {
            provider: 'gcp',
            service: 'compute',
            instanceName: 'web-instance-1',
            metric: 'cpu'
          }
        });
      }
    } catch (error) {
      console.error('Failed to collect GCP metrics:', error);
    }

    return metrics;
  }

  private async collectKubernetesMetrics(connection: any, config: ConnectionConfig): Promise<PlatformMetric[]> {
    const metrics: PlatformMetric[] = [];
    
    try {
      // Get pods
      const podsResponse = await connection.core.listPodForAllNamespaces();
      
      let runningPods = 0;
      let totalPods = 0;
      
      for (const pod of podsResponse.body.items) {
        totalPods++;
        if (pod.status?.phase === 'Running') {
          runningPods++;
        }
      }

      metrics.push({
        id: `k8s-pods-running-${Date.now()}`,
        name: 'Kubernetes Running Pods',
        value: runningPods,
        unit: 'count',
        timestamp: new Date().toISOString(),
        source: 'kubernetes',
        category: 'availability',
        tags: {
          provider: 'kubernetes',
          metric: 'pods-running',
          totalPods: totalPods.toString()
        }
      });

      // Get nodes
      const nodesResponse = await connection.core.listNode();
      
      let readyNodes = 0;
      let totalNodes = 0;
      
      for (const node of nodesResponse.body.items) {
        totalNodes++;
        const isReady = node.status?.conditions?.some(
          condition => condition.type === 'Ready' && condition.status === 'True'
        );
        if (isReady) {
          readyNodes++;
        }
      }

      metrics.push({
        id: `k8s-nodes-ready-${Date.now()}`,
        name: 'Kubernetes Ready Nodes',
        value: readyNodes,
        unit: 'count',
        timestamp: new Date().toISOString(),
        source: 'kubernetes',
        category: 'availability',
        tags: {
          provider: 'kubernetes',
          metric: 'nodes-ready',
          totalNodes: totalNodes.toString()
        }
      });

    } catch (error) {
      console.error('Failed to collect Kubernetes metrics:', error);
    }

    return metrics;
  }

  private async collectDatabaseMetrics(connection: any, config: ConnectionConfig): Promise<PlatformMetric[]> {
    const metrics: PlatformMetric[] = [];
    
    try {
      // Database connection count
      const connectionsResult = await connection.query(
        'SELECT count(*) as connection_count FROM pg_stat_activity WHERE state = $1',
        ['active']
      );
      
      metrics.push({
        id: `db-connections-${Date.now()}`,
        name: 'Database Active Connections',
        value: parseInt(connectionsResult.rows[0].connection_count),
        unit: 'count',
        timestamp: new Date().toISOString(),
        source: 'database',
        category: 'performance',
        tags: {
          provider: 'postgresql',
          host: config.credentials.host,
          database: config.credentials.database
        }
      });

      // Database size
      const sizeResult = await connection.query(
        'SELECT pg_size_pretty(pg_database_size($1)) as size',
        [config.credentials.database]
      );
      
      metrics.push({
        id: `db-size-${Date.now()}`,
        name: 'Database Size',
        value: 0, // Would need to parse the pretty format to get actual bytes
        unit: 'bytes',
        timestamp: new Date().toISOString(),
        source: 'database',
        category: 'storage',
        tags: {
          provider: 'postgresql',
          host: config.credentials.host,
          database: config.credentials.database,
          sizeFormatted: sizeResult.rows[0].size
        }
      });

    } catch (error) {
      console.error('Failed to collect database metrics:', error);
    }

    return metrics;
  }

  // Auto-reconnection
  private startAutoReconnection(): void {
    setInterval(() => {
      for (const [id, config] of this.connections.entries()) {
        if (config.enabled && config.status === 'error') {
          console.log(`Attempting to reconnect to ${config.name}...`);
          this.connectSource(id);
        }
      }
    }, 60000); // Try reconnecting every minute
  }

  // Event System
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }

  on(event: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  off(event: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  // Public API
  getConnections(): ConnectionConfig[] {
    return Array.from(this.connections.values());
  }

  getConnection(id: string): ConnectionConfig | undefined {
    return this.connections.get(id);
  }

  getConnectionStatus(id: string): string {
    return this.connections.get(id)?.status || 'unknown';
  }

  isConnected(id: string): boolean {
    return this.connections.get(id)?.status === 'connected';
  }

  getActiveConnections(): string[] {
    return Array.from(this.activeConnections.keys());
  }

  async testConnection(id: string): Promise<boolean> {
    const config = this.connections.get(id);
    if (!config) return false;

    try {
      // Temporarily connect to test
      await this.connectSource(id);
      await this.disconnectSource(id);
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${config.name}:`, error);
      return false;
    }
  }

  getMetricsCount(): number {
    return this.metricsStreams.size;
  }

  getSystemStatus(): { [key: string]: any } {
    const connections = Array.from(this.connections.values());
    const connectedCount = connections.filter(c => c.status === 'connected').length;
    const errorCount = connections.filter(c => c.status === 'error').length;
    
    return {
      totalConnections: connections.length,
      connectedCount,
      errorCount,
      activeMetricsStreams: this.metricsStreams.size,
      isInitialized: this.isInitialized,
      lastUpdate: new Date().toISOString()
    };
  }
}

export const realTimeConnectionService = new RealTimeConnectionService();