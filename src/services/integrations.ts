import { apiFetch } from '@/lib/apiClient';
import type { Integration } from '../types';

export class IntegrationService {
  async list(): Promise<Integration[]> {
    const data = await apiFetch<{ integrations: Integration[] }>('/integrations');
    return data.integrations || [];
  }

  async save(integration: Partial<Integration> & { type: string; name: string; config?: unknown }): Promise<void> {
    await apiFetch('/integrations', { method: 'POST', body: JSON.stringify(integration) });
  }

  async connectKubernetes(config: unknown): Promise<boolean> {
    await this.save({ type: 'kubernetes', name: 'Kubernetes', config });
    return true;
  }
  async connectDocker(config: unknown): Promise<boolean> {
    await this.save({ type: 'docker', name: 'Docker', config });
    return true;
  }
  async connectJenkins(config: unknown): Promise<boolean> {
    await this.save({ type: 'jenkins', name: 'Jenkins', config });
    return true;
  }
  async connectAzureDevOps(config: unknown): Promise<boolean> {
    await this.save({ type: 'azure_devops', name: 'Azure DevOps', config });
    return true;
  }
  async connectAws(config: unknown): Promise<boolean> {
    await this.save({ type: 'aws', name: 'AWS', config });
    return true;
  }
  async connectGcp(config: unknown): Promise<boolean> {
    await this.save({ type: 'gcp', name: 'GCP', config });
    return true;
  }

  async sendNotification(channel: string, message: string): Promise<void> {
    await apiFetch('/channels', {
      method: 'POST',
      body: JSON.stringify({ type: 'webhook', name: channel, config: { message } }),
    });
  }
}

export const integrationService = new IntegrationService();
