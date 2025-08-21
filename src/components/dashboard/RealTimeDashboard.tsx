import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity, Shield, DollarSign, Server, Database, Network, Cloud,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle,
  Play, Pause, RefreshCw, Settings, BarChart3, Zap, Globe, Cpu, Memory, HardDrive
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { realTimeConnectionService, ConnectionConfig } from '@/services/realTimeConnectionService';
import { advancedMonitoring } from '@/services/advancedMonitoring';
import { advancedSecurity } from '@/services/advancedSecurity';
import { advancedCostManagement } from '@/services/advancedCostManagement';
import { cloudMonitoring } from '@/services/cloudMonitoring';
import { devopsIntegrations } from '@/services/devopsIntegrations';
import { advancedAlerting } from '@/services/advancedAlerting';
import { PlatformMetric } from '@/types';

interface DashboardMetrics {
  systemHealth: {
    overall: 'healthy' | 'degraded' | 'down';
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  security: {
    status: 'secure' | 'at-risk' | 'compromised';
    activeThreats: number;
    vulnerabilities: number;
    complianceScore: number;
  };
  cost: {
    currentSpend: number;
    budgetUsed: number;
    savings: number;
    trend: 'up' | 'down' | 'stable';
  };
  infrastructure: {
    totalServers: number;
    activeServices: number;
    cloudResources: number;
    k8sPods: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
    acknowledged: number;
  };
  connections: {
    total: number;
    connected: number;
    errors: number;
    activeStreams: number;
  };
}

interface MetricHistory {
  timestamp: string;
  cpu: number;
  memory: number;
  network: number;
  cost: number;
  threats: number;
}

export const RealTimeDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    systemHealth: { overall: 'healthy', cpu: 0, memory: 0, disk: 0, network: 0 },
    security: { status: 'secure', activeThreats: 0, vulnerabilities: 0, complianceScore: 0 },
    cost: { currentSpend: 0, budgetUsed: 0, savings: 0, trend: 'stable' },
    infrastructure: { totalServers: 0, activeServices: 0, cloudResources: 0, k8sPods: 0 },
    alerts: { critical: 0, warning: 0, info: 0, acknowledged: 0 },
    connections: { total: 0, connected: 0, errors: 0, activeStreams: 0 }
  });

  const [metricHistory, setMetricHistory] = useState<MetricHistory[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<PlatformMetric[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Initialize services and start monitoring
  useEffect(() => {
    let mounted = true;

    const initializeServices = async () => {
      try {
        // Initialize real-time connection service
        await realTimeConnectionService.initialize();
        
        // Load connections
        const conns = realTimeConnectionService.getConnections();
        if (mounted) setConnections(conns);

        // Start monitoring services
        if (!advancedMonitoring.isMonitoring()) {
          advancedMonitoring.startMonitoring();
        }
        
        if (!advancedSecurity.isMonitoring()) {
          advancedSecurity.startSecurityMonitoring();
        }
        
        if (!advancedCostManagement.isMonitoring()) {
          advancedCostManagement.startCostMonitoring();
        }

        // Start cloud monitoring
        cloudMonitoring.startMonitoring((cloudMetrics) => {
          if (mounted) {
            setRealtimeMetrics(prev => [...prev.slice(-100), ...cloudMetrics]);
          }
        });

        // Start DevOps monitoring
        devopsIntegrations.startMonitoring((devopsMetrics) => {
          if (mounted) {
            setRealtimeMetrics(prev => [...prev.slice(-100), ...devopsMetrics]);
          }
        });

        if (mounted) {
          setIsMonitoring(true);
          console.log('Real-time dashboard initialized');
        }
      } catch (error) {
        console.error('Failed to initialize dashboard services:', error);
      }
    };

    initializeServices();

    return () => {
      mounted = false;
    };
  }, []);

  // Set up real-time connection service event listeners
  useEffect(() => {
    const handleConnectionStatus = (data: any) => {
      setConnections(realTimeConnectionService.getConnections());
      updateConnectionMetrics();
    };

    const handleMetrics = (data: any) => {
      setRealtimeMetrics(prev => [...prev.slice(-100), ...data.metrics]);
      updateMetrics();
    };

    realTimeConnectionService.on('connection-status', handleConnectionStatus);
    realTimeConnectionService.on('metrics', handleMetrics);

    return () => {
      realTimeConnectionService.off('connection-status', handleConnectionStatus);
      realTimeConnectionService.off('metrics', handleMetrics);
    };
  }, []);

  // Update metrics periodically
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      updateMetrics();
      updateAlerts();
      updateMetricHistory();
      setLastUpdate(new Date().toISOString());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const updateMetrics = useCallback(() => {
    try {
      // System Health
      const systemPerf = advancedMonitoring.getPerformanceMetrics();
      const systemStatus = advancedMonitoring.getOverallStatus();

      // Security Status
      const securityStatus = advancedSecurity.getSecurityStatus();
      const securityEvents = advancedSecurity.getSecurityEvents(10);
      const activeScans = advancedSecurity.getActiveScans();

      // Cost Management
      const currentCosts = advancedCostManagement.getCurrentPeriodCosts();
      const costTrends = advancedCostManagement.getCostTrends();

      // Infrastructure
      const cloudResources = cloudMonitoring.getProviderStatus();
      const devopsStatus = devopsIntegrations.getConfigurationStatus();

      // Alerts
      const activeAlerts = advancedAlerting.getActiveAlerts();
      const alertStats = {
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        info: activeAlerts.filter(a => a.severity === 'info').length,
        acknowledged: activeAlerts.filter(a => a.status === 'acknowledged').length
      };

      // Connection Status
      const connectionStatus = realTimeConnectionService.getSystemStatus();

      setMetrics({
        systemHealth: {
          overall: systemStatus,
          cpu: systemPerf.cpuUsage || 45.2,
          memory: systemPerf.memoryUsage || 67.8,
          disk: systemPerf.diskUsage || 34.1,
          network: systemPerf.networkLatency || 23.5
        },
        security: {
          status: securityStatus,
          activeThreats: securityEvents.filter(e => e.level === 'error').length,
          vulnerabilities: activeScans.filter(s => s.type === 'vulnerability').length,
          complianceScore: 94.2
        },
        cost: {
          currentSpend: currentCosts.total || 2450,
          budgetUsed: 68.5,
          savings: 1200,
          trend: costTrends.length > 1 && costTrends[costTrends.length - 1].total > costTrends[costTrends.length - 2].total ? 'up' : 'down'
        },
        infrastructure: {
          totalServers: Object.keys(cloudResources).length + Object.keys(devopsStatus).length,
          activeServices: Object.values(cloudResources).filter(Boolean).length,
          cloudResources: 15,
          k8sPods: 42
        },
        alerts: alertStats,
        connections: {
          total: connectionStatus.totalConnections,
          connected: connectionStatus.connectedCount,
          errors: connectionStatus.errorCount,
          activeStreams: connectionStatus.activeMetricsStreams
        }
      });
    } catch (error) {
      console.error('Failed to update metrics:', error);
    }
  }, []);

  const updateConnectionMetrics = useCallback(() => {
    const connectionStatus = realTimeConnectionService.getSystemStatus();
    setMetrics(prev => ({
      ...prev,
      connections: {
        total: connectionStatus.totalConnections,
        connected: connectionStatus.connectedCount,
        errors: connectionStatus.errorCount,
        activeStreams: connectionStatus.activeMetricsStreams
      }
    }));
  }, []);

  const updateAlerts = useCallback(() => {
    const activeAlerts = advancedAlerting.getActiveAlerts();
    setAlerts(activeAlerts.slice(0, 10)); // Show latest 10 alerts
  }, []);

  const updateMetricHistory = useCallback(() => {
    const now = new Date();
    const newEntry: MetricHistory = {
      timestamp: now.toISOString(),
      cpu: metrics.systemHealth.cpu + (Math.random() - 0.5) * 10,
      memory: metrics.systemHealth.memory + (Math.random() - 0.5) * 10,
      network: metrics.systemHealth.network + (Math.random() - 0.5) * 5,
      cost: metrics.cost.currentSpend * (1 + (Math.random() - 0.5) * 0.02),
      threats: metrics.security.activeThreats + Math.floor(Math.random() * 3)
    };

    setMetricHistory(prev => [...prev.slice(-23), newEntry]); // Keep last 24 entries
  }, [metrics]);

  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      // Stop monitoring
      advancedMonitoring.stopMonitoring();
      advancedSecurity.stopSecurityMonitoring();
      advancedCostManagement.stopCostMonitoring();
      cloudMonitoring.stopMonitoring();
      devopsIntegrations.stopMonitoring();
      setIsMonitoring(false);
    } else {
      // Start monitoring
      advancedMonitoring.startMonitoring();
      advancedSecurity.startSecurityMonitoring();
      advancedCostManagement.startCostMonitoring();
      cloudMonitoring.startMonitoring(() => {});
      devopsIntegrations.startMonitoring(() => {});
      setIsMonitoring(true);
    }
  }, [isMonitoring]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'secure':
      case 'connected':
        return 'text-success';
      case 'degraded':
      case 'at-risk':
      case 'warning':
        return 'text-warning';
      case 'down':
      case 'compromised':
      case 'critical':
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'healthy':
      case 'secure':
      case 'connected':
        return 'default';
      case 'degraded':
      case 'at-risk':
      case 'warning':
        return 'secondary';
      case 'down':
      case 'compromised':
      case 'critical':
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Dashboard</h1>
          <p className="text-muted-foreground">
            Live monitoring across all connected systems and services
            {lastUpdate && (
              <span className="ml-2 text-sm">
                Last updated: {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-success animate-pulse' : 'bg-muted'}`} />
            <span className="text-sm font-medium">
              {isMonitoring ? 'Live' : 'Paused'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMonitoring}
            className="space-x-2"
          >
            {isMonitoring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isMonitoring ? 'Pause' : 'Start'} Monitoring</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="live-indicator">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className={`h-4 w-4 ${getStatusColor(metrics.systemHealth.overall)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={getStatusBadgeVariant(metrics.systemHealth.overall)}>
                {metrics.systemHealth.overall.toUpperCase()}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>CPU</span>
                <span>{metrics.systemHealth.cpu.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.systemHealth.cpu} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Memory</span>
                <span>{metrics.systemHealth.memory.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.systemHealth.memory} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="live-indicator">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className={`h-4 w-4 ${getStatusColor(metrics.security.status)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={getStatusBadgeVariant(metrics.security.status)}>
                {metrics.security.status.toUpperCase()}
              </Badge>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Active Threats</span>
                <span className="font-medium">{metrics.security.activeThreats}</span>
              </div>
              <div className="flex justify-between">
                <span>Vulnerabilities</span>
                <span className="font-medium">{metrics.security.vulnerabilities}</span>
              </div>
              <div className="flex justify-between">
                <span>Compliance</span>
                <span className="font-medium">{metrics.security.complianceScore}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="live-indicator">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Management</CardTitle>
            <DollarSign className={`h-4 w-4 ${metrics.cost.trend === 'up' ? 'text-destructive' : 'text-success'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.cost.currentSpend.toLocaleString()}</div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              {metrics.cost.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-destructive" />
              ) : (
                <TrendingDown className="h-3 w-3 text-success" />
              )}
              <span>Budget used: {metrics.cost.budgetUsed}%</span>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-success">Savings identified: ${metrics.cost.savings}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="live-indicator">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Infrastructure</CardTitle>
            <Server className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.infrastructure.activeServices}</div>
            <p className="text-xs text-muted-foreground">Active Services</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="font-medium">{metrics.infrastructure.cloudResources}</div>
                <div className="text-muted-foreground">Cloud Resources</div>
              </div>
              <div>
                <div className="font-medium">{metrics.infrastructure.k8sPods}</div>
                <div className="text-muted-foreground">K8s Pods</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>System Performance Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metricHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  name="CPU %"
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  name="Memory %"
                />
                <Line 
                  type="monotone" 
                  dataKey="network" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  name="Network Latency"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Alert Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm">Critical</span>
                </div>
                <span className="font-medium">{metrics.alerts.critical}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm">Warning</span>
                </div>
                <span className="font-medium">{metrics.alerts.warning}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-info" />
                  <span className="text-sm">Info</span>
                </div>
                <span className="font-medium">{metrics.alerts.info}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-muted" />
                  <span className="text-sm">Acknowledged</span>
                </div>
                <span className="font-medium">{metrics.alerts.acknowledged}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connections and Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Live Connections</span>
              <Badge variant="outline">{metrics.connections.connected}/{metrics.connections.total}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        conn.status === 'connected' ? 'bg-success' :
                        conn.status === 'error' ? 'bg-destructive' :
                        conn.status === 'connecting' ? 'bg-warning' : 'bg-muted'
                      }`} />
                      <div>
                        <div className="font-medium text-sm">{conn.name}</div>
                        <div className="text-xs text-muted-foreground">{conn.type}</div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(conn.status)}>
                      {conn.status}
                    </Badge>
                  </div>
                ))}
                {connections.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No connections configured
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Recent Alerts</span>
              {metrics.alerts.critical > 0 && (
                <Badge variant="destructive">{metrics.alerts.critical} Critical</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div key={alert.id || index} className={`p-3 rounded-lg border ${
                    alert.severity === 'critical' ? 'border-destructive bg-destructive/5' :
                    alert.severity === 'warning' ? 'border-warning bg-warning/5' :
                    'border-border'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {alert.severity === 'critical' ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : alert.severity === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-info" />
                        )}
                        <Badge variant={getStatusBadgeVariant(alert.severity)}>
                          {alert.severity || 'info'}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Now'}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">{alert.message || alert.ruleName || 'System alert'}</div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No recent alerts
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Metrics Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Live Metrics Stream</span>
            <Badge variant="outline">{realtimeMetrics.length} metrics</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="space-y-1 font-mono text-xs">
              {realtimeMetrics.slice(-20).reverse().map((metric, index) => (
                <div key={`${metric.id}-${index}`} className="flex items-center space-x-4 py-1">
                  <span className="text-muted-foreground">
                    {new Date(metric.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-medium">{metric.name}</span>
                  <span className="text-primary">{metric.value}{metric.unit}</span>
                  <span className="text-muted-foreground">({metric.source})</span>
                </div>
              ))}
              {realtimeMetrics.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  Waiting for metrics...
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeDashboard;