export interface LogCluster {
  id: string;
  pattern: string;
  count: number;
  logs: string[];
  severity: 'normal' | 'suspicious' | 'anomalous';
  firstSeen: string;
  lastSeen: string;
}

export interface AnomalyPrediction {
  timestamp: string;
  metric: string;
  value: number;
  predicted: number;
  isAnomaly: boolean;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}

export interface RootCauseAnalysis {
  incidentId: string;
  timestamp: string;
  cause: string;
  confidence: number;
  affectedComponents: string[];
  recommendations: string[];
  relatedIncidents: string[];
}