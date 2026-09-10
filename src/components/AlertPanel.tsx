import { useState } from "react";
import { AlertCircle, AlertTriangle, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { useEffect } from "react";
import WebSocketService from "@/services/websocket";
import { apiFetch } from "@/lib/apiClient";

interface Alert {
  id: number;
  severity: "high" | "medium" | "low";
  title: string;
  source: string;
  timestamp: string;
  prediction?: string;
  action?: string;
  resolution?: string;
  impact?: string;
}

export function AlertPanel() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<{ alerts: Array<{ id: string; name: string; description: string; severity: string; source: string; timestamp: string; metadata?: string }> }>('/alerts');
        setAlerts((data.alerts || []).map((row) => ({
          id: row.id as unknown as number,
          severity: row.severity === 'critical' ? 'high' : row.severity === 'warning' ? 'medium' : 'low',
          title: row.name || row.description,
          source: row.source,
          timestamp: row.timestamp,
          action: undefined,
          resolution: row.description,
          impact: undefined,
        })));
      } catch (error) {
        console.error('Failed to load alerts', error);
      }
    };
    void load();

    const ws = WebSocketService.getInstance();
    
    ws.subscribeToAlerts((newAlert: Alert) => {
      setAlerts(prevAlerts => {
        const updatedAlerts = [...prevAlerts, newAlert];
        // Keep only last 10 alerts
        if (updatedAlerts.length > 10) {
          updatedAlerts.shift();
        }
        return updatedAlerts;
      });

      // Show toast for new alerts
      toast({
        title: `New ${newAlert.severity} Alert`,
        description: newAlert.title,
        variant: newAlert.severity === "high" ? "destructive" : "default"
      });
    });

    return () => {
      ws.unsubscribe('new-alert', ws.subscribeToAlerts);
    };
  }, [toast]);

  const handleActionClick = (action: string) => {
    toast({
      title: "Action Triggered",
      description: `Executing: ${action}`,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Alerts</CardTitle>
        <Bell className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-4 rounded-lg border p-4"
            >
              {alert.severity === "high" ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : alert.severity === "medium" ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-blue-500" />
              )}
              <div className="flex-1">
                <h4 className="font-medium">{alert.title}</h4>
                <div className="mt-1 text-sm text-muted-foreground">
                  <p>{alert.source} • {alert.timestamp}</p>
                  {alert.impact && (
                    <p className="mt-2 text-destructive">Impact: {alert.impact}</p>
                  )}
                  {alert.prediction && (
                    <p className="mt-2 text-primary">{alert.prediction}</p>
                  )}
                  {alert.resolution && (
                    <p className="mt-2 text-green-500">
                      Suggested Resolution: {alert.resolution}
                    </p>
                  )}
                  {alert.action && (
                    <Button
                      variant="secondary"
                      className="mt-2 w-full text-left"
                      onClick={() => handleActionClick(alert.action!)}
                    >
                      Take Action: {alert.action}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}