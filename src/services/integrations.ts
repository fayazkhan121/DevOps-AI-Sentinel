import axios from 'axios';
import type { Integration, CloudProvider } from '../types';
import { WebClient } from '@slack/web-api';
import { io } from 'socket.io-client';

export class IntegrationService {
  private baseUrl: string;
  private apiKey: string;
  private slackClient: WebClient | null = null;
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

  async initializeSlack(token: string) {
    this.slackClient = new WebClient(token);
  }

  async sendSlackNotification(channel: string, message: string): Promise<void> {
    if (!this.slackClient) {
      throw new Error('Slack client not initialized');
    }

    await this.slackClient.chat.postMessage({
      channel,
      text: message,
      unfurl_links: false
    });
  }

  async connectCloudProvider(type: 'aws' | 'azure' | 'gcp', credentials: any): Promise<CloudProvider> {
    const response = await axios.post(`${this.baseUrl}/cloud/${type}/connect`, credentials, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  async connectKubernetes(config: any): Promise<Integration> {
    try {
      const response = await axios.post(`${this.baseUrl}/kubernetes/connect`, config, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      // Subscribe to real-time updates
      this.socket.emit('subscribe', {
        type: 'kubernetes',
        clusterId: response.data.id
      });

      return response.data;
    } catch (error) {
      console.error('Failed to connect Kubernetes:', error);
      throw error;
    }
  }

  async connectDocker(config: any): Promise<Integration> {
    try {
      const response = await axios.post(`${this.baseUrl}/docker/connect`, config, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      this.socket.emit('subscribe', {
        type: 'docker',
        hostId: response.data.id
      });

      return response.data;
    } catch (error) {
      console.error('Failed to connect Docker:', error);
      throw error;
    }
  }

  async connectJenkins(config: any): Promise<Integration> {
    try {
      const response = await axios.post(`${this.baseUrl}/jenkins/connect`, config, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      this.socket.emit('subscribe', {
        type: 'jenkins',
        instanceId: response.data.id
      });

      return response.data;
    } catch (error) {
      console.error('Failed to connect Jenkins:', error);
      throw error;
    }
  }

  async connectAzureDevOps(config: any): Promise<Integration> {
    try {
      const response = await axios.post(`${this.baseUrl}/azure-devops/connect`, config, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      this.socket.emit('subscribe', {
        type: 'azure_devops',
        organizationId: response.data.id
      });

      return response.data;
    } catch (error) {
      console.error('Failed to connect Azure DevOps:', error);
      throw error;
    }
  }

  async verifyIntegration(integration: Integration): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/integrations/verify`,
        { integration },
        { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
      );
      return response.data.valid;
    } catch (error) {
      console.error('Failed to verify integration:', error);
      return false;
    }
  }

  async getIntegrationMetrics(integration: Integration): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/integrations/${integration.id}/metrics`,
        { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get integration metrics:', error);
      throw error;
    }
  }

  async updateIntegrationConfig(integration: Integration, config: any): Promise<Integration> {
    try {
      const response = await axios.put(
        `${this.baseUrl}/integrations/${integration.id}/config`,
        { config },
        { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update integration config:', error);
      throw error;
    }
  }

  async deleteIntegration(integration: Integration): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/integrations/${integration.id}`,
        { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
      );

      this.socket.emit('unsubscribe', {
        type: integration.type,
        id: integration.id
      });
    } catch (error) {
      console.error('Failed to delete integration:', error);
      throw error;
    }
  }

  // Cleanup method
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}