import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { fetchServiceStatuses } from "@/services/platformMetrics";
import { useQuery } from "@tanstack/react-query";

export function ServiceHealth() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['service-health'],
    queryFn: fetchServiceStatuses,
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Health</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {services.map((service) => (
              <div key={service.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      service.status === "healthy"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-yellow-500/20 text-yellow-500"
                    }`}
                  >
                    {service.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Uptime</div>
                    <div className="font-medium">{service.uptime}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Response Time</div>
                    <div className="font-medium">{service.responseTime}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Error Rate</div>
                    <div className="font-medium">{service.errorRate}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last incident: {new Date(service.lastIncident).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}