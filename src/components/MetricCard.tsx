import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  prediction?: string;
  type?: 'metric' | 'chart' | 'status' | 'integration';
}

export function MetricCard({ title, value, trend, icon, prediction }: MetricCardProps) {
  return (
    <div className="metric-card group">
      <div className="flex items-center justify-between">
        <h3 className="metric-label">{title}</h3>
        {icon}
      </div>
      <div className="mt-2">
        <div className="metric-value">{value}</div>
        {trend && (
          <p className="mt-2 flex items-center text-sm">
            <span
              className={cn(
                "flex items-center",
                trend.value > 0 ? "trend-up" : "trend-down"
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
      </div>
    </div>
  );
}