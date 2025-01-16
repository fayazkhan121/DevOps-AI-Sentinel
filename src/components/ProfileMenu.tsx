import { useState, useEffect } from 'react';
import { User, LogOut, Shield, Bell, Key, Moon, Sun, X, Copy, Check, ArrowLeft } from 'lucide-react';
import type { Settings as SettingsType } from '../types/settings';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsType;
  onUpdateSettings: (settings: SettingsType) => void;
  onLogout: () => void;
}

type SubMenu = 'security' | 'notifications' | 'apiKeys' | null;

interface ApiKey {
  id: string;
  name: string;
  key: string;
  type: 'read' | 'write' | 'admin';
  created: string;
  expires: string;
  description?: string;
}

export function ProfileMenu({ isOpen, onClose, settings, onUpdateSettings, onLogout }: ProfileMenuProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<SubMenu>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [keyType, setKeyType] = useState<ApiKey['type']>('read');
  const [keyDescription, setKeyDescription] = useState('');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);

  // Load saved API keys from localStorage
  useEffect(() => {
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }
  }, []);

  // Save API keys to localStorage when they change
  useEffect(() => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  if (!isOpen) return null;

  const handleBackToMain = () => {
    setActiveSubmenu(null);
    setShowNewKeyForm(false);
    setNewKeyName('');
    setKeyDescription('');
    setKeyType('read');
  };

  const generateApiKey = async () => {
    try {
      setIsGeneratingKey(true);
      // Generate a secure key
      const keyPrefix = keyType === 'admin' ? 'admin' : keyType === 'write' ? 'write' : 'read';
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      const key = `${keyPrefix}_${Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const newKey: ApiKey = {
        id: Date.now().toString(),
        name: newKeyName || `API Key ${apiKeys.length + 1}`,
        key,
        type: keyType,
        description: keyDescription,
        created: new Date().toISOString(),
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      setApiKeys(prevKeys => [...prevKeys, newKey]);
      setShowNewKeyForm(false);
      setNewKeyName('');
      setKeyDescription('');
      setKeyType('read');
    } catch (error) {
      console.error('Failed to generate API key:', error);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyApiKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy key:', error);
    }
  };

  const deleteApiKey = (id: string) => {
    setApiKeys(prevKeys => prevKeys.filter(key => key.id !== id));
  };

  const renderApiKeys = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={handleBackToMain} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={16} />
          </button>
          <h3 className="text-sm font-medium">API Keys</h3>
        </div>
      </div>

      {!showNewKeyForm ? (
        <button
          onClick={() => setShowNewKeyForm(true)}
          className="w-full px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Key size={16} />
          Generate New API Key
        </button>
      ) : (
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="My API Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Type
            </label>
            <select
              value={keyType}
              onChange={(e) => setKeyType(e.target.value as ApiKey['type'])}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="read">Read Only</option>
              <option value="write">Read & Write</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={keyDescription}
              onChange={(e) => setKeyDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="What's this key for?"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowNewKeyForm(false)}
              className="flex-1 px-3 py-2 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={generateApiKey}
              disabled={isGeneratingKey || !newKeyName.trim()}
              className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isGeneratingKey ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 mt-4">
        {apiKeys.map((apiKey) => (
          <div key={apiKey.id} className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{apiKey.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  apiKey.type === 'admin' ? 'bg-red-100 text-red-800' :
                  apiKey.type === 'write' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {apiKey.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyApiKey(apiKey.key)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Copy API key"
                >
                  {copiedKey === apiKey.key ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  onClick={() => deleteApiKey(apiKey.id)}
                  className="text-red-400 hover:text-red-600"
                  title="Delete API key"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {apiKey.description && (
              <p className="text-xs text-gray-500">{apiKey.description}</p>
            )}
            <div className="bg-gray-100 p-2 rounded font-mono text-xs break-all">
              {apiKey.key}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Created: {new Date(apiKey.created).toLocaleDateString()}</span>
              <span>Expires: {new Date(apiKey.expires).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="absolute right-0 top-16 w-96 mt-2 mr-4 bg-white rounded-lg shadow-lg border border-gray-200" onClick={e => e.stopPropagation()}>
        {activeSubmenu === 'apiKeys' ? (
          renderApiKeys()
        ) : (
          <div className="py-2">
            <button
              onClick={() => setActiveSubmenu('apiKeys')}
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
        )}
      </div>
    </div>
  );
} 