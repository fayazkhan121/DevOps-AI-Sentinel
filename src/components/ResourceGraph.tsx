import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import WebSocketService from "@/services/websocket";
import { apiFetch } from "@/lib/apiClient";

interface MetricData {
  time: string;
  value: number;
}

export function ResourceGraph() {
  const [data, setData] = useState<MetricData[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const history = await apiFetch<{ metrics: Array<{ timestamp: string; value: number }> }>('/metrics?name=cpu_usage&hours=6');
        setData((history.metrics || []).slice(-12).map((row) => ({
          time: new Date(row.timestamp).toLocaleTimeString(),
          value: row.value,
        })));
      } catch (error) {
        console.error('Failed to load resource graph', error);
      }
    };
    void load();

    const ws = WebSocketService.getInstance();
    
    ws.subscribeToMetrics((newData: MetricData) => {
      setData(prevData => {
        const updatedData = [...prevData, newData];
        if (updatedData.length > 10) {
          updatedData.shift(); // Keep only last 10 data points
        }
        return updatedData;
      });
    });

    return () => {
      ws.disconnect();
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}