import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Database, Bell, Settings, Users, Search } from 'lucide-react';
import { MetricsCard } from './components/MetricsCard';
import { AlertsList } from './components/AlertsList';
import { PipelinesList } from './components/PipelinesList';
import { AnomalyDetectionPanel } from './components/AnomalyDetection';
import { ResourceMonitoring } from './components/ResourceMonitoring';
import { KubernetesOverview } from './components/KubernetesOverview';
import { ServiceHealthCheck } from './components/ServiceHealthCheck';
import { mockAlerts, mockPipelines, mockAnomalies, mockResources, mockKubernetes, mockServices } from './types/mock';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold">DevOps AI Sentinel </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-4 py-2 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              </div>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-gray-500"
              >
                <Bell size={20} />
                {mockAlerts.length > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                )}
              </button>

              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Settings size={20} />
              </button>

              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Users size={20} />
              </button>
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
          <AlertsList alerts={mockAlerts} />
          <PipelinesList pipelines={mockPipelines} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AnomalyDetectionPanel anomalies={mockAnomalies} />
          <ResourceMonitoring resources={mockResources} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KubernetesOverview metrics={mockKubernetes} />
          <ServiceHealthCheck services={mockServices} />
        </div>
      </main>

      {showNotifications && (
        <div className="fixed top-16 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {mockAlerts.map((alert) => (
              <div key={alert.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;