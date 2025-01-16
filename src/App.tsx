import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Database, Bell, Settings, Users, Search } from 'lucide-react';
import { MetricsCard } from './components/MetricsCard';
import { AlertsList } from './components/AlertsList';
import { PipelinesList } from './components/PipelinesList';
import { AnomalyDetectionPanel } from './components/AnomalyDetection';
import { ResourceMonitoring } from './components/ResourceMonitoring';
import { KubernetesOverview } from './components/KubernetesOverview';
import { ServiceHealthCheck } from './components/ServiceHealthCheck';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { useSettings } from './hooks/useSettings';
import { mockAlerts, mockPipelines, mockAnomalies, mockResources, mockKubernetes, mockServices } from './types/mock';
import * as tf from '@tensorflow/tfjs';
import { ProfileMenu } from './components/ProfileMenu';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const { settings, updateSettings, saveSettings } = useSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Initialize TensorFlow.js
  useEffect(() => {
    const initTF = async () => {
      try {
        await tf.ready();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize TensorFlow.js:', error);
        setIsLoading(false);
      }
    };
    initTF();
  }, []);

  // Apply theme on mount and theme change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.general.theme === 'dark');
  }, [settings.general.theme]);

  // Filter data based on search query
  const filteredData = {
    alerts: mockAlerts.filter(alert => 
      alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    pipelines: mockPipelines.filter(pipeline =>
      pipeline.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    services: mockServices.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  };

  // Add handler for settings button click
  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  // Add handler for settings close
  const handleSettingsClose = async () => {
    try {
      await saveSettings();
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Add handler for profile menu
  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  // Add handler for logout
  const handleLogout = () => {
    // Add your logout logic here
    console.log('Logging out...');
  };

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileMenu && !(event.target as Element).closest('.profile-menu')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Activity className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Loading DevOps Monitor...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${settings.general.theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`${settings.general.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <h1 className={`ml-2 text-xl font-semibold ${settings.general.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              DevOps AI Sentinel
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-64 px-4 py-2 pl-10 rounded-lg border ${
                    settings.general.theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <Search className={`absolute left-3 top-2.5 ${settings.general.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
              </div>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={`px-3 py-2 rounded-lg border ${
                  settings.general.theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 ${settings.general.theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-400 hover:text-gray-500'}`}
              >
                <Bell size={20} />
                {filteredData.alerts.length > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                )}
              </button>

              <button 
                onClick={handleSettingsClick}
                className={`p-2 rounded-full hover:bg-gray-100 ${
                  settings.general.theme === 'dark' 
                    ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700' 
                    : 'text-gray-400 hover:text-gray-500'
                }`}
                aria-label="Settings"
              >
                <Settings size={20} />
              </button>

              <div className="relative profile-menu">
                <button
                  onClick={handleProfileClick}
                  className={`p-2 rounded-full hover:bg-gray-100 ${
                    settings.general.theme === 'dark' 
                      ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700' 
                      : 'text-gray-400 hover:text-gray-500'
                  }`}
                  aria-label="User profile"
                >
                  <Users size={20} />
                </button>

                <ProfileMenu
                  isOpen={showProfileMenu}
                  onClose={() => setShowProfileMenu(false)}
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  onLogout={handleLogout}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="System Health"
            value="98.5%"
            trend={2.1}
            trendLabel="vs last week"
            icon={<Server className="h-6 w-6 text-blue-600" />}
            prediction={{ value: "99.1%", confidence: 85 }}
          />
          <MetricsCard
            title="Resource Usage"
            value="72%"
            trend={-5.4}
            trendLabel="vs yesterday"
            icon={<Cpu className="h-6 w-6 text-blue-600" />}
            prediction={{ value: "78%", confidence: 90 }}
          />
          <MetricsCard
            title="Active Services"
            value="45/48"
            trend={0}
            trendLabel="all services operational"
            icon={<Activity className="h-6 w-6 text-blue-600" />}
          />
          <MetricsCard
            title="Database Load"
            value="65%"
            trend={12.3}
            trendLabel="increased load"
            icon={<Database className="h-6 w-6 text-blue-600" />}
            prediction={{ value: "70%", confidence: 75 }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AlertsList alerts={filteredData.alerts} />
          <PipelinesList pipelines={filteredData.pipelines} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AnomalyDetectionPanel anomalies={mockAnomalies} />
          <ResourceMonitoring resources={mockResources} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KubernetesOverview metrics={mockKubernetes} />
          <ServiceHealthCheck services={filteredData.services} />
        </div>
      </main>

      {showNotifications && (
        <div className={`fixed top-16 right-4 w-96 ${
          settings.general.theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } rounded-lg shadow-lg border z-20`}>
          <div className={`p-4 border-b ${settings.general.theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
            <h3 className={`font-medium ${settings.general.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Notifications
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredData.alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 border-b ${
                  settings.general.theme === 'dark'
                    ? 'border-gray-700 hover:bg-gray-700'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <p className={`text-sm font-medium ${settings.general.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {alert.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsPanel 
          onClose={handleSettingsClose}
          settings={settings}
          onSave={saveSettings}
          onUpdate={updateSettings}
        />
      )}
    </div>
  );
}

export default App;