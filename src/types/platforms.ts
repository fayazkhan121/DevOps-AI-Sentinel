export interface KubernetesMetrics {
  clusterHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    nodeCount: number;
    podCount: number;
    namespaceCount: number;
  };
  nodes: {
    name: string;
    status: string;
    cpu: number;
    memory: number;
    pods: number;
  }[];
}

export interface DockerMetrics {
  containers: {
    id: string;
    name: string;
    status: string;
    cpu: number;
    memory: number;
    network: {
      rx_bytes: number;
      tx_bytes: number;
    };
  }[];
  images: {
    id: string;
    tags: string[];
    size: number;
    created: string;
    vulnerabilities?: VulnerabilityReport[];
  }[];
}

export interface JenkinsBuild {
  id: string;
  name: string;
  status: 'success' | 'failure' | 'running' | 'queued';
  timestamp: string;
  duration: number;
  stages: {
    name: string;
    status: string;
    duration: number;
    logs: string[];
  }[];
}

export interface AzureDevOpsPipeline {
  id: string;
  name: string;
  status: string;
  metrics: {
    duration: number;
    successRate: number;
    failureRate: number;
  };
  releases: {
    id: string;
    environment: string;
    status: string;
    timestamp: string;
  }[];
}

export interface VulnerabilityReport {
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affected: string;
  fix?: string;
}