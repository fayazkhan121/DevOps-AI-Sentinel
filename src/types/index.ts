// Existing types remain...

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