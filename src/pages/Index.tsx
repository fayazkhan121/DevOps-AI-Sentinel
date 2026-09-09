import { useState, useEffect } from "react";
import { MetricCard } from "../components/MetricCard";
import { AlertPanel } from "../components/AlertPanel";
import { PipelineStatus } from "../components/PipelineStatus";
import { ResourceGraph } from "../components/ResourceGraph";
import { AnomalyDetection } from "../components/AnomalyDetection";
import { KubernetesOverview } from "../components/KubernetesOverview";
import { ServiceHealth } from "../components/ServiceHealth";
import { SystemMetricsTimeline } from "../components/SystemMetricsTimeline";
import { AdvancedDashboard } from "../components/dashboard/AdvancedDashboard";
import { RealTimeDashboard } from "../components/dashboard/RealTimeDashboard";
import { apiFetch } from "@/lib/apiClient";
import { metricsService } from "@/services/metricsService";

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState({
    systemHealth: 0,
    activeServices: "0/0",
    resourceUsage: 0,
    responseTimeMs: 0,
    healthChange: 0,
    servicesChange: 0,
    resourceChange: 0,
    latencyChange: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await metricsService.refresh();
        const data = await apiFetch<{ overview: { systemHealth: number; activeServices: string; resourceUsage: number; responseTimeMs: number } }>('/metrics/overview');
        if (!cancelled && data.overview) {
          setOverview({
            systemHealth: data.overview.systemHealth,
            activeServices: data.overview.activeServices,
            resourceUsage: data.overview.resourceUsage,
            responseTimeMs: data.overview.responseTimeMs,
            healthChange: 0,
            servicesChange: 0,
            resourceChange: 0,
            latencyChange: 0,
          });
        }
      } catch (error) {
        console.error('Failed to load overview metrics', error);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">System Overview</h1>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              System Overview
            </button>
            <button
              onClick={() => setActiveTab("realtime")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "realtime"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Real-Time Dashboard
            </button>
            <button
              onClick={() => setActiveTab("advanced")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "advanced"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Advanced Analytics
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">


            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="System Health"
                value={`${overview.systemHealth}%`}
                change={`${overview.healthChange >= 0 ? '+' : ''}${overview.healthChange}%`}
                changeType="positive"
                icon="health"
              />
              <MetricCard
                title="Active Services"
                value={overview.activeServices}
                change={`${overview.servicesChange}`}
                changeType="neutral"
                icon="services"
              />
              <MetricCard
                title="Resource Usage"
                value={`${overview.resourceUsage}%`}
                change={`${overview.resourceChange >= 0 ? '+' : ''}${overview.resourceChange}%`}
                changeType="neutral"
                icon="resources"
              />
              <MetricCard
                title="Response Time"
                value={`${overview.responseTimeMs}ms`}
                change={`${overview.latencyChange}ms`}
                changeType="positive"
                icon="performance"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              <AlertPanel />
              <PipelineStatus />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ResourceGraph />
              <AnomalyDetection />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <KubernetesOverview />
              <ServiceHealth />
            </div>

            <SystemMetricsTimeline />
          </div>
        )}

        {activeTab === "realtime" && (
          <RealTimeDashboard />
        )}

        {activeTab === "advanced" && (
          <AdvancedDashboard />
        )}
      </main>
    </div>
  );
};

export default Index;