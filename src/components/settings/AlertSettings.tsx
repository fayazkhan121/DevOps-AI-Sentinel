import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Bell, Shield, AlertTriangle, Info, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { saveSettings, getSettings } from "@/services/localDb";

const alertRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(1, "Description is required"),
  dashboardLink: z.string().url("Must be a valid URL"),
});

type AlertRule = z.infer<typeof alertRuleSchema>;

const severityIcons = {
  low: <Info className="h-5 w-5 text-blue-500" />,
  medium: <Shield className="h-5 w-5 text-yellow-500" />,
  high: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  critical: <Bell className="h-5 w-5 text-red-500" />,
};

export function AlertSettings() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const { toast } = useToast();
  const form = useForm<AlertRule>({
    resolver: zodResolver(alertRuleSchema),
    defaultValues: {
      name: "",
      severity: "low",
      description: "",
      dashboardLink: "",
    },
  });

  useEffect(() => {
    const loadAlertRules = async () => {
      try {
        const savedRules = await getSettings('alerts');
        if (savedRules) {
          setRules(savedRules);
        }
      } catch (error) {
        console.error('Failed to load alert rules:', error);
        toast({
          title: "Error loading alert rules",
          description: "Failed to load your alert rules. Please try again.",
          variant: "destructive",
        });
      }
    };
    loadAlertRules();
  }, [toast]);

  const onSubmit = async (data: AlertRule) => {
    const newRules = [...rules, data];
    try {
      await saveSettings('alerts', newRules);
      setRules(newRules);
      toast({
        title: "Alert Rule Created",
        description: "Your new alert rule has been added successfully.",
      });
      form.reset();
    } catch (error) {
      console.error('Failed to save alert rule:', error);
      toast({
        title: "Error saving alert rule",
        description: "Failed to save your alert rule. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (index: number) => {
    try {
      const newRules = rules.filter((_, i) => i !== index);
      await saveSettings('alerts', newRules);
      setRules(newRules);
      toast({
        title: "Alert Rule Deleted",
        description: "The alert rule has been removed.",
      });
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
      toast({
        title: "Error deleting alert rule",
        description: "Failed to delete the alert rule. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>
            Configure and manage alert rules for your system monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Bell className="mr-2 h-4 w-4" />
                  Add New Alert Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Alert Rule</DialogTitle>
                  <DialogDescription>
                    Set up a new alert rule with custom conditions and actions.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rule Name</FormLabel>
                          <FormControl>
                            <Input placeholder="CPU Usage Alert" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Alert when CPU usage exceeds 90%"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dashboardLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dashboard Link</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://dashboard.example.com/cpu-metrics"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Link to the relevant dashboard for this alert
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit">Create Alert Rule</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <ScrollArea className="h-[400px] rounded-md border p-4">
              {rules.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No alert rules configured yet. Click the button above to add one.
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule, index) => (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center space-x-2">
                          {severityIcons[rule.severity]}
                          <CardTitle className="text-sm font-medium">
                            {rule.name}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                        <a
                          href={rule.dashboardLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline mt-2 inline-block"
                        >
                          View Dashboard
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
