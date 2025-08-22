import { Dashboard, DashboardWidget } from './dashboardService';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  isOfficial: boolean;
  widgets: Omit<DashboardWidget, 'id'>[];
  layout: 'grid' | 'flexible' | 'custom';
  refreshInterval: number;
}

export const dashboardTemplates: DashboardTemplate[] = [
  {
    id: 'infrastructure-overview',
    name: 'Infrastructure Overview',
    description: 'Comprehensive system monitoring dashboard with CPU, memory, disk, and network metrics',
    category: 'infrastructure',
    tags: ['system', 'monitoring', 'performance', 'resources'],
    isOfficial: true,
    layout: 'grid',
    refreshInterval: 30,
    widgets: [
      {
        type: 'metric',
        title: 'CPU Usage',
        description: 'Current CPU utilization across all cores',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'system_metrics',
          query: 'SELECT AVG(cpu_usage) FROM system_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR',
          refreshInterval: 30,
          thresholds: { warning: 80, critical: 95 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Memory Usage',
        description: 'Current memory utilization and available RAM',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'system_metrics',
          query: 'SELECT AVG(memory_usage) FROM system_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR',
          refreshInterval: 30,
          thresholds: { warning: 85, critical: 95 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Disk Usage',
        description: 'Storage utilization and I/O performance',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'system_metrics',
          query: 'SELECT AVG(disk_usage) FROM system_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR',
          refreshInterval: 30,
          thresholds: { warning: 80, critical: 90 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Network Traffic',
        description: 'Inbound and outbound network throughput',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'system_metrics',
          query: 'SELECT AVG(network_in + network_out) FROM system_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR',
          refreshInterval: 30,
          thresholds: { warning: 1000, critical: 2000 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'CPU Performance Trend',
        description: '24-hour CPU usage trend with threshold indicators',
        position: { x: 0, y: 2, w: 6, h: 3 },
        config: {
          dataSource: 'system_metrics',
          query: 'SELECT timestamp, cpu_usage FROM system_metrics WHERE timestamp > NOW() - INTERVAL 24 HOUR ORDER BY timestamp',
          refreshInterval: 60,
          thresholds: { warning: 80, critical: 95 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'Memory Performance Trend',
        description: '24-hour memory usage trend with threshold indicators',
        position: { x: 6, y: 2, w: 6, h: 3 },
        config: {
          dataSource: 'system_metrics',
          query: 'SELECT timestamp, memory_usage FROM system_metrics WHERE timestamp > NOW() - INTERVAL 24 HOUR ORDER BY timestamp',
          refreshInterval: 60,
          thresholds: { warning: 85, critical: 95 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'status',
        title: 'Service Health',
        description: 'Real-time status of critical system services',
        position: { x: 0, y: 5, w: 6, h: 2 },
        config: {
          dataSource: 'system_metrics',
          query: 'SELECT service_name, status, response_time FROM services ORDER BY status DESC',
          refreshInterval: 30,
          thresholds: { warning: 100, critical: 500 },
          chartType: 'line',
          columns: ['service', 'status', 'response_time'],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'table',
        title: 'System Alerts',
        description: 'Recent system alerts and notifications',
        position: { x: 6, y: 5, w: 6, h: 2 },
        config: {
          dataSource: 'system_metrics',
          query: 'SELECT timestamp, severity, message FROM alerts WHERE timestamp > NOW() - INTERVAL 1 HOUR ORDER BY timestamp DESC',
          refreshInterval: 60,
          thresholds: {},
          chartType: 'line',
          columns: ['timestamp', 'severity', 'message'],
          filters: {}
        },
        isVisible: true
      }
    ]
  },
  {
    id: 'application-performance',
    name: 'Application Performance',
    description: 'Monitor application response times, throughput, and error rates',
    category: 'application',
    tags: ['performance', 'apm', 'response-time', 'throughput'],
    isOfficial: true,
    layout: 'grid',
    refreshInterval: 15,
    widgets: [
      {
        type: 'metric',
        title: 'Response Time (P95)',
        description: '95th percentile response time',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'application_metrics',
          query: 'SELECT p95 FROM response_time_metrics WHERE timestamp > NOW() - INTERVAL 5 MINUTES',
          refreshInterval: 15,
          thresholds: { warning: 200, critical: 500 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Requests/Second',
        description: 'Current request throughput',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'application_metrics',
          query: 'SELECT requests_per_second FROM throughput_metrics WHERE timestamp > NOW() - INTERVAL 5 MINUTES',
          refreshInterval: 15,
          thresholds: { warning: 1000, critical: 2000 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Error Rate',
        description: 'Percentage of failed requests',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'application_metrics',
          query: 'SELECT (COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*)) as error_rate FROM request_metrics',
          refreshInterval: 15,
          thresholds: { warning: 5, critical: 10 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Availability',
        description: 'Service uptime percentage',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'application_metrics',
          query: 'SELECT uptime FROM availability_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR',
          refreshInterval: 60,
          thresholds: { warning: 99.5, critical: 99.0 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'Response Time Distribution',
        description: 'Response time percentiles over time',
        position: { x: 0, y: 2, w: 8, h: 3 },
        config: {
          dataSource: 'application_metrics',
          query: 'SELECT timestamp, p50, p90, p95, p99 FROM response_time_metrics WHERE timestamp > NOW() - INTERVAL 6 HOUR ORDER BY timestamp',
          refreshInterval: 60,
          thresholds: { warning: 200, critical: 500 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'Throughput Trend',
        description: 'Request throughput over time',
        position: { x: 8, y: 2, w: 4, h: 3 },
        config: {
          dataSource: 'application_metrics',
          query: 'SELECT timestamp, requests_per_second FROM throughput_metrics WHERE timestamp > NOW() - INTERVAL 6 HOUR ORDER BY timestamp',
          refreshInterval: 60,
          thresholds: { warning: 1000, critical: 2000 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'table',
        title: 'Slow Queries',
        description: 'Top slow database queries',
        position: { x: 0, y: 5, w: 6, h: 2 },
        config: {
          dataSource: 'application_metrics',
          query: 'SELECT query, execution_time, timestamp FROM slow_queries WHERE timestamp > NOW() - INTERVAL 1 HOUR ORDER BY execution_time DESC LIMIT 10',
          refreshInterval: 60,
          thresholds: {},
          chartType: 'line',
          columns: ['query', 'execution_time', 'timestamp'],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'status',
        title: 'API Endpoints',
        description: 'Health status of API endpoints',
        position: { x: 6, y: 5, w: 6, h: 2 },
        config: {
          dataSource: 'application_metrics',
          query: 'SELECT endpoint, status, response_time FROM api_health WHERE timestamp > NOW() - INTERVAL 5 MINUTES',
          refreshInterval: 15,
          thresholds: { warning: 100, critical: 500 },
          chartType: 'line',
          columns: ['endpoint', 'status', 'response_time'],
          filters: {}
        },
        isVisible: true
      }
    ]
  },
  {
    id: 'business-intelligence',
    name: 'Business Intelligence',
    description: 'Monitor key business metrics, user engagement, and revenue performance',
    category: 'business',
    tags: ['business', 'kpi', 'revenue', 'users', 'engagement'],
    isOfficial: true,
    layout: 'grid',
    refreshInterval: 300,
    widgets: [
      {
        type: 'metric',
        title: 'Active Users',
        description: 'Currently active users on the platform',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'business_metrics',
          query: 'SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_activity > NOW() - INTERVAL 15 MINUTES',
          refreshInterval: 300,
          thresholds: { warning: 1000, critical: 500 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Daily Revenue',
        description: 'Total revenue generated today',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'business_metrics',
          query: 'SELECT SUM(amount) FROM transactions WHERE DATE(timestamp) = CURDATE()',
          refreshInterval: 300,
          thresholds: { warning: 10000, critical: 5000 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Conversion Rate',
        description: 'Visitor to customer conversion rate',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'business_metrics',
          query: 'SELECT (COUNT(DISTINCT customer_id) * 100.0 / COUNT(DISTINCT visitor_id)) as conversion_rate FROM analytics WHERE timestamp > NOW() - INTERVAL 24 HOUR',
          refreshInterval: 300,
          thresholds: { warning: 2, critical: 1 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Customer Satisfaction',
        description: 'Average customer satisfaction score',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'business_metrics',
          query: 'SELECT AVG(satisfaction_score) FROM customer_feedback WHERE timestamp > NOW() - INTERVAL 7 DAY',
          refreshInterval: 300,
          thresholds: { warning: 7, critical: 6 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'User Growth Trend',
        description: 'Monthly active users growth over time',
        position: { x: 0, y: 2, w: 6, h: 3 },
        config: {
          dataSource: 'business_metrics',
          query: 'SELECT DATE(timestamp) as date, COUNT(DISTINCT user_id) as users FROM user_activity WHERE timestamp > NOW() - INTERVAL 30 DAY GROUP BY DATE(timestamp) ORDER BY date',
          refreshInterval: 3600,
          thresholds: {},
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'Revenue Trend',
        description: 'Daily revenue over the last 30 days',
        position: { x: 6, y: 2, w: 6, h: 3 },
        config: {
          dataSource: 'business_metrics',
          query: 'SELECT DATE(timestamp) as date, SUM(amount) as revenue FROM transactions WHERE timestamp > NOW() - INTERVAL 30 DAY GROUP BY DATE(timestamp) ORDER BY date',
          refreshInterval: 3600,
          thresholds: {},
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'table',
        title: 'Top Products',
        description: 'Best performing products by revenue',
        position: { x: 0, y: 5, w: 6, h: 2 },
        config: {
          dataSource: 'business_metrics',
          query: 'SELECT product_name, revenue, units_sold FROM product_performance WHERE timestamp > NOW() - INTERVAL 30 DAY ORDER BY revenue DESC LIMIT 10',
          refreshInterval: 3600,
          thresholds: {},
          chartType: 'line',
          columns: ['product', 'revenue', 'units_sold'],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'Engagement Metrics',
        description: 'Page views, clicks, and shares over time',
        position: { x: 6, y: 5, w: 6, h: 2 },
        config: {
          dataSource: 'business_metrics',
          query: 'SELECT DATE(timestamp) as date, page_views, clicks, shares FROM engagement_metrics WHERE timestamp > NOW() - INTERVAL 7 DAY GROUP BY DATE(timestamp) ORDER BY date',
          refreshInterval: 3600,
          thresholds: {},
          chartType: 'bar',
          columns: [],
          filters: {}
        },
        isVisible: true
      }
    ]
  },
  {
    id: 'security-monitoring',
    name: 'Security Monitoring',
    description: 'Monitor security events, authentication, and threat detection',
    category: 'security',
    tags: ['security', 'authentication', 'threats', 'compliance'],
    isOfficial: true,
    layout: 'grid',
    refreshInterval: 60,
    widgets: [
      {
        type: 'metric',
        title: 'Failed Logins',
        description: 'Number of failed authentication attempts',
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'security_metrics',
          query: 'SELECT COUNT(*) FROM auth_events WHERE event_type = "failed_login" AND timestamp > NOW() - INTERVAL 1 HOUR',
          refreshInterval: 60,
          thresholds: { warning: 10, critical: 50 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Active Threats',
        description: 'Currently detected security threats',
        position: { x: 3, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'security_metrics',
          query: 'SELECT COUNT(*) FROM security_threats WHERE status = "active"',
          refreshInterval: 60,
          thresholds: { warning: 5, critical: 20 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Vulnerability Score',
        description: 'Current security vulnerability score',
        position: { x: 6, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'security_metrics',
          query: 'SELECT AVG(cvss_score) FROM vulnerabilities WHERE status = "open"',
          refreshInterval: 60,
          thresholds: { warning: 7, critical: 9 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'metric',
        title: 'Compliance Score',
        description: 'Security compliance percentage',
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: {
          dataSource: 'security_metrics',
          query: 'SELECT (compliant_controls * 100.0 / total_controls) as compliance_score FROM compliance_metrics',
          refreshInterval: 60,
          thresholds: { warning: 90, critical: 80 },
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'Security Events Timeline',
        description: 'Security events over the last 24 hours',
        position: { x: 0, y: 2, w: 8, h: 3 },
        config: {
          dataSource: 'security_metrics',
          query: 'SELECT timestamp, event_type, severity FROM security_events WHERE timestamp > NOW() - INTERVAL 24 HOUR ORDER BY timestamp',
          refreshInterval: 300,
          thresholds: {},
          chartType: 'line',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'chart',
        title: 'Threat Distribution',
        description: 'Types of security threats detected',
        position: { x: 8, y: 2, w: 4, h: 3 },
        config: {
          dataSource: 'security_metrics',
          query: 'SELECT threat_type, COUNT(*) as count FROM security_threats WHERE timestamp > NOW() - INTERVAL 24 HOUR GROUP BY threat_type',
          refreshInterval: 300,
          thresholds: {},
          chartType: 'pie',
          columns: [],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'table',
        title: 'Recent Security Alerts',
        description: 'Latest security alerts and notifications',
        position: { x: 0, y: 5, w: 6, h: 2 },
        config: {
          dataSource: 'security_metrics',
          query: 'SELECT timestamp, severity, description FROM security_alerts WHERE timestamp > NOW() - INTERVAL 1 HOUR ORDER BY timestamp DESC LIMIT 10',
          refreshInterval: 60,
          thresholds: {},
          chartType: 'line',
          columns: ['timestamp', 'severity', 'description'],
          filters: {}
        },
        isVisible: true
      },
      {
        type: 'status',
        title: 'Security Services',
        description: 'Status of security monitoring services',
        position: { x: 6, y: 5, w: 6, h: 2 },
        config: {
          dataSource: 'security_metrics',
          query: 'SELECT service_name, status, last_check FROM security_services ORDER BY status DESC',
          refreshInterval: 60,
          thresholds: {},
          chartType: 'line',
          columns: ['service', 'status', 'last_check'],
          filters: {}
        },
        isVisible: true
      }
    ]
  }
];

export const getDashboardTemplate = (id: string): DashboardTemplate | undefined => {
  return dashboardTemplates.find(template => template.id === id);
};

export const getDashboardTemplatesByCategory = (category: string): DashboardTemplate[] => {
  return dashboardTemplates.filter(template => template.category === category);
};

export const searchDashboardTemplates = (query: string): DashboardTemplate[] => {
  const searchTerm = query.toLowerCase();
  return dashboardTemplates.filter(template => 
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};
