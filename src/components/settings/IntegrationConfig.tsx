import React from 'react';
import { Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import type { Settings } from '../../types/settings';

interface IntegrationConfigProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function IntegrationConfig({ settings, onChange }: IntegrationConfigProps) {
  const integrationTypes = [
    { 
      type: 'kubernetes', 
      label: 'Kubernetes',
      fields: [
        { name: 'cluster_url', label: 'Cluster URL', type: 'text' },
        { name: 'api_token', label: 'API Token', type: 'password' },
        { name: 'namespace', label: 'Namespace', type: 'text' }
      ]
    },
    { 
      type: 'docker', 
      label: 'Docker',
      fields: [
        { name: 'host', label: 'Docker Host', type: 'text' },
        { name: 'api_version', label: 'API Version', type: 'text' },
        { name: 'tls_verify', label: 'TLS Verify', type: 'checkbox' }
      ]
    },
    { 
      type: 'jenkins', 
      label: 'Jenkins',
      fields: [
        { name: 'url', label: 'Jenkins URL', type: 'text' },
        { name: 'username', label: 'Username', type: 'text' },
        { name: 'api_token', label: 'API Token', type: 'password' }
      ]
    },
    { 
      type: 'azure_devops', 
      label: 'Azure DevOps',
      fields: [
        { name: 'organization', label: 'Organization', type: 'text' },
        { name: 'project', label: 'Project', type: 'text' },
        { name: 'pat_token', label: 'Personal Access Token', type: 'password' }
      ]
    },
    { 
      type: 'aws', 
      label: 'AWS',
      fields: [
        { name: 'access_key_id', label: 'Access Key ID', type: 'text' },
        { name: 'secret_access_key', label: 'Secret Access Key', type: 'password' },
        { name: 'region', label: 'Region', type: 'text' }
      ]
    },
    { 
      type: 'gcp', 
      label: 'Google Cloud',
      fields: [
        { name: 'project_id', label: 'Project ID', type: 'text' },
        { name: 'credentials_json', label: 'Credentials JSON', type: 'textarea' }
      ]
    }
  ];

  const addIntegration = (type: string) => {
    const newIntegration = {
      id: Date.now().toString(),
      type,
      name: '',
      config: {},
      status: 'disconnected'
    };
    onChange({
      ...settings,
      integrations: [...settings.integrations, newIntegration]
    });
  };

  const updateIntegration = (id: string, data: any) => {
    onChange({
      ...settings,
      integrations: settings.integrations.map(int =>
        int.id === id ? { ...int, ...data } : int
      )
    });
  };

  const removeIntegration = (id: string) => {
    onChange({
      ...settings,
      integrations: settings.integrations.filter(int => int.id !== id)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Platform Integrations</h3>
        <div className="relative group">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} />
            Add Integration
          </button>
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
            {integrationTypes.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => addIntegration(type)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {settings.integrations.map(integration => {
          const integrationType = integrationTypes.find(t => t.type === integration.type);
          return (
            <div key={integration.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{integrationType?.label}</h4>
                  {integration.status === 'connected' ? (
                    <CheckCircle2 className="text-green-500" size={18} />
                  ) : integration.status === 'error' ? (
                    <XCircle className="text-red-500" size={18} />
                  ) : null}
                </div>
                <button
                  onClick={() => removeIntegration(integration.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {integrationType?.fields.map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={integration.config[field.name] || ''}
                        onChange={e => updateIntegration(integration.id, {
                          config: { ...integration.config, [field.name]: e.target.value }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={4}
                      />
                    ) : field.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={integration.config[field.name] || false}
                        onChange={e => updateIntegration(integration.id, {
                          config: { ...integration.config, [field.name]: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={integration.config[field.name] || ''}
                        onChange={e => updateIntegration(integration.id, {
                          config: { ...integration.config, [field.name]: e.target.value }
                        })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
              {integration.error && (
                <p className="mt-2 text-sm text-red-600">{integration.error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}