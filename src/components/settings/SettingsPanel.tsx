import React, { useState } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { IntegrationConfig } from './IntegrationConfig';
import { AlertConfig } from './AlertConfig';
import { GeneralSettings } from './GeneralSettings';
import { useSettings } from '../../hooks/useSettings';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('integrations');
  const { settings, updateSettings, saveSettings } = useSettings();

  const tabs = [
    { id: 'integrations', label: 'Integrations' },
    { id: 'alerts', label: 'Alert Settings' },
    { id: 'general', label: 'General Settings' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[80vw] max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex h-full">
          <div className="w-48 border-r bg-gray-50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 ${
                  activeTab === tab.id ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'integrations' && <IntegrationConfig settings={settings} onChange={updateSettings} />}
            {activeTab === 'alerts' && <AlertConfig settings={settings} onChange={updateSettings} />}
            {activeTab === 'general' && <GeneralSettings settings={settings} onChange={updateSettings} />}
          </div>
        </div>

        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}