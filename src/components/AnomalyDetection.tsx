import React from 'react';
import { AlertOctagon, ArrowRight } from 'lucide-react';
import type { AnomalyDetection } from '../types';

interface AnomalyDetectionProps {
  anomalies: AnomalyDetection[];
}

export function AnomalyDetectionPanel({ anomalies }: AnomalyDetectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">AI Anomaly Detection</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {anomalies.map((anomaly) => (
          <div key={anomaly.id} className="p-4">
            <div className="flex items-start gap-3">
              <AlertOctagon className={`
                ${anomaly.severity === 'high' ? 'text-red-500' : 
                  anomaly.severity === 'medium' ? 'text-yellow-500' : 
                  'text-blue-500'}`} 
                size={20} 
              />
              <div className="flex-1">
                <p className="font-medium">{anomaly.description}</p>
                <p className="mt-1 text-sm text-gray-500">
                  Affected: {anomaly.affectedComponents.join(', ')}
                </p>
                {anomaly.rootCause && (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Root Cause:</span> {anomaly.rootCause}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {anomaly.suggestedActions.map((action, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-blue-600">
                      <ArrowRight size={16} />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}