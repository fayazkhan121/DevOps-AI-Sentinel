import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IntegrationConfigForm } from "./IntegrationConfigForm";
import { INTEGRATION_CONFIGS } from "@/lib/integrationConfigs";
import { IntegrationConfig, IntegrationCredentials } from "@/types/integrations";
import { saveSettings, getSettings } from "@/services/localDb";
import { useToast } from "@/components/ui/use-toast";

interface IntegrationCardProps {
  integration: IntegrationConfig;
  onConfigure: () => void;
  onDisconnect: () => void;
}

const IntegrationCard = ({ integration, onConfigure, onDisconnect }: IntegrationCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="flex items-center space-x-2">
        {integration.icon}
        <CardTitle className="text-sm font-medium">{integration.title}</CardTitle>
      </div>
      <Switch 
        checked={integration.connected} 
        onCheckedChange={(checked) => {
          if (checked) {
            onConfigure();
          } else {
            onDisconnect();
          }
        }} 
      />
    </CardHeader>
    <CardContent>
      <CardDescription>{integration.description}</CardDescription>
    </CardContent>
  </Card>
);

export function IntegrationsSettings() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        setIsLoading(true);
        const savedIntegrations = await getSettings('integrations');
        console.log('Loaded integrations:', savedIntegrations);
        
        if (savedIntegrations) {
          // Merge saved integrations with their config to get the icon
          const mergedIntegrations = savedIntegrations.map((saved: IntegrationConfig) => {
            const config = INTEGRATION_CONFIGS.find(c => c.id === saved.id);
            return {
              ...saved,
              icon: config?.icon // Restore the icon from the config
            };
          });
          setIntegrations(mergedIntegrations);
        } else {
          setIntegrations([]);
          await saveSettings('integrations', []);
        }
      } catch (error) {
        console.error('Failed to load integrations:', error);
        toast({
          title: "Error loading integrations",
          description: "Failed to load your integrations. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadIntegrations();
  }, [toast]);

  const handleAddIntegration = (integration: IntegrationConfig) => {
    setSelectedIntegration(integration);
    setIsConfiguring(true);
    setIsDialogOpen(false);
  };

  const handleConfigureSubmit = async (credentials: IntegrationCredentials) => {
    if (!selectedIntegration) return;

    try {
      console.log('Configuring integration:', selectedIntegration.id, 'with credentials:', credentials);
      
      // Create new integration object without the icon
      const { icon, ...integrationWithoutIcon } = selectedIntegration;
      const newIntegration = {
        ...integrationWithoutIcon,
        connected: true,
        credentials
      };

      // Get current integrations without icons
      const currentIntegrations = (await getSettings('integrations') || []).map(
        (integration: IntegrationConfig) => {
          const { icon, ...rest } = integration;
          return rest;
        }
      );

      // Remove existing integration if it exists
      const updatedIntegrations = currentIntegrations.filter(
        (i: IntegrationConfig) => i.id !== selectedIntegration.id
      );

      // Add new integration
      updatedIntegrations.push(newIntegration);

      // Save to storage (without icons)
      await saveSettings('integrations', updatedIntegrations);
      
      // Update state (with icons)
      const mergedIntegrations = updatedIntegrations.map((saved: IntegrationConfig) => {
        const config = INTEGRATION_CONFIGS.find(c => c.id === saved.id);
        return {
          ...saved,
          icon: config?.icon
        };
      });
      
      setIntegrations(mergedIntegrations);
      setSelectedIntegration(null);
      setIsConfiguring(false);

      toast({
        title: "Integration Added",
        description: `${selectedIntegration.title} has been successfully configured.`,
      });
    } catch (error) {
      console.error('Failed to save integration:', error);
      toast({
        title: "Error saving integration",
        description: "Failed to save your integration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      console.log('Disconnecting integration:', integrationId);
      
      // Get current integrations
      const currentIntegrations = await getSettings('integrations') || [];
      
      // Filter out the integration to disconnect
      const updatedIntegrations = currentIntegrations.filter(
        (i: IntegrationConfig) => i.id !== integrationId
      );

      // Save to storage
      await saveSettings('integrations', updatedIntegrations);
      
      // Update state
      setIntegrations(updatedIntegrations);
      
      toast({
        title: "Integration Removed",
        description: "The integration has been successfully removed.",
      });
    } catch (error) {
      console.error('Failed to remove integration:', error);
      toast({
        title: "Error removing integration",
        description: "Failed to remove the integration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const availableIntegrations = INTEGRATION_CONFIGS.filter(
    integration => !integrations.find(i => i.id === integration.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Loading integrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Platform Integrations</h3>
          <p className="text-sm text-muted-foreground">
            Connect your DevOps tools and cloud platforms
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-[180px]">
              <Plus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Integration</DialogTitle>
              <DialogDescription>
                Choose from available integrations to add to your workspace
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-4 py-4">
                {availableIntegrations.map((integration) => (
                  <Card
                    key={integration.id}
                    className="cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => handleAddIntegration(integration)}
                  >
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                      <div className="flex items-center space-x-2">
                        {integration.icon}
                        <CardTitle className="text-sm font-medium">
                          {integration.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{integration.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {isConfiguring && selectedIntegration && (
        <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure {selectedIntegration.title}</DialogTitle>
              <DialogDescription>
                Enter the required credentials to connect to {selectedIntegration.title}
              </DialogDescription>
            </DialogHeader>
            <IntegrationConfigForm
              integration={selectedIntegration}
              onSubmit={handleConfigureSubmit}
              onCancel={() => {
                setIsConfiguring(false);
                setSelectedIntegration(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConfigure={() => {
              setSelectedIntegration(integration);
              setIsConfiguring(true);
            }}
            onDisconnect={() => handleDisconnect(integration.id)}
          />
        ))}
      </div>
    </div>
  );
}