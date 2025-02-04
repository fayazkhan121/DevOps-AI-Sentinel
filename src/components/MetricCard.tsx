import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { ResourceGraph } from "./ResourceGraph";
import { ServiceHealth } from "./ServiceHealth";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  prediction?: string;
  type: 'metric' | 'chart' | 'status' | 'integration';
}

export function MetricCard({ title, value, trend, icon, prediction, type }: MetricCardProps) {
  const renderContent = () => {
    switch (type) {
      case 'metric':
        return (
          <>
            <div className="metric-value text-2xl font-bold">{value}</div>
            {trend && (
              <p className="mt-2 flex items-center text-sm">
                <span
                  className={cn(
                    "flex items-center",
                    trend.value > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {trend.value > 0 ? (
                    <ArrowUpIcon className="mr-1 h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="mr-1 h-4 w-4" />
                  )}
                  {Math.abs(trend.value)}%
                </span>
                <span className="ml-2 text-muted-foreground">{trend.label}</span>
              </p>
            )}
            {prediction && (
              <p className="mt-2 text-sm text-primary font-medium">{prediction}</p>
            )}
          </>
        );
      case 'chart':
        return <ResourceGraph />;
      case 'status':
        return <ServiceHealth />;
      case 'integration':
        return (
          <div className="p-4 bg-card rounded-lg">
            <div className="text-muted-foreground">
              Integration settings and status will be available soon
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "metric-card group rounded-lg border shadow-sm",
      type === 'metric' ? "p-6" : "p-4 bg-card"
    )}>
      <div className="flex items-center justify-between">
        <h3 className="metric-label font-medium">{title}</h3>
        {icon}
      </div>
      <div className="mt-2">
        {renderContent()}
      </div>
    </div>
  );
}