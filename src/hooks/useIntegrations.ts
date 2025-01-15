import { useState, useEffect } from 'react';
import { IntegrationService } from '../services/integrations';
import type { Integration } from '../types';

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const integrationService = new IntegrationService();

  const addIntegration = async (type: string, config: any) => {
    try {
      setLoading(true);
      setError(null);

      let integration;
      switch (type) {
        case 'kubernetes':
          integration = await integrationService.connectKubernetes(config);
          break;
        case 'docker':
          integration = await integrationService.connectDocker(config);
          break;
        case 'jenkins':
          integration = await integrationService.connectJenkins(config);
          break;
        case 'azure_devops':
          integration = await integrationService.connectAzureDevOps(config);
          break;
        default:
          throw new Error(`Unsupported integration type: ${type}`);
      }

      setIntegrations(prev => [...prev, integration]);
      return integration;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add integration';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateIntegration = async (id: string, config: any) => {
    try {
      setLoading(true);
      setError(null);

      const integration = integrations.find(i => i.id === id);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const updated = await integrationService.updateIntegrationConfig(integration, config);
      setIntegrations(prev => prev.map(i => i.id === id ? updated : i));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update integration';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeIntegration = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const integration = integrations.find(i => i.id === id);
      if (!integration) {
        throw new Error('Integration not found');
      }

      await integrationService.deleteIntegration(integration);
      setIntegrations(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove integration';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      integrationService.disconnect();
    };
  }, []);

  return {
    integrations,
    loading,
    error,
    addIntegration,
    updateIntegration,
    removeIntegration
  };
}