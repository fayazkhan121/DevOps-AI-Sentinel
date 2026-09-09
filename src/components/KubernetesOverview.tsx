import { Check, Server, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

interface WorkerNode {
  name: string;
  cpu: string;
  cpuPercentage: number;
  memory: string;
  memoryPercentage: number;
  pods: number;
  status: "healthy" | "warning" | "critical";
  network: {
    in: string;
    out: string;
  };
}

export function KubernetesOverview() {
  const [workers, setWorkers] = useState<WorkerNode[]>([]);
  const [counts, setCounts] = useState({ nodes: 0, pods: 0, namespaces: 0, deployments: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<{ metrics: Array<{ name: string; value: number; source: string }> }>('/metrics/latest');
        const get = (name: string) => data.metrics?.find((m) => m.name === name)?.value || 0;
        const cpu = get('cpu_usage');
        const mem = get('memory_usage');
        const nodes = get('k8s_node_count');
        const pods = get('k8s_pod_count');
        setCounts({
          nodes: nodes || 1,
          pods: pods || 0,
          namespaces: pods ? 1 : 0,
          deployments: pods ? 1 : 0,
        });
        setWorkers([{
          name: 'sentinel-host',
          cpu: `${cpu}%`,
          cpuPercentage: cpu,
          memory: `${mem}%`,
          memoryPercentage: mem,
          pods: pods || 0,
          status: cpu > 90 || mem > 90 ? 'critical' : cpu > 70 || mem > 80 ? 'warning' : 'healthy',
          network: {
            in: `${get('network_in_kb')} KB`,
            out: `${get('network_out_kb')} KB`,
          },
        }]);
      } catch (error) {
        console.error('Failed to load infrastructure overview', error);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Kubernetes Overview</CardTitle>
        <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-500">
          Healthy
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 text-center mb-6">
          <div>
            <div className="text-2xl font-bold">{counts.nodes}</div>
            <div className="text-xs text-muted-foreground">Nodes</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{counts.pods}</div>
            <div className="text-xs text-muted-foreground">Pods</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{counts.namespaces}</div>
            <div className="text-xs text-muted-foreground">Namespaces</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{counts.deployments}</div>
            <div className="text-xs text-muted-foreground">Deployments</div>
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-medium">Node Status</h4>
          <div className="space-y-4">
            {workers.map((worker) => (
              <div key={worker.name} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{worker.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Pods: {worker.pods} • Network I/O: {worker.network.in} / {worker.network.out}
                      </div>
                    </div>
                  </div>
                  {worker.status === "healthy" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>CPU Usage</span>
                      <span>{worker.cpu}</span>
                    </div>
                    <Progress value={worker.cpuPercentage} className="h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Memory Usage</span>
                      <span>{worker.memory}</span>
                    </div>
                    <Progress value={worker.memoryPercentage} className="h-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}