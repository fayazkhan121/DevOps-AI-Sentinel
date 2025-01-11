import React from 'react';
import type { Settings } from '../../types/settings';

interface GeneralSettingsProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function GeneralSettings({ settings, onChange }: GeneralSettingsProps) {
  const timezones = Intl.supportedValuesOf('timeZone');

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">General Settings</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Theme
          </label>
          <select
            value={settings.general.theme}
            onChange={e => onChange({
              ...settings,
              general: { ...settings.general, theme: e.target.value as 'light' | 'dark' }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refresh Interval (seconds)
          </label>
          <input
            type="number"
            min="5"
            max="300"
            value={settings.general.refreshInterval}
            onChange={e => onChange({
              ...settings,
              general: { ...settings.general, refreshInterval: parseInt(e.target.value) }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Timezone
          </label>
          <select
            value={settings.general.timezone}
            onChange={e => onChange({
              ...settings,
              general: { ...settings.general, timezone: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {timezones.map(timezone => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Retention Period
          </label>
          <select
            value={settings.general.retentionPeriod || '30'}
            onChange={e => onChange({
              ...settings,
              general: { ...settings.general, retentionPeriod: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </select>
        </div>
      </div>
    </div>
  );
}