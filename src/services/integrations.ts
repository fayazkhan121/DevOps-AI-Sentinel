import axios from 'axios';
import type { Integration, CloudProvider } from '../types';

class IntegrationService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.VITE_API_URL || '';
    this.apiKey = process.env.VITE_API_KEY || '';
  }

  // Cloud Provider Integrations
  async connectCloudProvider(type: 'aws' | 'azure' | 'gcp', credentials: any): Promise<CloudProvider> {
    const response = await axios.post(`${this.baseUrl}/cloud/${type}/connect`, credentials, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Kubernetes Integration
  async connectKubernetes(config: any): Promise<Integration> {
    const response = await axios.post(`${this.baseUrl}/kubernetes/connect`, config, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Docker Integration
  async connectDocker(config: any): Promise<Integration> {
    const response = await axios.post(`${this.baseUrl}/docker/connect`, config, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Jenkins Integration
  async connectJenkins(config: any): Promise<Integration> {
    const response = await axios.post(`${this.baseUrl}/jenkins/connect`, config, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }

  // Azure DevOps Integration
  async connectAzureDevOps(config: any): Promise<Integration> {
    const response = await axios.post(`${this.baseUrl}/azure-devops/connect`, config, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.data;
  }
}