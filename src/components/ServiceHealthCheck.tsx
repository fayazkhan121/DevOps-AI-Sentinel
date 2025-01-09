import React from 'react';
import { Activity, Clock, AlertTriangle } from 'lucide-react';
import type { ServiceHealth } from '../types';

interface ServiceHealthCheckProps {
  services: ServiceHealth[];
}

export function ServiceHealthCheck({ services }: ServiceHealthCheckProps) {
  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">Service Health</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {services.map((service) => (
          <div key={service.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Activity className="text-gray-400" size={20} />
                <h3 className="font-medium">{service.name}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                {service.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock size={16} />
                  {service.uptime}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Response Time</p>
                <p className="font-medium">{service.responseTime}ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Error Rate</p>
                <p className="font-medium flex items-center gap-1">
                  <AlertTriangle size={16} className={service.errorRate > 1 ? 'text-red-500' : 'text-green-500'} />
                  {service.errorRate}%
                </p>
              </div>
            </div>
            {service.lastIncident && (
              <p className="mt-2 text-sm text-gray-500">
                Last incident: {service.lastIncident}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}