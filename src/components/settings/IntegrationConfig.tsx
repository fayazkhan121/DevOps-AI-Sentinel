import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Settings } from '../../types/settings';

interface IntegrationConfigProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function IntegrationConfig({ settings, onChange }: IntegrationConfigProps) {
  const addIntegration = (type: string) => {
    const newIntegration = {
      id: Date.now().toString(),
      type,
      name: '',
      config: {}
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

  const integrationTypes = [
    { type: 'kubernetes', label: 'Kubernetes', fields: ['cluster_url', 'api_token'] },
    { type: 'docker', label: 'Docker', fields: ['host', 'api_version', 'tls_verify'] },
    { type: 'jenkins', label: 'Jenkins', fields: ['url', 'username', 'api_token'] },
    { type: 'azure_devops', label: 'Azure DevOps', fields: ['organization', 'project', 'pat_token'] },
    { type: 'aws', label: 'AWS', fields: ['access_key_id', 'secret_access_key', 'region'] },
    { type: 'gcp', label: 'Google Cloud', fields: ['project_id', 'credentials_json'] }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Platform Integrations</h3>
        <div className="relative group">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={18} />
            Add Integration
          </button>
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border hidden group-hover:block">
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
                <h4 className="font-medium">{integrationType?.label}</h4>
                <button
                  onClick={() => removeIntegration(integration.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {integrationType?.fields.map(field => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </label>
                    <input
                      type={field.includes('token') || field.includes('key') ? 'password' : 'text'}
                      value={integration.config[field] || ''}
                      onChange={e => updateIntegration(integration.id, {
                        config: { ...integration.config, [field]: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}