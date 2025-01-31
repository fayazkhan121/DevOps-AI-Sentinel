import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dashboard, DashboardWidget } from "@/types/dashboard";
import * as dashboardService from "@/services/dashboardService";
import { MetricCard } from "@/components/MetricCard";
import { v4 as uuidv4 } from 'uuid';

export default function DashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [newWidget, setNewWidget] = useState({
    title: "",
    type: "metric" as const,
  });

  useEffect(() => {
    if (id) {
      loadDashboard(id);
    }
  }, [id]);

  const loadDashboard = async (dashboardId: string) => {
    try {
      const result = await dashboardService.getDashboard(dashboardId);
      if (result) {
        setDashboard(result);
      } else {
        toast({
          title: "Error",
          description: "Dashboard not found",
          variant: "destructive",
        });
        navigate("/dashboards");
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard",
        variant: "destructive",
      });
    }
  };

  const handleAddWidget = async () => {
    if (!dashboard || !id) return;
    if (!newWidget.title.trim()) {
      toast({
        title: "Error",
        description: "Widget title is required",
        variant: "destructive",
      });
      return;
    }

    const widget: DashboardWidget = {
      id: uuidv4(),
      type: newWidget.type,
      title: newWidget.title,
      position: {
        x: 0,
        y: dashboard.widgets.length,
        w: 1,
        h: 1,
      },
      config: {
        refreshInterval: 30000,
      },
    };

    const updatedDashboard = {
      ...dashboard,
      widgets: [...dashboard.widgets, widget],
    };

    try {
      await dashboardService.updateDashboard(updatedDashboard);
      setDashboard(updatedDashboard);
      setNewWidget({ title: "", type: "metric" });
      toast({
        title: "Success",
        description: "Widget added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add widget",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!dashboard || !id) return;

    const updatedDashboard = {
      ...dashboard,
      widgets: dashboard.widgets.filter(w => w.id !== widgetId),
    };

    try {
      await dashboardService.updateDashboard(updatedDashboard);
      setDashboard(updatedDashboard);
      toast({
        title: "Success",
        description: "Widget deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete widget",
        variant: "destructive",
      });
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case "metric":
        return (
          <MetricCard
            title={widget.title}
            value="0"
            trend={{ value: 0, label: "vs last period" }}
            type={widget.type}
          />
        );
      case "chart":
        return <div className="p-4 bg-card rounded-lg shadow">Chart Widget (Coming Soon)</div>;
      case "status":
        return <div className="p-4 bg-card rounded-lg shadow">Status Widget (Coming Soon)</div>;
      case "integration":
        return <div className="p-4 bg-card rounded-lg shadow">Integration Widget (Coming Soon)</div>;
      default:
        return null;
    }
  };

  if (!dashboard) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Loading Dashboard...</h2>
            <p className="text-muted-foreground">Please wait while we load your dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/dashboards")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{dashboard.name}</h2>
              {dashboard.description && (
                <p className="text-muted-foreground">{dashboard.description}</p>
              )}
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Widget</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Widget Title</label>
                  <Input
                    placeholder="Enter widget title"
                    value={newWidget.title}
                    onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Widget Type</label>
                  <Select
                    value={newWidget.type}
                    onValueChange={(value: "metric" | "chart" | "status" | "integration") =>
                      setNewWidget({ ...newWidget, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select widget type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric</SelectItem>
                      <SelectItem value="chart">Chart</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddWidget} className="w-full">
                  Add Widget
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboard.widgets.map((widget) => (
            <div key={widget.id} className="relative group">
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDeleteWidget(widget.id)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              {renderWidget(widget)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}