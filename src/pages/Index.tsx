import { Database, Activity, Server, Cpu } from "lucide-react";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { AlertPanel } from "@/components/AlertPanel";
import { PipelineStatus } from "@/components/PipelineStatus";
import { ResourceGraph } from "@/components/ResourceGraph";
import { AnomalyDetection } from "@/components/AnomalyDetection";
import { KubernetesOverview } from "@/components/KubernetesOverview";
import { ServiceHealth } from "@/components/ServiceHealth";
import { SystemMetricsTimeline } from "@/components/SystemMetricsTimeline";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6 space-y-6">
        {/* Real-time metrics overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="System Health"
            value="98.5%"
            trend={{ value: 2.1, label: "vs last week" }}
            icon={<Server className="h-4 w-4 text-muted-foreground" />}
            prediction="AI Prediction: 99.1% (85% confidence)"
          />
          <MetricCard
            title="Resource Usage"
            value="72%"
            trend={{ value: -5.4, label: "vs yesterday" }}
            icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
            prediction="Predicted peak: 85% in 2 hours"
          />
          <MetricCard
            title="Active Services"
            value="45/48"
            trend={{ value: 0, label: "all services operational" }}
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            prediction="No service disruptions predicted"
          />
          <MetricCard
            title="Database Load"
            value="65%"
            trend={{ value: 12.3, label: "increased load" }}
            icon={<Database className="h-4 w-4 text-muted-foreground" />}
            prediction="Alert threshold in ~45 minutes"
          />
        </div>

        {/* System metrics timeline */}
        <div className="grid gap-6">
          <SystemMetricsTimeline />
        </div>

        {/* Active Alerts - Full Width */}
        <div className="grid gap-6">
          <AlertPanel />
        </div>

        {/* Pipeline Status and Resource Graph */}
        <div className="grid gap-6 md:grid-cols-2">
          <PipelineStatus />
          <ResourceGraph />
        </div>

        {/* AI Insights and Service Health */}
        <div className="grid gap-6 md:grid-cols-2">
          <AnomalyDetection />
          <ServiceHealth />
        </div>

        {/* Infrastructure Overview */}
        <div className="grid gap-6">
          <KubernetesOverview />
        </div>
      </main>
    </div>
  );
};

export default Index;