import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Alert } from '../types';

interface AlertsListProps {
  alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">Active Alerts</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start gap-3">
              {getSeverityIcon(alert.severity)}
              <div>
                <p className="font-medium">{alert.message}</p>
                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                  <span>{alert.source}</span>
                  <span>•</span>
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                {alert.aiPrediction && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      AI Prediction: {(alert.aiPrediction.probability * 100).toFixed(1)}% chance of recurrence
                      {alert.aiPrediction.nextOccurrence && ` around ${new Date(alert.aiPrediction.nextOccurrence).toLocaleString()}`}
                    </p>
                  </div>
                )}
                {alert.suggestedAction && (
                  <p className="mt-2 text-sm text-green-600">
                    Suggested Action: {alert.suggestedAction}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}