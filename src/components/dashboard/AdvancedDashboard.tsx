import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, Shield, DollarSign, Server, Database, Network, 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle,
  Play, Pause, RefreshCw, Settings, BarChart3, PieChart
} from 'lucide-react';
import { advancedMonitoring } from '@/services/advancedMonitoring';
import { advancedSecurity } from '@/services/advancedSecurity';
import { advancedCostManagement } from '@/services/advancedCostManagement';
import { advancedDatabase } from '@/services/advancedDatabase';
import { cloudMonitoring } from '@/services/cloudMonitoring';
import { devopsIntegrations } from '@/services/devopsIntegrations';
import { apiFetch } from '@/lib/apiClient';

interface DashboardMetrics {
  monitoring: {
    overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    activeTargets: number;
    healthyTargets: number;
    unhealthyTargets: number;
    responseTime: number;
    availability: number;
  };
  security: {
    status: 'secure' | 'at-risk' | 'compromised';
    activeScans: number;
    recentEvents: number;
    criticalAlerts: number;
    complianceScore: number;
  };
  cost: {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
    budgetUtilization: number;
    potentialSavings: number;
    topExpenses: Array<{ service: string; cost: number; percentage: number }>;
  };
  infrastructure: {
    totalResources: number;
    cloudProviders: Array<{ name: string; status: string; resources: number }>;
    databases: Array<{ name: string; status: string; type: string }>;
    devopsTools: Array<{ name: string; status: string; type: string }>;
  };
}

