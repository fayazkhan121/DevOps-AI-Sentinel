import { saveSetting, getSetting, saveMetric, getMetrics } from './database';
import { IntegrationConfig } from '@/types/integrations';

export interface PlatformMetric {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded";
  uptime: string;
  responseTime: string;
  errorRate: string;
  lastIncident: string;
}

interface IntegrationCredentials {
  apiKey?: string;
  region?: string;
  projectId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

const validateCredentials = (credentials: IntegrationCredentials | undefined): boolean => {
  if (!credentials) return false;
  
  // Check if at least one credential field is present
  return Object.values(credentials).some(value => value && value.length > 0);
};

const fetchAwsMetrics = async (credentials: IntegrationCredentials): Promise<PlatformMetric[]> => {
  try {
    if (!validateCredentials(credentials)) {
      throw new Error('Invalid AWS credentials');
    }

    console.log('Fetching AWS metrics...');
    // Here you would use the AWS SDK to fetch real metrics
    const metric = {
      timestamp: new Date().toISOString(),
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
    };
    
    await saveMetric(metric);
    return [metric];
  } catch (error) {
    console.error('Error fetching AWS metrics:', error);
    throw error;
  }
};

const fetchAzureMetrics = async (credentials: IntegrationCredentials): Promise<PlatformMetric[]> => {
  try {
    if (!validateCredentials(credentials)) {
      throw new Error('Invalid Azure credentials');
    }

    console.log('Fetching Azure metrics...');
    const metric = {
      timestamp: new Date().toISOString(),
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
    };
    
    await saveMetric(metric);
    return [metric];
  } catch (error) {
    console.error('Error fetching Azure metrics:', error);
    throw error;
  }
};

const fetchGcpMetrics = async (credentials: IntegrationCredentials): Promise<PlatformMetric[]> => {
  try {
    if (!validateCredentials(credentials)) {
      throw new Error('Invalid GCP credentials');
    }

    console.log('Fetching GCP metrics...');
    const metric = {
      timestamp: new Date().toISOString(),
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      network: Math.random() * 100,
    };
    
    await saveMetric(metric);
    return [metric];
  } catch (error) {
    console.error('Error fetching GCP metrics:', error);
    throw error;
  }
};

export const fetchPlatformMetrics = async (): Promise<PlatformMetric[]> => {
  const integrations = await getSetting('integrations') || [];
  const activeIntegrations = integrations.filter((i: IntegrationConfig) => i.connected);
  
  console.log('Active integrations:', activeIntegrations);
  
  let allMetrics: PlatformMetric[] = [];
  let errors: string[] = [];
  
  for (const integration of activeIntegrations) {
    try {
      let metrics: PlatformMetric[] = [];
      
      switch (integration.id) {
        case 'aws':
          metrics = await fetchAwsMetrics(integration.credentials);
          break;
        case 'azure':
          metrics = await fetchAzureMetrics(integration.credentials);
          break;
        case 'gcp':
          metrics = await fetchGcpMetrics(integration.credentials);
          break;
        default:
          console.log(`No metric fetcher implemented for ${integration.id}`);
      }
      
      allMetrics = [...allMetrics, ...metrics];
      
    } catch (error) {
      const errorMessage = `Error fetching metrics for ${integration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }
  }
  
  // If no real metrics are available, get stored metrics from database
  if (allMetrics.length === 0) {
    const storedMetrics = await getMetrics();
    if (storedMetrics && storedMetrics.length > 0) {
      return storedMetrics;
    }
    
    // If no stored metrics, generate mock data
    const now = new Date();
    allMetrics = Array.from({ length: 10 }, (_, i) => {
      const metric = {
        timestamp: new Date(now.getTime() - i * 60000).toISOString(),
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 100,
      };
      saveMetric(metric);
      return metric;
    });
  }
  
  return allMetrics;
};

export const fetchServiceStatuses = async (): Promise<ServiceStatus[]> => {
  const integrations = await getSetting('integrations') || [];
  const activeIntegrations = integrations.filter((i: IntegrationConfig) => i.connected);
  
  let services: ServiceStatus[] = [];
  let errors: string[] = [];
  
  for (const integration of activeIntegrations) {
    try {
      if (!validateCredentials(integration.credentials)) {
        throw new Error('Invalid credentials');
      }

      console.log(`Fetching service status for ${integration.id}`);
      
      services.push({
        name: `${integration.title} Service`,
        status: Math.random() > 0.2 ? "healthy" : "degraded",
        uptime: `${(99 + Math.random()).toFixed(2)}%`,
        responseTime: `${Math.floor(100 + Math.random() * 100)}ms`,
        errorRate: `${(Math.random() * 0.1).toFixed(3)}%`,
        lastIncident: new Date(Date.now() - Math.random() * 86400000).toISOString()
      });
      
    } catch (error) {
      const errorMessage = `Error fetching service status for ${integration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }
  }
  
  // If no services found, return a mock service
  if (services.length === 0) {
    services = [{
      name: "Sample Service",
      status: "healthy",
      uptime: "99.9%",
      responseTime: "150ms",
      errorRate: "0.01%",
      lastIncident: new Date().toISOString()
    }];
  }
  
  return services;
};