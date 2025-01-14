import axios from 'axios';
import type { Integration, CloudProvider } from '../types';
import { io } from 'socket.io-client';

export class IntegrationService {
  private baseUrl: string;
  private apiKey: string;
  private socket: any = null;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || '';
    this.apiKey = process.env.VITE_API_KEY || '';
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    this.socket = io(this.baseUrl, {
      auth: {
        token: this.apiKey
      }
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('integration_update', (data: any) => {
      console.log('Integration update received:', data);
    });
  }

  async sendNotification(channel: string, message: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/notifications`, {
        channel,
        message
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Rest of the integration methods remain the same...
}