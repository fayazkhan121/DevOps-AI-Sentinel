import { useEffect, useState } from "react";
import { Check, Clock, AlertOctagon, Loader, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import WebSocketService from "@/services/websocket";
import { Pipeline, PipelineStep } from "@/types/metrics";
import { Progress } from "./ui/progress";

const initialPipeline: Pipeline = {
  id: "1",
  name: "Main Deployment",
  status: "running",
  startTime: new Date().toISOString(),
  trigger: "automated",
  branch: "main",
  commit: "abc123",
  steps: [
    {
      id: "1",
      name: "Build",
      status: "completed",
      duration: "5m",
      startTime: new Date(Date.now() - 900000).toISOString(),
      endTime: new Date(Date.now() - 600000).toISOString(),
      resources: {
        cpu: "2 cores",
        memory: "4GB",
        storage: "1GB"
      }
    },
    {
      id: "2",
      name: "Test",
      status: "completed",
      duration: "10m",
      startTime: new Date(Date.now() - 600000).toISOString(),
      endTime: new Date(Date.now() - 300000).toISOString(),
      resources: {
        cpu: "4 cores",
        memory: "8GB",
        storage: "2GB"
      }
    },
    {
      id: "3",
      name: "Deploy",
      status: "in-progress",
      duration: "15m",
      startTime: new Date(Date.now() - 300000).toISOString(),
      resources: {
        cpu: "2 cores",
        memory: "4GB",
        storage: "5GB"
      }
    }
  ]
};

export function PipelineStatus() {
  const [pipeline, setPipeline] = useState<Pipeline>(initialPipeline);
  const [progress, setProgress] = useState(66);

  useEffect(() => {
    const ws = WebSocketService.getInstance();
    
    const handlePipelineUpdate = (data: Pipeline) => {
      setPipeline(data);
      // Calculate overall progress
      const completed = data.steps.filter(step => step.status === "completed").length;
      const total = data.steps.length;
      setProgress((completed / total) * 100);
    };

    ws.subscribeToPipeline(handlePipelineUpdate);

    return () => {
      ws.unsubscribe("pipeline-update", handlePipelineUpdate);
    };
  }, []);

  const getStatusIcon = (status: PipelineStep["status"]) => {
    switch (status) {
      case "completed":
        return <Check className="h-4 w-4" />;
      case "in-progress":
        return <Loader className="h-4 w-4 animate-spin" />;
      case "failed":
        return <AlertOctagon className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: PipelineStep["status"]) => {
    switch (status) {
      case "completed":
        return "border-green-500 bg-green-500/20 text-green-500";
      case "in-progress":
        return "border-blue-500 bg-blue-500/20 text-blue-500";
      case "failed":
        return "border-red-500 bg-red-500/20 text-red-500";
      default:
        return "border-muted bg-muted/20 text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pipeline Status</CardTitle>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-muted-foreground">Branch:</span>
            <span className="font-medium">{pipeline.branch}</span>
            <span className="text-muted-foreground">Commit:</span>
            <span className="font-medium">{pipeline.commit.slice(0, 7)}</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-border" />
          <div className="space-y-6">
            {pipeline.steps.map((step) => (
              <div key={step.id} className="relative pl-8">
                <div
                  className={cn(
                    "absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border",
                    getStatusColor(step.status)
                  )}
                >
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{step.name}</div>
                    {step.status === "in-progress" && step.startTime && (
                      <div className="text-sm text-muted-foreground">
                        Started {new Date(step.startTime).toLocaleString()}
                      </div>
                    )}
                    {step.resources && (
                      <div className="text-xs text-muted-foreground">
                        Resources: {step.resources.cpu}, {step.resources.memory} RAM
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {step.duration}
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