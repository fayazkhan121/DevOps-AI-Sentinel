// Core Platform Types
export interface PlatformMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  source: string;
  category: 'performance' | 'availability' | 'cost' | 'security' | 'custom';
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface CloudProvider {
  type: 'aws' | 'azure' | 'gcp';
  status: 'connected' | 'error' | 'disconnected';
  resources: {
    compute: CloudResource[];
    storage: CloudResource[];
    network: CloudResource[];
  };
  metrics: {
    cost: number;
    usage: number;
    performance: number;
  };
}

export interface CloudResource {
  id: string;
  name: string;
  type: string;
  status: string;
  region: string;
  metrics: {
    cpu: number;
    memory: number;
    network: number;
    cost: number;
  };
}

export interface EmailAlert {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '==' | '>=' | '<=';
    value: number;
    duration: string;
  };
  actions: {
    email?: {
      recipients: string[];
      template: string;
    };
    slack?: {
      channel: string;
      message: string;
    };
    webhook?: {
      url: string;
      method: 'POST' | 'PUT';
      headers: Record<string, string>;
    };
  };
  enabled: boolean;
}

export interface AnomalyModel {
  id: string;
  name: string;
  type: 'isolation_forest' | 'dbscan' | 'lstm';
  status: 'training' | 'ready' | 'failed';
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
  };
  lastTrained: string;
  predictions: {
    timestamp: string;
    anomaly: boolean;
    confidence: number;
    details: string;
  }[];
}

export interface Integration {
  id: string;
  type: 'jenkins' | 'kubernetes' | 'docker' | 'azure_devops' | 'aws' | 'gcp';
  name: string;
  status: 'connected' | 'error' | 'disconnected';
  config: {
    url: string;
    credentials: {
      type: 'token' | 'oauth' | 'key';
      value: string;
    };
    settings: Record<string, any>;
  };
  lastSync: string;
  error?: string;
}

// Dashboard Types
export interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'status' | 'log' | 'custom';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: {
    dataSource?: string;
    refreshInterval?: number;
    displayOptions?: Record<string, any>;
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    thresholds?: {
      warning: number;
      critical: number;
    };
  };
  data?: any;
  lastUpdated?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  widgets: Widget[];
  layout: 'grid' | 'free';
  theme: 'light' | 'dark' | 'system';
  refreshInterval: number;
  isPublic: boolean;
  tags: string[];
}

// Alert Types
export interface Alert {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  source: string;
  timestamp: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
  metadata: {
    metricValue: number;
    threshold: number;
    duration: string;
    affectedServices: string[];
    category: string;
    priority: number;
  };
}

// Notification Types
export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push' | 'discord' | 'telegram';
  name: string;
  description?: string;
  config: Record<string, any>;
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// DevOps Integration Types
export interface KubernetesConfig {
  apiServer: string;
  token: string;
  namespace: string;
  context: string;
  clusterName?: string;
  insecureSkipTlsVerify?: boolean;
}

export interface DockerConfig {
  host: string;
  port: number;
  tls: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
}

export interface JenkinsConfig {
  url: string;
  username: string;
  apiToken: string;
  crumbIssuer?: boolean;
}

export interface GitConfig {
  type: 'github' | 'gitlab' | 'bitbucket' | 'azure_devops';
  url: string;
  token: string;
  username?: string;
  organization?: string;
  repositories?: string[];
}

// Pipeline Types
export interface PipelineConfig {
  id: string;
  name: string;
  type: 'jenkins' | 'gitlab' | 'github' | 'azure_devops';
  config: JenkinsConfig | GitConfig;
  isEnabled: boolean;
  lastSync: string;
}

// Container and Pod Metrics
export interface ContainerMetrics {
  id: string;
  name: string;
  image: string;
  status: string;
  cpu: number;
  memory: number;
  networkRx: number;
  networkTx: number;
  diskRead: number;
  diskWrite: number;
  timestamp: string;
}

export interface PodMetrics {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  ip: string;
  node: string;
  containers: ContainerMetrics[];
  timestamp: string;
}

// Security Types
export interface SecurityScan {
  id: string;
  target: string;
  type: 'vulnerability' | 'compliance' | 'secret';
  status: 'pending' | 'running' | 'completed' | 'failed';
  findings: SecurityFinding[];
  startedAt: string;
  completedAt?: string;
  scanDuration?: number;
}

export interface SecurityFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  cve?: string;
  cvss?: number;
  recommendation: string;
  references?: string[];
  discoveredAt: string;
}

// Cost Management Types
export interface CostAnalysis {
  period: string;
  totalCost: number;
  currency: string;
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    database: number;
    other: number;
  };
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  recommendations: CostRecommendation[];
}

export interface CostRecommendation {
  id: string;
  type: 'resize' | 'shutdown' | 'reservation' | 'savings_plan';
  title: string;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  implementation: string;
}

// Performance Types
export interface PerformanceMetrics {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  cpuUtilization: number;
  memoryUtilization: number;
  diskUtilization: number;
  networkUtilization: number;
}

// Log Types
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  message: string;
  source: string;
  service: string;
  traceId?: string;
  spanId?: string;
  metadata: Record<string, any>;
  tags: string[];
}

// User and Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// Audit Types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

// Configuration Types
export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  isEncrypted: boolean;
  isRequired: boolean;
  validation?: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  createdAt: string;
  updatedAt: string;
}

// Health Check Types
export interface HealthCheck {
  id: string;
  name: string;
  type: 'http' | 'tcp' | 'icmp' | 'script' | 'database';
  target: string;
  interval: number;
  timeout: number;
  retries: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: string;
  lastSuccess?: string;
  lastFailure?: string;
  responseTime?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Export all types
export * from './metrics';
export * from './dashboard';
export * from './alerts';
export * from './anomalies';
export * from './integrations';
export * from './platforms';
export * from './settings';