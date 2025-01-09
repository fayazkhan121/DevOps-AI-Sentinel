import React from 'react';
import { Circle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { PipelineStatus } from '../types';

interface PipelinesListProps {
  pipelines: PipelineStatus[];
}

export function PipelinesList({ pipelines }: PipelinesListProps) {
  const getStatusIcon = (status: PipelineStatus['status']) => {
    switch (status) {
      case 'running':
        return <Circle className="text-blue-500 animate-pulse" size={20} />;
      case 'success':
        return <CheckCircle2 className="text-green-500" size={20} />;
      case 'failed':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-400" size={20} />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold">Pipeline Status</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {pipelines.map((pipeline) => (
          <div key={pipeline.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(pipeline.status)}
                <div>
                  <p className="font-medium">{pipeline.name}</p>
                  <p className="text-sm text-gray-500">Started {pipeline.startTime}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{pipeline.duration}</p>
                {pipeline.status === 'running' && (
                  <div className="w-24 h-2 mt-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${pipeline.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            {pipeline.stages && (
              <div className="mt-4 space-y-2">
                {pipeline.stages.map((stage, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(stage.status)}
                      <span>{stage.name}</span>
                    </div>
                    <span className="text-gray-500">{stage.duration}</span>
                  </div>
                ))}
              </div>
            )}
            {pipeline.logs && pipeline.status === 'failed' && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-600">Error Logs:</p>
                <pre className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700 overflow-x-auto">
                  {pipeline.logs.join('\n')}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}