export const AdvancedDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    monitoring: {
      overallStatus: 'healthy',
      activeTargets: 0,
      healthyTargets: 0,
      unhealthyTargets: 0,
      responseTime: 0,
      availability: 100
    },
    security: {
      status: 'secure',
      activeScans: 0,
      recentEvents: 0,
      criticalAlerts: 0,
      complianceScore: 100
    },
    cost: {
      currentPeriod: 0,
      previousPeriod: 0,
      change: 0,
      budgetUtilization: 0,
      potentialSavings: 0,
      topExpenses: []
    },
    infrastructure: {
      totalResources: 0,
      cloudProviders: [],
      databases: [],
      devopsTools: []
    }
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isSecurityMonitoring, setIsSecurityMonitoring] = useState(false);
  const [isCostMonitoring, setIsCostMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Initialize services and start monitoring
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setLoading(true);

        // Start monitoring services
        advancedMonitoring.startMonitoring();
        advancedSecurity.startSecurityMonitoring();
        advancedCostManagement.startCostMonitoring();

        setIsMonitoring(true);
        setIsSecurityMonitoring(true);
        setIsCostMonitoring(true);

        // Set up event listeners
        setupEventListeners();

        // Initial data collection
        await collectMetrics();

        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setLoading(false);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      advancedMonitoring.stopMonitoring();
      advancedSecurity.stopSecurityMonitoring();
      advancedCostManagement.stopCostMonitoring();
    };
  }, []);

  const setupEventListeners = () => {
    // Monitoring events
    advancedMonitoring.onTargetUpdate('system-cpu', () => updateMetrics());
    advancedMonitoring.onTargetUpdate('system-memory', () => updateMetrics());
    advancedMonitoring.onTargetUpdate('system-disk', () => updateMetrics());
    advancedMonitoring.onTargetUpdate('system-network', () => updateMetrics());

    // Security events
    advancedSecurity.onSecurityEvent('security-event', () => updateMetrics());

    // Cost events
    advancedCostManagement.onCostEvent('budget-alert', () => updateMetrics());
  };

  const collectMetrics = async () => {
    try {
      // Collect monitoring metrics
      const monitoringStatus = advancedMonitoring.getOverallStatus();
      const performanceMetrics = advancedMonitoring.getPerformanceMetrics();
      const targets = advancedMonitoring.getAllTargets();
      const healthyTargets = targets.filter(t => t.lastStatus === 'healthy').length;
      const unhealthyTargets = targets.filter(t => t.lastStatus === 'unhealthy').length;

      // Collect security metrics
      const securityStatus = advancedSecurity.getSecurityStatus();
      const activeScans = advancedSecurity.getActiveScans();
      const securityEvents = advancedSecurity.getSecurityEvents(100);
      const criticalEvents = securityEvents.filter(e => e.level === 'fatal' || e.level === 'error');

      // Collect cost metrics
      const currentCosts = advancedCostManagement.getCurrentPeriodCosts();
      const costTrends = advancedCostManagement.getCostTrends();
      const optimizations = advancedCostManagement.getOptimizations();
      const budgetUtilization = advancedCostManagement.getBudgetUtilization('default-monthly');

      // Collect infrastructure metrics
      const dbStatus = await advancedDatabase.getConnectionStatus();
      await cloudMonitoring.refreshStatus();
      const cloudStatus = cloudMonitoring.getProviderStatus();
      const devopsStatus = devopsIntegrations.getIntegrationStatus();

      let resourceCounts: Record<string, number> = {};
      try {
        const latest = await apiFetch<{ metrics: Array<{ name: string; value: number; source: string }> }>('/metrics/latest');
        for (const metric of latest.metrics || []) {
          const isInventory = metric.name.includes('count') || metric.name.includes('instance') || metric.name.includes('vm') || metric.name.includes('ec2') || metric.name.includes('container');
          if (!isInventory) continue;
          resourceCounts[metric.source] = (resourceCounts[metric.source] || 0) + Number(metric.value || 0);
        }
      } catch {
        resourceCounts = {};
      }

      setMetrics({
        monitoring: {
          overallStatus: monitoringStatus,
          activeTargets: targets.length,
          healthyTargets,
          unhealthyTargets,
          responseTime: performanceMetrics.responseTime,
          availability: performanceMetrics.availability
        },
        security: {
          status: securityStatus,
          activeScans: activeScans.length,
          recentEvents: securityEvents.length,
          criticalAlerts: criticalEvents.length,
          complianceScore: 100 - (criticalEvents.length * 10) // Simple scoring
        },
        cost: {
          currentPeriod: currentCosts.total,
          previousPeriod: costTrends.length > 0 ? costTrends[0].totalCost : 0,
          change: costTrends.length > 0 ? costTrends[0].change : 0,
          budgetUtilization: budgetUtilization.percentage,
          potentialSavings: optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0),
          topExpenses: costTrends.length > 0 ? costTrends[0].topServices : []
        },
        infrastructure: {
          totalResources: Object.values(cloudStatus).filter(Boolean).length,
          cloudProviders: Object.entries(cloudStatus).map(([name, status]) => ({
            name: name.toUpperCase(),
            status: status ? 'connected' : 'disconnected',
            resources: status ? (resourceCounts[name] || 0) : 0
          })),
          databases: [{
            name: 'Primary Database',
            status: dbStatus.isConnected ? 'connected' : 'disconnected',
            type: dbStatus.type
          }],
          devopsTools: Object.entries(devopsStatus).map(([name, status]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            status: status ? 'connected' : 'disconnected',
            type: name
          }))
        }
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  };

  const updateMetrics = useCallback(() => {
    collectMetrics();
  }, []);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    const interval = setInterval(updateMetrics, 30000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'secure':
        return 'bg-green-500';
      case 'degraded':
      case 'at-risk':
        return 'bg-yellow-500';
      case 'unhealthy':
      case 'disconnected':
      case 'compromised':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'secure':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
      case 'at-risk':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy':
      case 'disconnected':
      case 'compromised':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring, security, and cost management overview
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={updateMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitoring Status</CardTitle>
            {getStatusIcon(metrics.monitoring.overallStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{metrics.monitoring.overallStatus}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.monitoring.healthyTargets} healthy / {metrics.monitoring.activeTargets} total targets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            {getStatusIcon(metrics.security.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{metrics.security.status}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.security.activeScans} active scans, {metrics.security.criticalAlerts} critical alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.cost.currentPeriod)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.cost.change > 0 ? '+' : ''}{formatPercentage(metrics.cost.change)} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Infrastructure</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.infrastructure.totalResources}</div>
            <p className="text-xs text-muted-foreground">
              Active cloud resources and services
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="cost">Cost Management</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monitoring Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  System Monitoring
                </CardTitle>
                <CardDescription>Real-time system health and performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Availability</span>
                    <span>{formatPercentage(metrics.monitoring.availability)}</span>
                  </div>
                  <Progress value={metrics.monitoring.availability} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Response Time</span>
                    <span>{metrics.monitoring.responseTime.toFixed(0)}ms</span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.monitoring.responseTime / 1000) * 100, 100)} 
                    className="h-2" 
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-green-600">{metrics.monitoring.healthyTargets}</div>
                    <div className="text-muted-foreground">Healthy Targets</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{metrics.monitoring.unhealthyTargets}</div>
                    <div className="text-muted-foreground">Unhealthy Targets</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security Status
                </CardTitle>
                <CardDescription>Security monitoring and compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Compliance Score</span>
                    <span>{formatPercentage(metrics.security.complianceScore)}</span>
                  </div>
                  <Progress value={metrics.security.complianceScore} className="h-2" />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">{metrics.security.activeScans}</div>
                    <div className="text-muted-foreground">Active Scans</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{metrics.security.criticalAlerts}</div>
                    <div className="text-muted-foreground">Critical Alerts</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">{metrics.security.recentEvents}</div>
                    <div className="text-muted-foreground">Recent Events</div>
                  </div>
                  <div>
                    <div className="font-medium capitalize">{metrics.security.status}</div>
                    <div className="text-muted-foreground">Overall Status</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Cost Management
              </CardTitle>
              <CardDescription>Budget tracking and optimization opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Budget Utilization</div>
                  <div className="text-2xl font-bold">{formatPercentage(metrics.cost.budgetUtilization)}</div>
                  <Progress value={metrics.cost.budgetUtilization} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Potential Savings</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(metrics.cost.potentialSavings)}
                  </div>
                  <div className="text-xs text-muted-foreground">From optimization recommendations</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Cost Change</div>
                  <div className={`text-2xl font-bold ${metrics.cost.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {metrics.cost.change > 0 ? '+' : ''}{formatPercentage(metrics.cost.change)}
                  </div>
                  <div className="text-xs text-muted-foreground">vs. previous period</div>
                </div>
              </div>

              {metrics.cost.topExpenses.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-medium mb-2">Top Expenses</div>
                    <div className="space-y-2">
                      {metrics.cost.topExpenses.slice(0, 3).map((expense, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{expense.service}</span>
                          <span>{formatCurrency(expense.cost)} ({formatPercentage(expense.percentage)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring Targets</CardTitle>
              <CardDescription>Real-time monitoring of system resources and services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {advancedMonitoring.getAllTargets().map((target) => (
                  <div key={target.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(target.lastStatus || 'unknown')}
                      <div>
                        <div className="font-medium">{target.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {target.type} • {target.target}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {target.lastStatus || 'unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {target.lastCheck ? new Date(target.lastCheck).toLocaleTimeString() : 'Never'}
                        </div>
                      </div>
                      <Badge variant={target.isEnabled ? 'default' : 'secondary'}>
                        {target.isEnabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Security Scans</CardTitle>
                <CardDescription>Current vulnerability and compliance scans</CardDescription>
              </CardHeader>
              <CardContent>
                {advancedSecurity.getActiveScans().length > 0 ? (
                  <div className="space-y-3">
                    {advancedSecurity.getActiveScans().map((scan) => (
                      <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{scan.type} Scan</div>
                          <div className="text-sm text-muted-foreground">
                            Target: {scan.target} • {scan.findings.length} findings
                          </div>
                        </div>
                        <Badge variant={scan.status === 'completed' ? 'default' : 'secondary'}>
                          {scan.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No active security scans
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
                <CardDescription>Latest security alerts and incidents</CardDescription>
              </CardHeader>
              <CardContent>
                {advancedSecurity.getSecurityEvents(5).length > 0 ? (
                  <div className="space-y-3">
                    {advancedSecurity.getSecurityEvents(5).map((event) => (
                      <div key={event.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Badge variant={event.level === 'error' || event.level === 'fatal' ? 'destructive' : 'secondary'}>
                          {event.level}
                        </Badge>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{event.message}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent security events
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cost Management Tab */}
        <TabsContent value="cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Optimization Recommendations</CardTitle>
              <CardDescription>Actionable recommendations to reduce costs</CardDescription>
            </CardHeader>
            <CardContent>
              {advancedCostManagement.getOptimizations().length > 0 ? (
                <div className="space-y-4">
                  {advancedCostManagement.getOptimizations().slice(0, 5).map((opt) => (
                    <div key={opt.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{opt.resourceName}</div>
                        <Badge variant={opt.priority === 'critical' ? 'destructive' : 'secondary'}>
                          {opt.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {opt.type} • {opt.implementation}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Potential Savings: <span className="font-medium text-green-600">{formatCurrency(opt.potentialSavings)}</span></span>
                        <span>Effort: {opt.effort} • Risk: {opt.risk}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No optimization recommendations available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cloud Providers</CardTitle>
                <CardDescription>Status and resource counts by provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.infrastructure.cloudProviders.map((provider, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(provider.status)}
                        <div>
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-sm text-muted-foreground">{provider.resources} resources</div>
                        </div>
                      </div>
                      <Badge variant={provider.status === 'connected' ? 'default' : 'secondary'}>
                        {provider.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>DevOps Tools</CardTitle>
                <CardDescription>Integration status for development tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.infrastructure.devopsTools.map((tool, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(tool.status)}
                        <div>
                          <div className="font-medium">{tool.name}</div>
                          <div className="text-sm text-muted-foreground">{tool.type}</div>
                        </div>
                      </div>
                      <Badge variant={tool.status === 'connected' ? 'default' : 'secondary'}>
                        {tool.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdate.toLocaleString()} • 
        Monitoring: {isMonitoring ? 'Active' : 'Inactive'} • 
        Security: {isSecurityMonitoring ? 'Active' : 'Inactive'} • 
        Cost: {isCostMonitoring ? 'Active' : 'Inactive'}
      </div>
    </div>
  );
}; 