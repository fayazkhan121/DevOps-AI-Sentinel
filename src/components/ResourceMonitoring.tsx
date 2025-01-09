import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ResourceMetrics } from '../types';

interface ResourceMonitoringProps {
  resources: ResourceMetrics[];
}

export function ResourceMonitoring({ resources }: ResourceMonitoringProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4">Resource Monitoring</h2>
      <div className="space-y-6">
        {resources.map((resource) => (
          <div key={resource.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-medium">{resource.name}</h3>
                <p className="text-sm text-gray-500">
                  Current: {resource.current}/{resource.max} ({((resource.current / resource.max) * 100).toFixed(1)}%)
                </p>
              </div>
              {resource.prediction && (
                <div className="text-right">
                  <p className="text-sm font-medium">Predicted Next Hour</p>
                  <p className="text-sm text-gray-500">
                    {resource.prediction.nextHour} ({resource.prediction.confidence}% confidence)
                  </p>
                </div>
              )}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={resource.history}>
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()} 
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: number) => [value.toFixed(2), resource.type.toUpperCase()]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}