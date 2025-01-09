import axios from 'axios';
import type { ResourceMetrics, KubernetesMetrics } from '../types';

class MonitoringService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || '';
    this.apiKey = process.env.VITE_API_KEY || '';
  }

  // Resource Monitoring
  async getResourceMetrics(resourceId: string, timeRange: string): Promise<ResourceMetrics> {
    const response = await axios.get(`${this.baseUrl}/metrics/resources/${resourceId}`, {
      params: { timeRange },
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Kubernetes Monitoring
  async getKubernetesMetrics(clusterId: string): Promise<KubernetesMetrics> {
    const response = await axios.get(`${this.baseUrl}/metrics/kubernetes/${clusterId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Performance Prediction
  async predictPerformance(metrics: any[], horizon: string): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/predictions/performance`, {
      metrics,
      horizon
    }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // System Health Check
  async checkSystemHealth(): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/health/check`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Log Analysis
  async analyzeLogs(query: string, timeRange: string): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/logs/analyze`, {
      query,
      timeRange
    }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }
}