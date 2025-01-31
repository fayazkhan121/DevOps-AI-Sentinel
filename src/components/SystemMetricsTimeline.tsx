import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Brain, AlertCircle } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { fetchPlatformMetrics, PlatformMetric } from "@/services/platformMetrics";
import { useQuery } from "@tanstack/react-query";

type TimeRange = '15m' | '1h' | '6h' | '24h';

export function SystemMetricsTimeline() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');

  const { data: metrics = [], isLoading, error } = useQuery({
    queryKey: ['metrics', timeRange],
    queryFn: fetchPlatformMetrics,
    refetchInterval: 60000, // Refresh every minute
  });

  const filterMetricsByTime = (data: PlatformMetric[], range: TimeRange) => {
    const now = new Date();
    const msMap = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };
    
    const cutoff = new Date(now.getTime() - msMap[range]);
    return data.filter(metric => new Date(metric.timestamp) > cutoff);
  };

  const filteredMetrics = filterMetricsByTime(metrics, timeRange);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching metrics",
        description: "Failed to fetch system metrics",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>System Metrics Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">Real-time resource monitoring from integrated platforms</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">Last 15 min</SelectItem>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="hsl(var(--primary))"
                  name="CPU Usage"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="hsl(var(--destructive))"
                  name="Memory Usage"
                />
                <Line
                  type="monotone"
                  dataKey="disk"
                  stroke="hsl(var(--warning))"
                  name="Disk Usage"
                />
                <Line
                  type="monotone"
                  dataKey="network"
                  stroke="hsl(var(--secondary))"
                  name="Network Usage"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}