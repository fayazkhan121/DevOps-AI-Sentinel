import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { IntegrationConfig } from './IntegrationConfig';
import { AlertConfig } from './AlertConfig';
import { GeneralSettings } from './GeneralSettings';
import type { Settings } from '../../types/settings';

interface SettingsPanelProps {
  onClose: () => void;
  settings: Settings;
  onSave: () => Promise<void>;
  onUpdate: (settings: Settings) => void;
}

export function SettingsPanel({ 
  onClose, 
  settings, 
  onSave,
  onUpdate 
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: 'general', label: 'General Settings' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'alerts', label: 'Alert Settings' }
  ];

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative min-h-screen md:flex md:items-center md:justify-center">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto my-8">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex min-h-[400px]">
            <div className="w-48 border-r bg-gray-50">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' && (
                <GeneralSettings settings={settings} onChange={onUpdate} />
              )}
              {activeTab === 'integrations' && (
                <IntegrationConfig settings={settings} onChange={onUpdate} />
              )}
              {activeTab === 'alerts' && (
                <AlertConfig settings={settings} onChange={onUpdate} />
              )}
            </div>
          </div>

          <div className="border-t p-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                transition-colors flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}