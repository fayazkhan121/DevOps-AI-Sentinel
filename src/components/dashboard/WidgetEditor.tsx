import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus, BarChart3, PieChart, LineChart, Activity, Gauge, Table, 
  Settings, Palette, Database, Code, Eye, EyeOff, Save, X,
  TrendingUp, AlertTriangle, Clock, Zap, Target, Layers
} from 'lucide-react';
import { DashboardWidget } from '@/services/dashboardService';

interface WidgetEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: Omit<DashboardWidget, 'id'>) => void;
  existingWidget?: DashboardWidget;
  dashboardId: string;
}

const WidgetEditor: React.FC<WidgetEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  existingWidget,
  dashboardId
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [widget, setWidget] = useState<Omit<DashboardWidget, 'id'>>({
    type: 'metric',
    title: '',
    description: '',
    position: { x: 0, y: 0, w: 3, h: 2 },
    config: {
      dataSource: 'system_metrics',
      query: '',
      refreshInterval: 30,
      thresholds: { warning: 80, critical: 60 },
      chartType: 'line',
      columns: [],
      filters: {}
    },
    isVisible: true
  });

  useEffect(() => {
    if (existingWidget) {
      setWidget({
        type: existingWidget.type,
        title: existingWidget.title,
        description: existingWidget.description,
        position: existingWidget.position,
        config: existingWidget.config,
        isVisible: existingWidget.isVisible
      });
    }
  }, [existingWidget]);

  const handleSave = () => {
    if (!widget.title.trim()) {
      alert('Widget title is required');
      return;
    }
    onSave(widget);
    onClose();
  };

  const updateConfig = (key: string, value: any) => {
    setWidget(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'metric': return <Target className="h-4 w-4" />;
      case 'chart': return <LineChart className="h-4 w-4" />;
      case 'table': return <Table className="h-4 w-4" />;
      case 'status': return <Activity className="h-4 w-4" />;
      case 'gauge': return <Gauge className="h-4 w-4" />;
      case 'pie': return <PieChart className="h-4 w-4" />;
      case 'bar': return <BarChart3 className="h-4 w-4" />;
      default: return <Plus className="h-4 w-4" />;
    }
  };

  const getChartTypeOptions = () => {
    switch (widget.type) {
      case 'chart':
        return [
          { value: 'line', label: 'Line Chart', icon: <LineChart className="h-4 w-4" /> },
          { value: 'bar', label: 'Bar Chart', icon: <BarChart3 className="h-4 w-4" /> },
          { value: 'area', label: 'Area Chart', icon: <Layers className="h-4 w-4" /> },
          { value: 'pie', label: 'Pie Chart', icon: <PieChart className="h-4 w-4" /> },
          { value: 'gauge', label: 'Gauge', icon: <Gauge className="h-4 w-4" /> }
        ];
      default:
        return [];
    }
  };

  const getDataSourceOptions = () => [
    { value: 'system_metrics', label: 'System Metrics' },
    { value: 'application_metrics', label: 'Application Metrics' },
    { value: 'business_metrics', label: 'Business Metrics' },
    { value: 'custom_query', label: 'Custom Query' },
    { value: 'external_api', label: 'External API' },
    { value: 'database', label: 'Database' }
  ];

  const getQueryTemplates = () => {
    switch (widget.config.dataSource) {
      case 'system_metrics':
        return [
          'SELECT AVG(cpu_usage) FROM system_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR',
          'SELECT AVG(memory_usage) FROM system_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR',
          'SELECT timestamp, cpu_usage FROM system_metrics WHERE timestamp > NOW() - INTERVAL 24 HOUR ORDER BY timestamp',
          'SELECT service_name, status, response_time FROM services ORDER BY status DESC'
        ];
      case 'application_metrics':
        return [
          'SELECT AVG(response_time) FROM request_metrics WHERE timestamp > NOW() - INTERVAL 5 MINUTES',
          'SELECT COUNT(*) as request_count FROM request_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR GROUP BY timestamp',
          'SELECT (COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*)) as error_rate FROM request_metrics'
        ];
      case 'business_metrics':
        return [
          'SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_activity > NOW() - INTERVAL 15 MINUTES',
          'SELECT DATE(timestamp) as date, SUM(amount) as revenue FROM transactions WHERE timestamp > NOW() - INTERVAL 30 DAYS GROUP BY DATE(timestamp)'
        ];
      default:
        return [];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {getWidgetIcon(widget.type)}
            <div>
              <h2 className="text-xl font-semibold">
                {existingWidget ? 'Edit Widget' : 'Create New Widget'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure your monitoring widget
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Widget
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="data">Data Source</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Settings */}
            <TabsContent value="basic" className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="widgetType">Widget Type</Label>
                    <Select
                      value={widget.type}
                      onValueChange={(value: any) => setWidget(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metric">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Metric Display
                          </div>
                        </SelectItem>
                        <SelectItem value="chart">
                          <div className="flex items-center gap-2">
                            <LineChart className="h-4 w-4" />
                            Chart/Graph
                          </div>
                        </SelectItem>
                        <SelectItem value="table">
                          <div className="flex items-center gap-2">
                            <Table className="h-4 w-4" />
                            Data Table
                          </div>
                        </SelectItem>
                        <SelectItem value="status">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Status Monitor
                          </div>
                        </SelectItem>
                        <SelectItem value="gauge">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            Gauge
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Widget Title</Label>
                    <Input
                      id="title"
                      value={widget.title}
                      onChange={(e) => setWidget(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter widget title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={widget.description || ''}
                      onChange={(e) => setWidget(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this widget monitors"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="visible"
                      checked={widget.isVisible}
                      onCheckedChange={(checked) => setWidget(prev => ({ ...prev, isVisible: checked }))}
                    />
                    <Label htmlFor="visible">Widget Visible</Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Widget Preview</Label>
                    <Card className="mt-2 p-4 bg-muted/50">
                      <div className="text-center">
                        {getWidgetIcon(widget.type)}
                        <h3 className="font-medium mt-2">{widget.title || 'Widget Title'}</h3>
                        {widget.description && (
                          <p className="text-sm text-muted-foreground mt-1">{widget.description}</p>
                        )}
                        <div className="mt-4 text-xs text-muted-foreground">
                          Type: {widget.type} | Size: {widget.position.w}x{widget.position.h}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Data Source Settings */}
            <TabsContent value="data" className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="dataSource">Data Source</Label>
                    <Select
                      value={widget.config.dataSource || 'system_metrics'}
                      onValueChange={(value) => updateConfig('dataSource', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getDataSourceOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="query">Query/Data Source</Label>
                    <Textarea
                      id="query"
                      value={widget.config.query || ''}
                      onChange={(e) => updateConfig('query', e.target.value)}
                      placeholder="Enter your query or data source configuration"
                      rows={6}
                    />
                    <div className="mt-2 text-xs text-muted-foreground">
                      Use SQL-like syntax or custom query format
                    </div>
                  </div>

                  <div>
                    <Label>Query Templates</Label>
                    <div className="mt-2 space-y-2">
                      {getQueryTemplates().map((template, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto p-2"
                          onClick={() => updateConfig('query', template)}
                        >
                          <Code className="h-3 w-3 mr-2" />
                          <span className="text-xs">{template}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <Select
                      value={String(widget.config.refreshInterval || 30)}
                      onValueChange={(value) => updateConfig('refreshInterval', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="600">10 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data Validation</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="validateData" defaultChecked />
                        <Label htmlFor="validateData">Validate data before display</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="cacheData" defaultChecked />
                        <Label htmlFor="cacheData">Cache data for performance</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Visualization Settings */}
            <TabsContent value="visualization" className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  {widget.type === 'chart' && (
                    <div>
                      <Label htmlFor="chartType">Chart Type</Label>
                      <Select
                        value={widget.config.chartType || 'line'}
                        onValueChange={(value) => updateConfig('chartType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getChartTypeOptions().map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                {option.icon}
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Thresholds & Alerts</Label>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Warning:</Label>
                        <Input
                          type="number"
                          value={widget.config.thresholds?.warning || ''}
                          onChange={(e) => updateConfig('thresholds', {
                            ...widget.config.thresholds,
                            warning: parseFloat(e.target.value) || undefined
                          })}
                          placeholder="80"
                          className="w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Critical:</Label>
                        <Input
                          type="number"
                          value={widget.config.thresholds?.critical || ''}
                          onChange={(e) => updateConfig('thresholds', {
                            ...widget.config.thresholds,
                            critical: parseFloat(e.target.value) || undefined
                          })}
                          placeholder="60"
                          className="w-20"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Color Scheme</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {['default', 'blue', 'green', 'red', 'purple', 'orange'].map(color => (
                        <Button
                          key={color}
                          variant="outline"
                          size="sm"
                          className="capitalize"
                        >
                          {color}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Display Options</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="showLegend" defaultChecked />
                        <Label htmlFor="showLegend">Show legend</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="showGrid" defaultChecked />
                        <Label htmlFor="showGrid">Show grid lines</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="animate" defaultChecked />
                        <Label htmlFor="animate">Enable animations</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Time Range</Label>
                    <Select defaultValue="1h">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5m">Last 5 minutes</SelectItem>
                        <SelectItem value="15m">Last 15 minutes</SelectItem>
                        <SelectItem value="1h">Last hour</SelectItem>
                        <SelectItem value="6h">Last 6 hours</SelectItem>
                        <SelectItem value="24h">Last 24 hours</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="custom">Custom range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Layout Settings */}
            <TabsContent value="layout" className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label>Widget Size</Label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Width (columns)</Label>
                        <Select
                          value={String(widget.position.w)}
                          onValueChange={(value) => setWidget(prev => ({
                            ...prev,
                            position: { ...prev.position, w: parseInt(value) }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 6, 8, 12].map(size => (
                              <SelectItem key={size} value={String(size)}>
                                {size} {size === 1 ? 'column' : 'columns'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Height (rows)</Label>
                        <Select
                          value={String(widget.position.h)}
                          onValueChange={(value) => setWidget(prev => ({
                            ...prev,
                            position: { ...prev.position, h: parseInt(value) }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 6, 8].map(size => (
                              <SelectItem key={size} value={String(size)}>
                                {size} {size === 1 ? 'row' : 'rows'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Position Preview</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                      <div className="grid gap-2" style={{
                        gridTemplateColumns: `repeat(12, 1fr)`,
                        gridTemplateRows: `repeat(6, 1fr)`
                      }}>
                        {Array.from({ length: 72 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 border ${
                              i < widget.position.w * widget.position.h ? 'bg-primary' : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 text-center">
                        Widget will occupy {widget.position.w} × {widget.position.h} grid cells
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Responsive Behavior</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="responsive" defaultChecked />
                        <Label htmlFor="responsive">Responsive layout</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="autoResize" defaultChecked />
                        <Label htmlFor="autoResize">Auto-resize on content</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Grid Settings</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Snap to grid:</Label>
                        <Switch id="snapToGrid" defaultChecked />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Grid size:</Label>
                        <Select defaultValue="20">
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10px</SelectItem>
                            <SelectItem value="20">20px</SelectItem>
                            <SelectItem value="30">30px</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced" className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label>Performance Options</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="lazyLoad" defaultChecked />
                        <Label htmlFor="lazyLoad">Lazy load data</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="debounce" defaultChecked />
                        <Label htmlFor="debounce">Debounce updates</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="virtualization" />
                        <Label htmlFor="virtualization">Enable virtualization</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Error Handling</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="showErrors" defaultChecked />
                        <Label htmlFor="showErrors">Show error messages</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="retryOnError" defaultChecked />
                        <Label htmlFor="retryOnError">Retry on error</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="fallbackData" />
                        <Label htmlFor="fallbackData">Use fallback data</Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Accessibility</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="ariaLabels" defaultChecked />
                        <Label htmlFor="ariaLabels">ARIA labels</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="keyboardNav" defaultChecked />
                        <Label htmlFor="keyboardNav">Keyboard navigation</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="highContrast" />
                        <Label htmlFor="highContrast">High contrast mode</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Export Options</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="exportPNG" defaultChecked />
                        <Label htmlFor="exportPNG">Export as PNG</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="exportCSV" defaultChecked />
                        <Label htmlFor="exportCSV">Export as CSV</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="exportJSON" />
                        <Label htmlFor="exportJSON">Export as JSON</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default WidgetEditor;
