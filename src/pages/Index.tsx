import { Database, Activity, Server, Cpu, BarChart3, Shield, DollarSign, Settings, Zap } from "lucide-react";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { AlertPanel } from "@/components/AlertPanel";
import { PipelineStatus } from "@/components/PipelineStatus";
import { ResourceGraph } from "@/components/ResourceGraph";
import { AnomalyDetection } from "@/components/AnomalyDetection";
import { KubernetesOverview } from "@/components/KubernetesOverview";
import { ServiceHealth } from "@/components/ServiceHealth";
import { SystemMetricsTimeline } from "@/components/SystemMetricsTimeline";
import { AdvancedDashboard } from "@/components/dashboard/AdvancedDashboard";
import RealTimeDashboard from "@/components/dashboard/RealTimeDashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useState } from "react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">DevOps AI Sentinel</h1>
          <div className="flex space-x-2">
            <Link to="/dashboards">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                All Dashboards
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>System Overview</span>
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Real-Time Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Advanced Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Real-time metrics overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            type="metric"
            title="System Health"
            value="98.5%"
            trend={{ value: 2.1, label: "vs last week" }}
            icon={<Server className="h-4 w-4 text-muted-foreground" />}
            prediction="AI Prediction: 99.1% (85% confidence)"
          />
          <MetricCard
            type="metric"
            title="Resource Usage"
            value="72%"
            trend={{ value: -5.4, label: "vs yesterday" }}
            icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
            prediction="Predicted peak: 85% in 2 hours"
          />
          <MetricCard
            type="metric"
            title="Active Services"
            value="45/48"
            trend={{ value: 0, label: "all services operational" }}
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            prediction="No service disruptions predicted"
          />
          <MetricCard
            type="metric"
            title="Database Load"
            value="65%"
            trend={{ value: 12.3, label: "increased load" }}
            icon={<Database className="h-4 w-4 text-muted-foreground" />}
            prediction="Alert threshold in ~45 minutes"
          />
        </div>

        {/* Enhanced Metrics Row */}
        <div className="grid gap-6 md:grid-cols-3">
          <MetricCard
            type="metric"
            title="Security Status"
            value="Secure"
            trend={{ value: 0, label: "No threats detected" }}
            icon={<Shield className="h-4 w-4 text-green-600" />}
            prediction="Security monitoring active"
          />
          <MetricCard
            type="metric"
            title="Cost Optimization"
            value="$2,450"
            trend={{ value: -15.2, label: "vs last month" }}
            icon={<DollarSign className="h-4 w-4 text-green-600" />}
            prediction="Potential savings: $1,200 identified"
          />
          <MetricCard
            type="metric"
            title="Compliance Score"
            value="94.2%"
            trend={{ value: 2.1, label: "vs last quarter" }}
            icon={<Shield className="h-4 w-4 text-blue-600" />}
            prediction="SOC2 compliance maintained"
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

            {/* Quick Actions */}
            <div className="grid gap-6">
              <div className="bg-card border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link to="/settings">
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                  <Link to="/dashboards">
                    <Button variant="outline" className="w-full">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Dashboards
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Security Scan
                  </Button>
                  <Button variant="outline" className="w-full">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Cost Report
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6">
            <RealTimeDashboard />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <AdvancedDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;