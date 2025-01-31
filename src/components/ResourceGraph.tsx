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

interface MetricData {
  time: string;
  value: number;
}

export function ResourceGraph() {
  const [data, setData] = useState<MetricData[]>([
    { time: "09:06:57", value: 65 },
    { time: "05:06:57", value: 75 },
    { time: "01:06:57", value: 55 },
    { time: "21:06:57", value: 85 },
    { time: "17:06:57", value: 70 },
    { time: "12:06:57", value: 60 },
  ]);

  useEffect(() => {
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