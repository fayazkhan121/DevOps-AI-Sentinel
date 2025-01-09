import React from 'react';
import { Server, Check, XCircle } from 'lucide-react';
import type { KubernetesMetrics } from '../types';

interface KubernetesOverviewProps {
  metrics: KubernetesMetrics;
}

export function KubernetesOverview({ metrics }: KubernetesOverviewProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kubernetes Overview</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium
            ${metrics.clusterHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
              metrics.clusterHealth.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'}`}>
            {metrics.clusterHealth.status.charAt(0).toUpperCase() + metrics.clusterHealth.status.slice(1)}
          </span>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-3 gap-4 border-b border-gray-100">
        <div className="text-center">
          <p className="text-2xl font-semibold">{metrics.clusterHealth.nodeCount}</p>
          <p className="text-sm text-gray-500">Nodes</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold">{metrics.clusterHealth.podCount}</p>
          <p className="text-sm text-gray-500">Pods</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold">{metrics.clusterHealth.namespaceCount}</p>
          <p className="text-sm text-gray-500">Namespaces</p>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Node Status</h3>
        <div className="space-y-3">
          {metrics.nodes.map((node) => (
            <div key={node.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Server size={20} className="text-gray-400" />
                <div>
                  <p className="font-medium">{node.name}</p>
                  <p className="text-sm text-gray-500">
                    CPU: {node.cpu}% | Memory: {node.memory}% | Pods: {node.pods}
                  </p>
                </div>
              </div>
              {node.status === 'ready' ? (
                <Check className="text-green-500" size={20} />
              ) : (
                <XCircle className="text-red-500" size={20} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}