import { DashboardWidget } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

interface WidgetGridProps {
  widgets: DashboardWidget[];
  onDeleteWidget: (widgetId: string) => void;
  renderWidget: (widget: DashboardWidget) => React.ReactNode;
}

export function WidgetGrid({ widgets, onDeleteWidget, renderWidget }: WidgetGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {widgets.map((widget) => (
        <div key={widget.id} className="relative group">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDeleteWidget(widget.id)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  );
}