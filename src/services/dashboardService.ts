import { apiFetch } from '@/lib/apiClient';
import { metricsService } from './metricsService';

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'status' | 'alert' | 'log' | 'custom';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: {
    dataSource?: string;
    query?: string;
    refreshInterval?: number;
    thresholds?: {
      warning?: number;
      critical?: number;
    };
    chartType?: 'line' | 'bar' | 'area' | 'pie' | 'gauge';
    columns?: string[];
    filters?: Record<string, string | number | boolean>;
  };
  data?: unknown;
  lastUpdated?: string;
  isVisible: boolean;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category: 'infrastructure' | 'application' | 'business' | 'security' | 'custom';
  tags: string[];
  widgets: DashboardWidget[];
  layout: 'grid' | 'flexible' | 'custom';
  refreshInterval: number; // in seconds
  isPublic: boolean;
  isTemplate: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  lastViewed?: string;
  viewCount: number;
  favoriteCount: number;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  widgets: Omit<DashboardWidget, 'id'>[];
  layout: string;
  thumbnail?: string;
  isOfficial: boolean;
  createdAt: string;
}

export interface DashboardData {
  timestamp: string;
  value: number;
  metric: string;
  tags: Record<string, string>;
  source: string;
}

export class DashboardService {
  private dashboards: Map<string, Dashboard> = new Map();
  private templates: Map<string, DashboardTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.loadDashboards();
  }

  private async initializeDefaultTemplates() {
    const defaultTemplates: DashboardTemplate[] = [
      {
        id: 'infrastructure-overview',
        name: 'Infrastructure Overview',
        description: 'Complete infrastructure monitoring dashboard with system health, resource usage, and service status',
        category: 'infrastructure',
        tags: ['monitoring', 'infrastructure', 'system-health'],
        layout: 'grid',
        isOfficial: true,
        createdAt: new Date().toISOString(),
        widgets: [
          {
            type: 'metric',
            title: 'System Health',
            description: 'Overall system health score',
            position: { x: 0, y: 0, w: 3, h: 2 },
            config: {
              dataSource: 'system_metrics',
              query: 'SELECT AVG(health_score) FROM system_health WHERE timestamp > NOW() - INTERVAL 1 HOUR',
              thresholds: { warning: 80, critical: 60 }
            },
            isVisible: true
          },
          {
            type: 'chart',
            title: 'CPU Usage',
            description: 'CPU utilization over time',
            position: { x: 3, y: 0, w: 6, h: 3 },
            config: {
              dataSource: 'system_metrics',
              query: 'SELECT timestamp, cpu_usage FROM cpu_metrics WHERE timestamp > NOW() - INTERVAL 24 HOUR ORDER BY timestamp',
              chartType: 'line',
              refreshInterval: 30
            },
            isVisible: true
          },
          {
            type: 'chart',
            title: 'Memory Usage',
            description: 'Memory utilization over time',
            position: { x: 9, y: 0, w: 6, h: 3 },
            config: {
              dataSource: 'system_metrics',
              query: 'SELECT timestamp, memory_usage FROM memory_metrics WHERE timestamp > NOW() - INTERVAL 24 HOUR ORDER BY timestamp',
              chartType: 'line',
              refreshInterval: 30
            },
            isVisible: true
          },
          {
            type: 'status',
            title: 'Service Status',
            description: 'Current status of all services',
            position: { x: 0, y: 2, w: 6, h: 4 },
            config: {
              dataSource: 'service_status',
              query: 'SELECT service_name, status, response_time, last_check FROM services ORDER BY status DESC'
            },
            isVisible: true
          },
          {
            type: 'table',
            title: 'Recent Alerts',
            description: 'Latest system alerts and notifications',
            position: { x: 6, y: 3, w: 9, h: 3 },
            config: {
              dataSource: 'alerts',
              query: 'SELECT timestamp, severity, message, source FROM alerts WHERE timestamp > NOW() - INTERVAL 1 HOUR ORDER BY timestamp DESC LIMIT 20',
              columns: ['timestamp', 'severity', 'message', 'source']
            },
            isVisible: true
          }
        ]
      },
      {
        id: 'application-performance',
        name: 'Application Performance',
        description: 'Monitor application performance, response times, and user experience metrics',
        category: 'application',
        tags: ['performance', 'apm', 'user-experience'],
        layout: 'grid',
        isOfficial: true,
        createdAt: new Date().toISOString(),
        widgets: [
          {
            type: 'metric',
            title: 'Response Time',
            description: 'Average response time',
            position: { x: 0, y: 0, w: 3, h: 2 },
            config: {
              dataSource: 'apm_metrics',
              query: 'SELECT AVG(response_time) FROM request_metrics WHERE timestamp > NOW() - INTERVAL 5 MINUTES',
              thresholds: { warning: 500, critical: 1000 }
            },
            isVisible: true
          },
          {
            type: 'chart',
            title: 'Request Rate',
            description: 'Requests per second over time',
            position: { x: 3, y: 0, w: 6, h: 3 },
            config: {
              dataSource: 'apm_metrics',
              query: 'SELECT timestamp, COUNT(*) as request_count FROM request_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR GROUP BY timestamp ORDER BY timestamp',
              chartType: 'line',
              refreshInterval: 15
            },
            isVisible: true
          },
          {
            type: 'chart',
            title: 'Error Rate',
            description: 'Error percentage over time',
            position: { x: 9, y: 0, w: 6, h: 3 },
            config: {
              dataSource: 'apm_metrics',
              query: 'SELECT timestamp, (COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*)) as error_rate FROM request_metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR GROUP BY timestamp ORDER BY timestamp',
              chartType: 'line',
              refreshInterval: 15
            },
            isVisible: true
          }
        ]
      },
      {
        id: 'business-metrics',
        name: 'Business Metrics',
        description: 'Track key business indicators, user engagement, and revenue metrics',
        category: 'business',
        tags: ['business', 'kpi', 'revenue'],
        layout: 'grid',
        isOfficial: true,
        createdAt: new Date().toISOString(),
        widgets: [
          {
            type: 'metric',
            title: 'Active Users',
            description: 'Current active users',
            position: { x: 0, y: 0, w: 3, h: 2 },
            config: {
              dataSource: 'business_metrics',
              query: 'SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_activity > NOW() - INTERVAL 15 MINUTES'
            },
            isVisible: true
          },
          {
            type: 'chart',
            title: 'Revenue Trend',
            description: 'Daily revenue over time',
            position: { x: 3, y: 0, w: 9, h: 3 },
            config: {
              dataSource: 'business_metrics',
              query: 'SELECT DATE(timestamp) as date, SUM(amount) as revenue FROM transactions WHERE timestamp > NOW() - INTERVAL 30 DAYS GROUP BY DATE(timestamp) ORDER BY date',
              chartType: 'bar',
              refreshInterval: 3600
            },
            isVisible: true
          }
        ]
      }
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  private async loadDashboards() {
    try {
      const data = await apiFetch<{ dashboards: Dashboard[] }>('/dashboards');
      (data.dashboards || []).forEach((dashboard) => {
        this.dashboards.set(dashboard.id, {
          ...dashboard,
          viewCount: dashboard.viewCount || 0,
          favoriteCount: dashboard.favoriteCount || 0,
          isTemplate: dashboard.isTemplate || false,
          ownerId: dashboard.ownerId || '',
        });
      });
    } catch (error) {
      console.error('Failed to load dashboards:', error);
    }
  }

  async createDashboard(data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'favoriteCount'>): Promise<string> {
    const created = await apiFetch<{ id: string }>('/dashboards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const dashboard: Dashboard = {
      ...data,
      id: created.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      favoriteCount: 0
    };
    this.dashboards.set(dashboard.id, dashboard);
    return dashboard.id;
  }

  async createDashboardFromTemplate(templateId: string, name: string, ownerId: string, category: string = 'custom'): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const dashboard: Dashboard = {
      id: `dashboard-${Date.now()}`,
      name,
      description: template.description,
      category: category as any,
      tags: [...template.tags, 'from-template'],
      widgets: template.widgets.map(widget => ({
        ...widget,
        id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })),
      layout: template.layout as any,
      refreshInterval: 60,
      isPublic: false,
      isTemplate: false,
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewCount: 0,
      favoriteCount: 0
    };

    this.dashboards.set(dashboard.id, dashboard);
    await this.saveDashboards();
    return dashboard.id;
  }

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<boolean> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return false;

    const updatedDashboard = {
      ...dashboard,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.dashboards.set(id, updatedDashboard);
    await this.saveDashboards();
    return true;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return false;

    this.dashboards.delete(id);
    await this.saveDashboards();
    return true;
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    return this.dashboards.get(id) || null;
  }

  async getAllDashboards(): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values());
  }

  async getDashboardsByCategory(category: string): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values()).filter(d => d.category === category);
  }

  async getDashboardsByOwner(ownerId: string): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values()).filter(d => d.ownerId === ownerId);
  }

  async getPublicDashboards(): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values()).filter(d => d.isPublic);
  }

  async getDashboardTemplates(): Promise<DashboardTemplate[]> {
    return Array.from(this.templates.values());
  }

  async addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date().toISOString();
    
    this.dashboards.set(dashboardId, dashboard);
    await this.saveDashboards();
    return newWidget.id;
  }

  async updateWidget(dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return false;

    dashboard.widgets[widgetIndex] = {
      ...dashboard.widgets[widgetIndex],
      ...updates
    };
    dashboard.updatedAt = new Date().toISOString();

    this.dashboards.set(dashboardId, dashboard);
    await this.saveDashboards();
    return true;
  }

  async removeWidget(dashboardId: string, widgetId: string): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    dashboard.widgets = dashboard.widgets.filter(w => w.id !== widgetId);
    dashboard.updatedAt = new Date().toISOString();

    this.dashboards.set(dashboardId, dashboard);
    await this.saveDashboards();
    return true;
  }

  async incrementViewCount(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) {
      dashboard.viewCount++;
      dashboard.lastViewed = new Date().toISOString();
      this.dashboards.set(dashboardId, dashboard);
      await this.saveDashboards();
    }
  }

  async toggleFavorite(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) {
      const key = `fav-${dashboardId}`;
      const favorited = sessionStorage.getItem(key) === '1';
      if (favorited) {
        dashboard.favoriteCount = Math.max(0, dashboard.favoriteCount - 1);
        sessionStorage.removeItem(key);
      } else {
        dashboard.favoriteCount += 1;
        sessionStorage.setItem(key, '1');
      }
      this.dashboards.set(dashboardId, dashboard);
      await this.saveDashboards();
    }
  }

  private async saveDashboards() {
    for (const dashboard of this.dashboards.values()) {
      try {
        await apiFetch(`/dashboards/${dashboard.id}`, {
          method: 'PUT',
          body: JSON.stringify(dashboard),
        });
      } catch {
        await apiFetch('/dashboards', {
          method: 'POST',
          body: JSON.stringify(dashboard),
        }).catch((error) => console.error('Failed to save dashboard', error));
      }
    }
  }

  // Generate sample data for widgets
  async generateSampleData(widget: DashboardWidget): Promise<any> {
    await metricsService.refresh().catch(() => undefined);
    const sys = metricsService.generateSystemMetrics();
    const now = new Date();

    switch (widget.type) {
      case 'metric':
        return {
          value: Math.round(sys.cpuUsage),
          unit: '%',
          trend: sys.cpuUsage >= sys.memoryUsage ? 'up' : 'down',
          change: Math.round(Math.abs(sys.cpuUsage - sys.memoryUsage))
        };

      case 'chart': {
        const hist = await apiFetch<{ metrics: Array<{ name: string; value: number; timestamp: string }> }>('/metrics?name=cpu_usage&hours=24').catch(() => ({ metrics: [] as Array<{ name: string; value: number; timestamp: string }> }));
        const rows = hist.metrics || [];
        if (rows.length === 0) {
          return [{ timestamp: now.toISOString(), value: Math.round(sys.cpuUsage) }];
        }
        return rows.map((row) => ({ timestamp: row.timestamp, value: row.value }));
      }

      case 'table': {
        const latest = await apiFetch<{ metrics: Array<{ name: string; value: number; source: string; unit: string }> }>('/metrics/latest').catch(() => ({ metrics: [] as Array<{ name: string; value: number; source: string; unit: string }> }));
        return (latest.metrics || []).slice(0, 8).map((m, i) => ({
          id: i + 1,
          name: m.name,
          status: m.source,
          responseTime: `${m.value}${m.unit || ''}`,
          uptime: m.source,
        }));
      }

      case 'status':
        return metricsService.generateServiceMetrics().map((svc) => ({
          service: svc.name,
          status: svc.status,
          lastCheck: svc.lastCheck,
        }));

      default:
        return null;
    }
  }
}

export const dashboardService = new DashboardService();