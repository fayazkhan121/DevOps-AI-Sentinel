import React from 'react';
import { Plus, Trash2, RefreshCw, Cloud, Server, Database, Lock, Globe, Terminal } from 'lucide-react';
import type { Settings, Integration } from '../../types/settings';

interface IntegrationConfigProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function IntegrationConfig({ settings, onChange }: IntegrationConfigProps) {
  const integrationTypes = [
    { 
      id: 'kubernetes', 
      name: 'Kubernetes',
      icon: <Server className="text-blue-500" size={20} />,
      fields: ['clusterUrl', 'apiToken', 'namespace', 'context', 'monitoring']
    },
    { 
      id: 'docker', 
      name: 'Docker',
      icon: <Terminal className="text-blue-500" size={20} />,
      fields: ['host', 'tlsCert', 'tlsKey', 'registryUrl']
    },
    { 
      id: 'aws', 
      name: 'AWS',
      icon: <Cloud className="text-orange-500" size={20} />,
      fields: ['accessKey', 'secretKey', 'region', 'services']
    },
    { 
      id: 'azure_devops', 
      name: 'Azure DevOps',
      icon: <Globe className="text-blue-600" size={20} />,
      fields: ['organization', 'pat', 'project', 'pipeline']
    },
    { 
      id: 'gcp', 
      name: 'Google Cloud',
      icon: <Cloud className="text-red-500" size={20} />,
      fields: ['projectId', 'credentials', 'zone', 'cluster']
    },
    { 
      id: 'jenkins', 
      name: 'Jenkins',
      icon: <Terminal className="text-gray-700" size={20} />,
      fields: ['url', 'username', 'apiToken', 'job']
    }
  ];

  // Add cloud-specific configuration templates
  const configTemplates = {
    kubernetes: {
      clusterUrl: '',
      apiToken: '',
      namespace: 'default',
      context: 'default',
      monitoring: {
        prometheus: true,
        grafana: false,
        alertManager: true,
        retention: '15d',
        scrapeInterval: '30s'
      }
    },
    aws: {
      accessKey: '',
      secretKey: '',
      region: 'us-west-2',
      services: {
        ec2: true,
        eks: true,
        rds: true,
        s3: true,
        cloudwatch: true
      },
      monitoring: {
        cloudwatch: true,
        xray: false,
        retention: '30d'
      }
    },
    gcp: {
      projectId: '',
      credentials: '',
      zone: 'us-central1-a',
      services: {
        gke: true,
        cloudRun: true,
        cloudStorage: true,
        cloudSQL: true
      },
      monitoring: {
        stackdriver: true,
        retention: '30d'
      }
    }
  };

  const addIntegration = (type: string) => {
    const newIntegration: Integration = {
      id: Date.now().toString(),
      type,
      name: `New ${type} Integration`,
      config: configTemplates[type as keyof typeof configTemplates] || {},
      status: 'disconnected',
      lastSync: new Date().toISOString()
    };

    onChange({
      ...settings,
      integrations: [...settings.integrations, newIntegration]
    });
  };

  const removeIntegration = (id: string) => {
    onChange({
      ...settings,
      integrations: settings.integrations.filter(i => i.id !== id)
    });
  };

  const updateIntegration = (id: string, updates: Partial<Integration>) => {
    onChange({
      ...settings,
      integrations: settings.integrations.map(i => 
        i.id === id ? { ...i, ...updates } : i
      )
    });
  };

  const renderConfigFields = (integration: Integration) => {
    switch (integration.type) {
      case 'kubernetes':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cluster URL
                </label>
                <input
                  type="text"
                  value={integration.config.clusterUrl || ''}
                  onChange={(e) => updateIntegration(integration.id, {
                    config: { ...integration.config, clusterUrl: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Namespace
                </label>
                <input
                  type="text"
                  value={integration.config.namespace || ''}
                  onChange={(e) => updateIntegration(integration.id, {
                    config: { ...integration.config, namespace: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token
                </label>
                <input
                  type="password"
                  value={integration.config.apiToken || ''}
                  onChange={(e) => updateIntegration(integration.id, {
                    config: { ...integration.config, apiToken: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Context
                </label>
                <input
                  type="text"
                  value={integration.config.context || ''}
                  onChange={(e) => updateIntegration(integration.id, {
                    config: { ...integration.config, context: e.target.value }
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Monitoring Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={integration.config.monitoring?.prometheus}
                      onChange={(e) => updateIntegration(integration.id, {
                        config: {
                          ...integration.config,
                          monitoring: {
                            ...integration.config.monitoring,
                            prometheus: e.target.checked
                          }
                        }
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Prometheus</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={integration.config.monitoring?.grafana}
                      onChange={(e) => updateIntegration(integration.id, {
                        config: {
                          ...integration.config,
                          monitoring: {
                            ...integration.config.monitoring,
                            grafana: e.target.checked
                          }
                        }
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Grafana</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scrape Interval
                  </label>
                  <select
                    value={integration.config.monitoring?.scrapeInterval || '30s'}
                    onChange={(e) => updateIntegration(integration.id, {
                      config: {
                        ...integration.config,
                        monitoring: {
                          ...integration.config.monitoring,
                          scrapeInterval: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="15s">15 seconds</option>
                    <option value="30s">30 seconds</option>
                    <option value="1m">1 minute</option>
                    <option value="5m">5 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      // Add similar detailed configurations for other integration types
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Platform Integrations</h3>
        <div className="relative">
          <select
            onChange={(e) => {
              if (e.target.value) {
                addIntegration(e.target.value);
                e.target.value = '';
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 appearance-none cursor-pointer pr-10"
            defaultValue=""
          >
            <option value="" disabled>Add Integration</option>
            {integrationTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <Plus className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white" size={18} />
        </div>
      </div>

      <div className="space-y-4">
        {settings.integrations.map(integration => (
          <div key={integration.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {integrationTypes.find(t => t.id === integration.type)?.icon}
                    <input
                      type="text"
                      value={integration.name}
                      onChange={(e) => updateIntegration(integration.id, { name: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      integration.status === 'connected' ? 'bg-green-100 text-green-800' :
                      integration.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                    </span>
                    <button
                      onClick={() => removeIntegration(integration.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                      aria-label="Remove integration"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {renderConfigFields(integration)}

                {integration.lastSync && (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <RefreshCw size={14} />
                    Last synced: {new Date(integration.lastSync).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}