import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "./ThemeToggle";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveSettings, getSettings } from "@/services/localDb";
import { useToast } from "@/components/ui/use-toast";

export function GeneralSettings() {
  const [timeZone, setTimeZone] = useState("UTC");
  const [refreshInterval, setRefreshInterval] = useState("30");
  const [retentionPeriod, setRetentionPeriod] = useState("30");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getSettings('general');
        if (settings) {
          setTimeZone(settings.timeZone);
          setRefreshInterval(settings.refreshInterval);
          setRetentionPeriod(settings.retentionPeriod);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast({
          title: "Error loading settings",
          description: "Failed to load your settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [toast]);

  const handleSettingChange = async (key: string, value: string) => {
    try {
      const currentSettings = await getSettings('general') || {};
      const newSettings = { ...currentSettings, [key]: value };
      await saveSettings('general', newSettings);
      
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });

      switch(key) {
        case 'timeZone':
          setTimeZone(value);
          break;
        case 'refreshInterval':
          setRefreshInterval(value);
          break;
        case 'retentionPeriod':
          setRetentionPeriod(value);
          break;
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">General Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure your general application settings
        </p>
      </div>
      
      <div className="space-y-4">
        <ThemeToggle />
        
        <div className="space-y-2">
          <Label>Time Zone</Label>
          <Select 
            value={timeZone} 
            onValueChange={(value) => handleSettingChange('timeZone', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="EST">Eastern Time</SelectItem>
              <SelectItem value="CST">Central Time</SelectItem>
              <SelectItem value="PST">Pacific Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Refresh Interval</Label>
          <Select 
            value={refreshInterval}
            onValueChange={(value) => handleSettingChange('refreshInterval', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select refresh interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data Retention Period</Label>
          <RadioGroup 
            value={retentionPeriod}
            onValueChange={(value) => handleSettingChange('retentionPeriod', value)}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="7" id="7days" />
                <Label htmlFor="7days">7 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="30days" />
                <Label htmlFor="30days">30 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="90" id="90days" />
                <Label htmlFor="90days">90 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="180" id="180days" />
                <Label htmlFor="180days">180 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="365" id="1year" />
                <Label htmlFor="1year">1 year</Label>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}