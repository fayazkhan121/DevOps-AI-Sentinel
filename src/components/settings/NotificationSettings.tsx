import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { saveSettings, getSettings } from "@/services/localDb";
import { useToast } from "@/components/ui/use-toast";

export function NotificationSettings() {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSettings('notifications');
        if (settings) {
          setEmailEnabled(settings.emailNotifications ?? false);
          setSlackEnabled(settings.slackNotifications ?? false);
          setInAppEnabled(settings.inAppNotifications ?? true);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
        toast({
          title: "Error loading settings",
          description: "Failed to load your notification settings. Please try again.",
          variant: "destructive",
        });
      }
    };
    loadSettings();
  }, [toast]);

  const handleSettingChange = async (key: string, value: boolean) => {
    try {
      const currentSettings = await getSettings('notifications') || {};
      const newSettings = { ...currentSettings, [key]: value };
      await saveSettings('notifications', newSettings);
      
      toast({
        title: "Settings saved",
        description: "Your notification settings have been saved successfully.",
      });

      switch(key) {
        case 'emailNotifications':
          setEmailEnabled(value);
          break;
        case 'slackNotifications':
          setSlackEnabled(value);
          break;
        case 'inAppNotifications':
          setInAppEnabled(value);
          break;
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save your notification settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you want to receive notifications
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <Switch 
            checked={emailEnabled}
            onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Slack Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications in Slack
            </p>
          </div>
          <Switch 
            checked={slackEnabled}
            onCheckedChange={(checked) => handleSettingChange('slackNotifications', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>In-App Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications within the application
            </p>
          </div>
          <Switch 
            checked={inAppEnabled}
            onCheckedChange={(checked) => handleSettingChange('inAppNotifications', checked)}
          />
        </div>
      </div>
    </div>
  );
}