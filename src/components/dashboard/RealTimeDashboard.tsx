import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, Server, Cpu, HardDrive, Network, 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock,
  RefreshCw, Play, Pause, Settings, Maximize2, Download
} from 'lucide-react';
import { realTimeDataService, SystemPerformance, ApplicationMetrics, BusinessMetrics } from '@/services/realTimeDataService';

interface RealTimeDashboardProps {
  refreshInterval?: number;
  showSystemMetrics?: boolean;
  showApplicationMetrics?: boolean;
  showBusinessMetrics?: boolean;
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  refreshInterval = 5000,
  showSystemMetrics = true,
  showApplicationMetrics = true,
  showBusinessMetrics = true
}) => {
  const [isRunning, setIsRunning] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<SystemPerformance | null>(null);
  const [applicationMetrics, setApplicationMetrics] = useState<ApplicationMetrics | null>(null);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState('5m');

  useEffect(() => {
    if (isRunning) {
      // Initial load
      updateMetrics();
      
      // Set up real-time updates
      const interval = setInterval(updateMetrics, refreshInterval);
      
      // Subscribe to real-time updates
      const unsubscribeSystem = realTimeDataService.subscribe('system_performance', setSystemMetrics);
      const unsubscribeApplication = realTimeDataService.subscribe('application_metrics', setApplicationMetrics);
      const unsubscribeBusiness = realTimeDataService.subscribe('business_metrics', setBusinessMetrics);
      
      return () => {
        clearInterval(interval);
        unsubscribeSystem();
        unsubscribeApplication();
        unsubscribeBusiness();
      };
    }
  }, [isRunning, refreshInterval]);

  const updateMetrics = () => {
    if (showSystemMetrics) {
      setSystemMetrics(realTimeDataService.getSystemPerformance());
    }
    if (showApplicationMetrics) {
      setApplicationMetrics(realTimeDataService.getApplicationMetrics());
    }
    if (showBusinessMetrics) {
      setBusinessMetrics(realTimeDataService.getBusinessMetrics());
    }
    setLastUpdate(new Date());
  };

  const toggleUpdates = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      realTimeDataService.startRealTimeUpdates(refreshInterval);
    } else {
      realTimeDataService.stopRealTimeUpdates();
    }
  };

  const getStatusColor = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'text-red-600';
    if (value >= warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBadge = (value: number, warning: number, critical: number) => {
    if (value >= critical) return <Badge variant="destructive">Critical</Badge>;
    if (value >= warning) return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="default">Healthy</Badge>;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Real-Time Monitoring</h2>
          <Badge variant="outline" className="flex items-center gap-2">
            <Activity className="h-3 w-3" />
            Live Data
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 minute</SelectItem>
              <SelectItem value="5m">5 minutes</SelectItem>
              <SelectItem value="15m">15 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={isRunning ? "outline" : "default"}
            size="sm"
            onClick={toggleUpdates}
          >
            {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isRunning ? 'Pause' : 'Resume'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={updateMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm">
            <Maximize2 className="h-4 w-4 mr-2" />
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>

      {/* Last Update Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        <span>•</span>
        <span>Auto-refresh: {isRunning ? `${refreshInterval / 1000}s` : 'Paused'}</span>
      </div>

      {/* System Metrics */}
      {showSystemMetrics && systemMetrics && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Performance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getStatusColor(systemMetrics.cpu.usage, 80, 95)}`}>
                    {systemMetrics.cpu.usage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {systemMetrics.cpu.cores} cores
                  </div>
                  <div className="mt-2">
                    {getStatusBadge(systemMetrics.cpu.usage, 80, 95)}
                  </div>
                </div>
              </CardContent>
            </Card>

                    {/* Memory Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getStatusColor(systemMetrics.memory.used / systemMetrics.memory.total * 100, 85, 95)}`}>
                    {((systemMetrics.memory.used / systemMetrics.memory.total) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {realTimeDataService.formatBytes(systemMetrics.memory.used)} / {realTimeDataService.formatBytes(systemMetrics.memory.total)}
                  </div>
                  <div className="mt-2">
                    {getStatusBadge((systemMetrics.memory.used / systemMetrics.memory.total) * 100, 85, 95)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disk Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Disk Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getStatusColor((systemMetrics.disk.used / systemMetrics.disk.total) * 100, 80, 90)}`}>
                    {((systemMetrics.disk.used / systemMetrics.disk.total) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {realTimeDataService.formatBytes(systemMetrics.disk.used)} / {realTimeDataService.formatBytes(systemMetrics.disk.total)}
                  </div>
                  <div className="mt-2">
                    {getStatusBadge((systemMetrics.disk.used / systemMetrics.disk.total) * 100, 80, 90)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Network I/O
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {realTimeDataService.formatBytes(systemMetrics.network.bytesIn + systemMetrics.network.bytesOut)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    In: {realTimeDataService.formatBytes(systemMetrics.network.bytesIn)}/s
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Out: {realTimeDataService.formatBytes(systemMetrics.network.bytesOut)}/s
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Application Metrics */}
      {showApplicationMetrics && applicationMetrics && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Application Performance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Response Time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Response Time (P95)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getStatusColor(applicationMetrics.responseTime.p95, 200, 500)}`}>
                    {applicationMetrics.responseTime.p95.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    P50: {applicationMetrics.responseTime.p50.toFixed(0)}ms
                  </div>
                  <div className="mt-2">
                    {getStatusBadge(applicationMetrics.responseTime.p95, 200, 500)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Throughput */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Throughput</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {applicationMetrics.throughput.requestsPerSecond.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    req/s
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {applicationMetrics.throughput.transactionsPerSecond.toFixed(1)} txn/s
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getStatusColor(applicationMetrics.throughput.errorsPerSecond, 5, 10)}`}>
                    {applicationMetrics.throughput.errorsPerSecond.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    errors/s
                  </div>
                  <div className="mt-2">
                    {getStatusBadge(applicationMetrics.throughput.errorsPerSecond, 5, 10)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getStatusColor(applicationMetrics.availability.uptime, 99.5, 99.0)}`}>
                    {applicationMetrics.availability.uptime.toFixed(3)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    SLA: {applicationMetrics.availability.sla}%
                  </div>
                  <div className="mt-2">
                    {getStatusBadge(applicationMetrics.availability.uptime, 99.5, 99.0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Business Metrics */}
      {showBusinessMetrics && businessMetrics && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Business Intelligence
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Users */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {businessMetrics.users.active.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Total: {businessMetrics.users.total.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    New: {businessMetrics.users.new}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    ${businessMetrics.revenue.daily.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Monthly: ${businessMetrics.revenue.monthly.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">
                    +{businessMetrics.revenue.growth.toFixed(1)}% growth
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getStatusColor(businessMetrics.performance.conversionRate, 2, 1)}`}>
                    {businessMetrics.performance.conversionRate.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Bounce: {businessMetrics.performance.bounceRate.toFixed(1)}%
                  </div>
                  <div className="mt-2">
                    {getStatusBadge(businessMetrics.performance.conversionRate, 2, 1)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {businessMetrics.engagement.pageViews.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Clicks: {businessMetrics.engagement.clicks.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Shares: {businessMetrics.engagement.shares}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};