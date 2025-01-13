import axios from 'axios';
import type { AlertRule, EmailAlert } from '../types';
import * as tf from '@tensorflow/tfjs';
import { kmeans } from 'ml-kmeans';
import { euclidean } from 'ml-distance-euclidean';

export class AlertService {
  private baseUrl: string;
  private apiKey: string;
  private tfModel: tf.LayersModel | null = null;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || '';
    this.apiKey = process.env.VITE_API_KEY || '';
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
    // Using k-means clustering for anomaly detection
    const k = 2; // Number of clusters
    const result = kmeans(metrics, k);
    
    // Calculate distances to cluster centers
    return metrics.map((point) => {
      const distances = result.centroids.map(centroid => 
        euclidean(point, centroid)
      );
      const minDistance = Math.min(...distances);
      // Consider points far from cluster centers as anomalies
      return minDistance > this.calculateThreshold(distances);
    });
  }

  private calculateThreshold(distances: number[]): number {
    const mean = distances.reduce((a, b) => a + b) / distances.length;
    const stdDev = Math.sqrt(
      distances.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / distances.length
    );
    return mean + 2 * stdDev; // 2 standard deviations from mean
  }

  async clusterAnomalies(logs: string[]): Promise<number[]> {
    // Convert logs to numerical features
    const features = logs.map(log => [
      log.length,
      log.split(' ').length,
      (log.match(/error/gi) || []).length,
      (log.match(/warning/gi) || []).length,
      this.calculateLogComplexity(log)
    ]);
    
    // Using k-means for clustering
    const k = 3; // Number of clusters
    const result = kmeans(features, k);
    return result.clusters;
  }

  private calculateLogComplexity(log: string): number {
    const uniqueWords = new Set(log.toLowerCase().split(/\s+/)).size;
    const specialChars = (log.match(/[^a-zA-Z0-9\s]/g) || []).length;
    return uniqueWords * 0.7 + specialChars * 0.3;
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