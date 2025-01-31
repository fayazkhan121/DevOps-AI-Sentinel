import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { AlertSettings } from "@/components/settings/AlertSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { initializeDefaultSettings } from "@/services/localDb";
import { useToast } from "@/components/ui/use-toast";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDefaultSettings();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings. Please try refreshing the page.",
          variant: "destructive",
        });
      }
    };
    init();
  }, [toast]);

  if (!isInitialized) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Loading Settings...</h2>
            <p className="text-muted-foreground">Please wait while we load your settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">
              Manage your application settings and preferences.
            </p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-4">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="notifications" className="space-y-4">
            <NotificationSettings />
          </TabsContent>
          <TabsContent value="alerts" className="space-y-4">
            <AlertSettings />
          </TabsContent>
          <TabsContent value="integrations" className="space-y-4">
            <IntegrationsSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}