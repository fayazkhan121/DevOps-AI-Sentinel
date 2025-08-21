import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardWidget } from "@/types/dashboard";
import { v4 as uuidv4 } from 'uuid';

interface WidgetFormProps {
  onAdd: (widget: DashboardWidget) => void;
}

export function WidgetForm({ onAdd }: WidgetFormProps) {
  const [newWidget, setNewWidget] = useState<{
    title: string;
    type: 'metric' | 'chart' | 'status' | 'integration';
  }>({
    title: "",
    type: "metric",
  });

  const handleAddWidget = () => {
    if (!newWidget.title.trim()) return;

    const widget: DashboardWidget = {
      id: uuidv4(),
      type: newWidget.type,
      title: newWidget.title,
      position: {
        x: 0,
        y: 0,
        w: 1,
        h: 1,
      },
      config: {
        refreshInterval: 30000,
      },
    };

    onAdd(widget);
    setNewWidget({ title: "", type: "metric" });
  };

  return (
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
            onValueChange={(value: 'metric' | 'chart' | 'status' | 'integration') =>
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
  );
}