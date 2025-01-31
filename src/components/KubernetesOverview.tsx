import { Check, Server, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

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

const workers: WorkerNode[] = [
  {
    name: "worker-1",
    cpu: "65%",
    cpuPercentage: 65,
    memory: "70%",
    memoryPercentage: 70,
    pods: 8,
    status: "healthy",
    network: {
      in: "1.2 GB/s",
      out: "856 MB/s"
    }
  },
  {
    name: "worker-2",
    cpu: "45%",
    cpuPercentage: 45,
    memory: "60%",
    memoryPercentage: 60,
    pods: 6,
    status: "healthy",
    network: {
      in: "980 MB/s",
      out: "750 MB/s"
    }
  },
  {
    name: "worker-3",
    cpu: "85%",
    cpuPercentage: 85,
    memory: "90%",
    memoryPercentage: 90,
    pods: 12,
    status: "warning",
    network: {
      in: "2.1 GB/s",
      out: "1.8 GB/s"
    }
  }
];

export function KubernetesOverview() {
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
            <div className="text-2xl font-bold">5</div>
            <div className="text-xs text-muted-foreground">Nodes</div>
          </div>
          <div>
            <div className="text-2xl font-bold">25</div>
            <div className="text-xs text-muted-foreground">Pods</div>
          </div>
          <div>
            <div className="text-2xl font-bold">4</div>
            <div className="text-xs text-muted-foreground">Namespaces</div>
          </div>
          <div>
            <div className="text-2xl font-bold">8</div>
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