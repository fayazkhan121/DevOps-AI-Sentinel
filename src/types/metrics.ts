export interface MetricData {
  time: string;
  value: number;
  metadata?: {
    source: string;
    unit: string;
    threshold?: number;
  };
}

export interface Alert {
  id: number;
  severity: "high" | "medium" | "low";
  title: string;
  source: string;
  timestamp: string;
  prediction?: string;
  action?: string;
  resolution?: string;
  impact?: string;
  metadata?: {
    affectedServices: string[];
    category: string;
    priority: number;
  };
}

export interface PipelineStep {
  id: string;
  name: string;
  status: "completed" | "in-progress" | "pending" | "failed";
  duration: string;
  startTime?: string;
  endTime?: string;
  logs?: string[];
  resources?: {
    cpu: string;
    memory: string;
    storage: string;
    network?: {
      ingress: string;
      egress: string;
    };
  };
  dependencies?: string[];
  metadata?: {
    owner: string;
    repository: string;
    branch: string;
    commit: string;
    environment: string;
  };
}

export interface Pipeline {
  id: string;
  name: string;
  status: "running" | "completed" | "failed";
  steps: PipelineStep[];
  startTime: string;
  endTime?: string;
  trigger: "manual" | "automated" | "scheduled";
  branch: string;
  commit: string;
  metadata?: {
    totalDuration: string;
    success_rate: number;
    last_successful_run: string;
    environment: string;
  };
}

export interface ServiceMetrics {
  name: string;
  status: "healthy" | "degraded" | "down";
  uptime: string;
  responseTime: number;
  errorRate: number;
  lastChecked: string;
  dependencies?: string[];
}

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    ingress: number;
    egress: number;
  };
  timestamp: string;
}