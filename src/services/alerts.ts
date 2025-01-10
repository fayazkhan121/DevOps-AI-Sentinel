import axios from 'axios';
import type { AlertRule, EmailAlert } from '../types';
import { IsolationForest } from 'ml-isolation-forest';
import DBSCAN from 'ml-dbscan';
import * as tf from '@tensorflow/tfjs';

export class AlertService {
  private baseUrl: string;
  private apiKey: string;
  private anomalyModel: IsolationForest;
  private dbscanModel: DBSCAN;
  private tfModel: tf.LayersModel | null = null;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || '';
    this.apiKey = process.env.VITE_API_KEY || '';
    this.anomalyModel = new IsolationForest();
    this.dbscanModel = new DBSCAN();
    this.initTFModel();
  }

  private async initTFModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });
    this.tfModel = model;
  }

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

  async sendEmailAlert(alert: Omit<EmailAlert, 'id' | 'status' | 'timestamp'>): Promise<EmailAlert> {
    const response = await axios.post(`${this.baseUrl}/alerts/email`, alert, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  async detectAnomalies(metrics: number[][]): Promise<boolean[]> {
    // Using Isolation Forest for anomaly detection
    this.anomalyModel.fit(metrics);
    return this.anomalyModel.predict(metrics);
  }

  async clusterAnomalies(logs: string[]): Promise<number[]> {
    // Convert logs to numerical features (simplified example)
    const features = logs.map(log => [
      log.length,
      log.split(' ').length,
      (log.match(/error/gi) || []).length,
      (log.match(/warning/gi) || []).length
    ]);
    
    // Using DBSCAN for clustering
    this.dbscanModel.fit(features);
    return this.dbscanModel.predict(features);
  }

  async predictAnomaly(features: number[]): Promise<number> {
    if (!this.tfModel) await this.initTFModel();
    const prediction = this.tfModel!.predict(tf.tensor2d([features])) as tf.Tensor;
    return (await prediction.data())[0];
  }

  async analyzeRootCause(incident: any): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/incidents/analyze`, incident, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }
}