import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { IntegrationConfig, IntegrationCredentials } from "@/types/integrations";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

interface IntegrationConfigFormProps {
  integration: IntegrationConfig;
  onSubmit: (credentials: IntegrationCredentials) => void;
  onCancel: () => void;
}

export function IntegrationConfigForm({ 
  integration, 
  onSubmit, 
  onCancel 
}: IntegrationConfigFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<IntegrationCredentials>();

  const handleSubmit = async (data: IntegrationCredentials) => {
    try {
      setIsSubmitting(true);
      // Here we would typically validate the credentials with the service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      onSubmit(data);
      toast({
        title: "Integration configured",
        description: `Successfully configured ${integration.title}`,
      });
    } catch (error) {
      toast({
        title: "Configuration failed",
        description: "Failed to configure integration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {integration.fields.map((field) => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    type={field.type === 'password' ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Configuring..." : "Configure Integration"}
          </Button>
        </div>
      </form>
    </Form>
  );
}