import axios from 'axios';
import type { AlertRule, EmailAlert } from '../types';

class AlertService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || '';
    this.apiKey = process.env.VITE_API_KEY || '';
  }

  // Alert Rules Management
  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const response = await axios.post(`${this.baseUrl}/alerts/rules`, rule, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  async updateAlertRule(id: string, rule: Partial<AlertRule>): Promise<AlertRule> {
    const response = await axios.put(`${this.baseUrl}/alerts/rules/${id}`, rule, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Email Alerts
  async sendEmailAlert(alert: Omit<EmailAlert, 'id' | 'status' | 'timestamp'>): Promise<EmailAlert> {
    const response = await axios.post(`${this.baseUrl}/alerts/email`, alert, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Anomaly Detection
  async detectAnomalies(metrics: any[], config: any): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/anomalies/detect`, {
      metrics,
      config
    }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Root Cause Analysis
  async analyzeRootCause(incident: any): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/incidents/analyze`, incident, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }
}