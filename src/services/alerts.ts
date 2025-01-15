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
  }

  async initTFModel() {
    try {
      await tf.ready();
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }));
      model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
      model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });
      this.tfModel = model;
    } catch (error) {
      console.error('Failed to initialize TensorFlow model:', error);
    }
  }

  // Rest of the code remains the same...
}