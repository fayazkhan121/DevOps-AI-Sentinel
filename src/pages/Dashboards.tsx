import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Dashboard } from "@/types/dashboard";
import * as dashboardService from "@/services/dashboardService";

export default function Dashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardDescription, setNewDashboardDescription] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    const result = await dashboardService.getAllDashboards();
    setDashboards(result);
  };

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) {
      toast({
        title: "Error",
        description: "Dashboard name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const dashboard = await dashboardService.createDashboard(
        newDashboardName,
        newDashboardDescription
      );
      setDashboards([...dashboards, dashboard]);
      setNewDashboardName("");
      setNewDashboardDescription("");
      toast({
        title: "Success",
        description: "Dashboard created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create dashboard",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDashboard = async (id: string) => {
    try {
      await dashboardService.deleteDashboard(id);
      setDashboards(dashboards.filter(d => d.id !== id));
      toast({
        title: "Success",
        description: "Dashboard deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete dashboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboards</h1>
          <p className="text-muted-foreground">Manage your custom dashboards</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Enter dashboard name"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Enter dashboard description"
                  value={newDashboardDescription}
                  onChange={(e) => setNewDashboardDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateDashboard} className="w-full">
                Create Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards.map((dashboard) => (
          <Card key={dashboard.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{dashboard.name}</CardTitle>
                  {dashboard.description && (
                    <CardDescription>{dashboard.description}</CardDescription>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/dashboard/${dashboard.id}`)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDashboard(dashboard.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Created: {new Date(dashboard.createdAt).toLocaleDateString()}
              </p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}