import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: React.ReactNode;
  prediction?: {
    value: string | number;
    confidence: number;
  };
}

export function MetricsCard({ title, value, trend, trendLabel, icon, prediction }: MetricsCardProps) {
  const isPositive = trend >= 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-blue-50 rounded-lg">
          {icon}
        </div>
        <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowUpIcon size={16} /> : <ArrowDownIcon size={16} />}
          {Math.abs(trend)}%
        </span>
      </div>
      <h3 className="mt-4 text-gray-600 text-sm font-medium">{title}</h3>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-gray-500 text-sm">{trendLabel}</p>
      {prediction && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            Predicted: {prediction.value}
            <span className="ml-1 text-xs">
              ({prediction.confidence}% confidence)
            </span>
          </p>
        </div>
      )}
    </div>
  );
}