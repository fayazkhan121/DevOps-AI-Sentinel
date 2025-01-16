import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Settings } from '../../types/settings';
import { AlertSeverity, AlertChannel } from '../../types/alerts';

interface AlertConfigProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function AlertConfig({ settings, onChange }: AlertConfigProps) {
  const addAlertRule = () => {
    const newRule = {
      id: Date.now().toString(),
      name: '',
      description: '',
      severity: AlertSeverity.WARNING,
      conditions: [],
      channels: [],
      enabled: true
    };
    onChange({
      ...settings,
      alertRules: [...settings.alertRules, newRule]
    });
  };

  const removeAlertRule = (id: string) => {
    onChange({
      ...settings,
      alertRules: settings.alertRules.filter(rule => rule.id !== id)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Alert Rules</h3>
        <button
          onClick={addAlertRule}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Add Rule
        </button>
      </div>

      <div className="space-y-4">
        {settings.alertRules.map(rule => (
          <div key={rule.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rule Name
                    </label>
                    <input
                      type="text"
                      value={rule.name}
                      onChange={e => onChange({
                        ...settings,
                        alertRules: settings.alertRules.map(r =>
                          r.id === rule.id ? { ...r, name: e.target.value } : r
                        )
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity
                    </label>
                    <select
                      value={rule.severity}
                      onChange={e => onChange({
                        ...settings,
                        alertRules: settings.alertRules.map(r =>
                          r.id === rule.id ? { ...r, severity: e.target.value as AlertSeverity } : r
                        )
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(AlertSeverity).map(severity => (
                        <option key={severity} value={severity}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={rule.description}
                    onChange={e => onChange({
                      ...settings,
                      alertRules: settings.alertRules.map(r =>
                        r.id === rule.id ? { ...r, description: e.target.value } : r
                      )
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>
              <button
                onClick={() => removeAlertRule(rule.id)}
                className="p-2 text-gray-400 hover:text-red-500"
                aria-label="Remove rule"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}