import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings, Plus, RefreshCw, Eye, EyeOff, Edit, Save, X,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock,
  Server, Activity, BarChart3, PieChart, Gauge, Table, Grid3X3
} from 'lucide-react';
import { dashboardService, Dashboard, DashboardWidget } from '@/services/dashboardService';
import { authService } from '@/services/authService';
import WidgetEditor from '@/components/dashboard/WidgetEditor';
import { AdvancedChart } from '@/components/dashboard/AdvancedCharts';
import { metricsService } from '@/services/metricsService';

// Widget Components
const MetricWidget: React.FC<{ widget: DashboardWidget; data: any }> = ({ widget, data }) => {
  const getStatusColor = (value: number, thresholds: any) => {
    if (thresholds?.critical && value <= thresholds.critical) return 'text-red-600';
    if (thresholds?.warning && value <= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        {widget.description && (
          <p className="text-xs text-muted-foreground">{widget.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className={`text-3xl font-bold ${getStatusColor(data.value, widget.config.thresholds)}`}>
            {data.value}{data.unit}
          </div>
          <div className="flex items-center justify-center gap-1 mt-2 text-sm">
            {getTrendIcon(data.trend)}
            <span className={data.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
              {data.change}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ChartWidget: React.FC<{ widget: DashboardWidget; data: any }> = ({ widget, data }) => {
  // Convert data to chart format if needed
  const chartData = Array.isArray(data) ? data : [];
  
  // Determine chart type from widget config
  const chartType = widget.config.chartType || 'line';
  
  // Get thresholds from widget config
  const thresholds = widget.config.thresholds;
  
  // Get color scheme from widget config
  const colorScheme = widget.config.colorScheme || 'default';

  return (
    <AdvancedChart
      data={chartData}
      title={widget.title}
      subtitle={widget.description}
      type={chartType}
      height={200}
      showLegend={true}
      showGrid={true}
      animate={true}
      thresholds={thresholds}
      colorScheme={colorScheme}
    />
  );
};

const StatusWidget: React.FC<{ widget: DashboardWidget; data: any }> = ({ widget, data }) => {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        {widget.description && (
          <p className="text-xs text-muted-foreground">{widget.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <span className="text-sm font-medium">{item.service}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
                <span className="text-muted-foreground">{item.lastCheck}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const TableWidget: React.FC<{ widget: DashboardWidget; data: any }> = ({ widget, data }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        {widget.description && (
          <p className="text-xs text-muted-foreground">{widget.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {widget.config.columns?.map((column) => (
                  <th key={column} className="text-left p-2 font-medium">
                    {column.charAt(0).toUpperCase() + column.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, index: number) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  {widget.config.columns?.map((column) => (
                    <td key={column} className="p-2">
                      {column === 'status' ? (
                        <Badge 
                          variant={row[column] === 'healthy' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {row[column]}
                        </Badge>
                      ) : (
                        row[column]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showWidgetEditor, setShowWidgetEditor] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);

  useEffect(() => {
    loadDashboard();
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, [id]);

  useEffect(() => {
    if (dashboard) {
      // Start auto-refresh
      const interval = setInterval(() => {
        loadDashboardData();
      }, (dashboard.refreshInterval || 60) * 1000);
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [dashboard]);

  const loadDashboard = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const dashboardData = await dashboardService.getDashboard(id);
      if (dashboardData) {
        setDashboard(dashboardData);
        await loadDashboardData();
        await dashboardService.incrementViewCount(id);
      } else {
        navigate('/dashboards');
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      navigate('/dashboards');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    if (!dashboard) return;

    try {
      const updatedWidgets = await Promise.all(
        dashboard.widgets.map(async (widget) => {
          let data;
          
          // Generate real data based on widget type and data source
          switch (widget.config.dataSource) {
            case 'system_metrics':
              if (widget.type === 'chart') {
                data = metricsService.getHistoricalData('cpu', 24);
              } else if (widget.type === 'metric') {
                const systemMetrics = metricsService.generateSystemMetrics();
                data = {
                  value: systemMetrics.cpuUsage,
                  unit: '%',
                  trend: 'up',
                  change: 2.1
                };
              } else if (widget.type === 'status') {
                data = metricsService.generateServiceMetrics();
              }
              break;
              
            case 'application_metrics':
              if (widget.type === 'chart') {
                data = metricsService.getHistoricalData('responseTime', 24);
              } else if (widget.type === 'metric') {
                const systemMetrics = metricsService.generateSystemMetrics();
                data = {
                  value: systemMetrics.responseTime,
                  unit: 'ms',
                  trend: 'down',
                  change: -12
                };
              }
              break;
              
            case 'business_metrics':
              if (widget.type === 'chart') {
                data = metricsService.getHistoricalData('activeUsers', 24);
              } else if (widget.type === 'metric') {
                const businessMetrics = metricsService.generateBusinessMetrics();
                data = {
                  value: businessMetrics.activeUsers,
                  unit: '',
                  trend: 'up',
                  change: 15
                };
              }
              break;
              
            default:
              // Fallback to sample data
              data = await dashboardService.generateSampleData(widget);
          }
          
          return { ...widget, data, lastUpdated: new Date().toISOString() };
        })
      );

      setDashboard({ ...dashboard, widgets: updatedWidgets });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!dashboard) return;
    
    try {
      await dashboardService.updateDashboard(dashboard.id, dashboard);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadDashboard(); // Reload original data
  };

  const handleAddWidget = () => {
    setEditingWidget(null);
    setShowWidgetEditor(true);
  };

  const handleEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    setShowWidgetEditor(true);
  };

  const handleSaveWidget = async (widgetData: Omit<DashboardWidget, 'id'>) => {
    if (!dashboard) return;

    try {
      if (editingWidget) {
        // Update existing widget
        await dashboardService.updateWidget(dashboard.id, editingWidget.id, widgetData);
      } else {
        // Add new widget
        await dashboardService.addWidget(dashboard.id, widgetData);
      }
      
      // Reload dashboard to get updated data
      await loadDashboard();
      setShowWidgetEditor(false);
      setEditingWidget(null);
    } catch (error) {
      console.error('Failed to save widget:', error);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!dashboard) return;

    try {
      await dashboardService.removeWidget(dashboard.id, widgetId);
      await loadDashboard();
    } catch (error) {
      console.error('Failed to delete widget:', error);
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.data) return null;

    switch (widget.type) {
      case 'metric':
        return <MetricWidget widget={widget} data={widget.data} />;
      case 'chart':
        return <ChartWidget widget={widget} data={widget.data} />;
      case 'status':
        return <StatusWidget widget={widget} data={widget.data} />;
      case 'table':
        return <TableWidget widget={widget} data={widget.data} />;
      default:
        return (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
              <span>Unsupported widget type: {widget.type}</span>
            </CardContent>
          </Card>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Dashboard not found</h2>
        <Button onClick={() => navigate('/dashboards')}>
          Back to Dashboards
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboards')}>
              ← Back
            </Button>
            <h1 className="text-3xl font-bold">{dashboard.name}</h1>
            <Badge className={getCategoryColor(dashboard.category)}>
              {dashboard.category}
            </Badge>
          </div>
          {dashboard.description && (
            <p className="text-muted-foreground mt-2">{dashboard.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {isEditing ? (
            <>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard Info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Auto-refresh: {dashboard.refreshInterval || 60}s</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          <span>{dashboard.viewCount} views</span>
        </div>
        <div className="flex items-center gap-1">
          <Grid3X3 className="h-4 w-4" />
          <span>{dashboard.widgets.length} widgets</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Last updated: {new Date(dashboard.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-6" style={{
        gridTemplateColumns: `repeat(12, 1fr)`,
        gridAutoRows: 'minmax(200px, auto)'
      }}>
        {dashboard.widgets.map((widget) => (
          <div
            key={widget.id}
            className="relative"
            style={{
              gridColumn: `span ${widget.position.w}`,
              gridRow: `span ${widget.position.h}`
            }}
          >
            {renderWidget(widget)}
            
            {isEditing && (
              <div className="absolute top-2 right-2 flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => handleEditWidget(widget)}
                  title="Edit Widget"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => handleDeleteWidget(widget.id)}
                  title="Delete Widget"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {dashboard.widgets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
            <p className="text-muted-foreground mb-4">
              Add widgets to start monitoring your systems
            </p>
            <Button onClick={handleAddWidget}>
              <Plus className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Widget Editor */}
      <WidgetEditor
        isOpen={showWidgetEditor}
        onClose={() => {
          setShowWidgetEditor(false);
          setEditingWidget(null);
        }}
        onSave={handleSaveWidget}
        existingWidget={editingWidget || undefined}
        dashboardId={dashboard?.id || ''}
      />
    </div>
  );
};

// Helper function
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'infrastructure': return 'bg-blue-100 text-blue-800';
    case 'application': return 'bg-green-100 text-green-800';
    case 'business': return 'bg-purple-100 text-purple-800';
    case 'security': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default DashboardView;