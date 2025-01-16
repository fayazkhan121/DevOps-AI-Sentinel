import React from 'react';
import { User, Settings, LogOut, Shield, Bell, Key, Moon, Sun } from 'lucide-react';
import type { Settings as SettingsType } from '../types/settings';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsType;
  onUpdateSettings: (settings: SettingsType) => void;
  onLogout: () => void;
}

export function ProfileMenu({ isOpen, onClose, settings, onUpdateSettings, onLogout }: ProfileMenuProps) {
  if (!isOpen) return null;

  const toggleTheme = () => {
    onUpdateSettings({
      ...settings,
      general: {
        ...settings.general,
        theme: settings.general.theme === 'light' ? 'dark' : 'light'
      }
    });
  };

  return (
    <div className="absolute right-0 top-16 w-64 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
            <User size={20} />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">John Doe</p>
            <p className="text-xs text-gray-500">admin@company.com</p>
          </div>
        </div>
      </div>

      <div className="py-2">
        <button
          onClick={toggleTheme}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          {settings.general.theme === 'light' ? (
            <>
              <Moon size={16} />
              Dark Mode
            </>
          ) : (
            <>
              <Sun size={16} />
              Light Mode
            </>
          )}
        </button>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <Shield size={16} />
          Security Settings
        </button>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <Bell size={16} />
          Notification Preferences
        </button>

        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <Key size={16} />
          API Keys
        </button>

        <div className="border-t border-gray-100 mt-2 pt-2">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
} 