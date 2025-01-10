// Mock data for development and testing
import type { Alert, PipelineStatus, AnomalyDetection, ResourceMetrics, KubernetesMetrics, ServiceHealth } from './index';

export const mockAlerts: Alert[] = [
  {
    id: '1',
    severity: 'critical',
    message: 'High CPU usage detected in production cluster',
    source: 'Kubernetes Monitoring',
    timestamp: new Date().toISOString(),
    aiPrediction: {
      probability: 0.85,
      nextOccurrence: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    suggestedAction: 'Scale up the deployment or optimize resource usage'
  },
  {
    id: '2',
    severity: 'warning',
    message: 'Memory usage approaching threshold',
    source: 'Resource Monitor',
    timestamp: new Date().toISOString()
  }
];

export const mockPipelines: PipelineStatus[] = [
  {
    id: '1',
    name: 'Production Deployment',
    status: 'running',
    startTime: new Date(Date.now() - 30 * 60 * 1000).toLocaleString(),
    duration: '30m',
    progress: 75,
    stages: [
      { name: 'Build', status: 'success', duration: '5m' },
      { name: 'Test', status: 'success', duration: '10m' },
      { name: 'Deploy', status: 'running', duration: '15m' }
    ]
  }
];

export const mockAnomalies: AnomalyDetection[] = [
  {
    id: '1',
    severity: 'high',
    description: 'Unusual spike in error rates',
    affectedComponents: ['API Gateway', 'Auth Service'],
    rootCause: 'Database connection pool exhaustion',
    suggestedActions: [
      'Increase connection pool size',
      'Implement connection pooling metrics',
      'Review query optimization'
    ]
  }
];

export const mockResources: ResourceMetrics[] = [
  {
    id: '1',
    name: 'Production API Server',
    type: 'compute',
    current: 75,
    max: 100,
    history: Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      value: 50 + Math.random() * 30
    })),
    prediction: {
      nextHour: '85%',
      confidence: 90
    }
  }
];

export const mockKubernetes: KubernetesMetrics = {
  clusterHealth: {
    status: 'healthy',
    nodeCount: 5,
    podCount: 25,
    namespaceCount: 4
  },
  nodes: [
    {
      name: 'worker-1',
      status: 'ready',
      cpu: 65,
      memory: 70,
      pods: 8
    },
    {
      name: 'worker-2',
      status: 'ready',
      cpu: 45,
      memory: 60,
      pods: 6
    }
  ]
};

export const mockServices: ServiceHealth[] = [
  {
    id: '1',
    name: 'Authentication Service',
    status: 'healthy',
    uptime: '99.99%',
    responseTime: 150,
    errorRate: 0.01,
    lastIncident: '2024-02-20T10:30:00Z'
  },
  {
    id: '2',
    name: 'Payment Processing',
    status: 'degraded',
    uptime: '99.5%',
    responseTime: 350,
    errorRate: 2.5,
    lastIncident: '2024-02-25T15:45:00Z'
  }
];