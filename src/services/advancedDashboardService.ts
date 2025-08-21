import { Dashboard, Widget, PlatformMetric } from '../types';
import { advancedDatabase } from './advancedDatabase';

export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  layout: any;
  widgets: string[];
  refreshInterval: number;
  created: string;
  updated: string;
  owner: string;
  tags: string[];
  isPublic: boolean;
}

export interface AdvancedWidget extends Widget {
  config: any;
  dataSource: string;
  refreshInterval: number;
  lastUpdate: string;
  status: 'active' | 'inactive' | 'error';
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  layout: any;
  widgets: Partial<AdvancedWidget>[];
  tags: string[];
}

export interface DashboardSnapshot {
  id: string;
  dashboardId: string;
  name: string;
  description: string;
  data: any;
  timestamp: string;
  createdBy: string;
}

export class AdvancedDashboardService {
  private dashboards: Map<string, DashboardConfig> = new Map();
  private widgets: Map<string, AdvancedWidget> = new Map();
  private templates: Map<string, DashboardTemplate> = new Map();
  private snapshots: Map<string, DashboardSnapshot[]> = new Map();
  private activeDashboard: string | null = null;
  private realTimeUpdates: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.loadFromStorage();
  }

  private initializeDefaultTemplates(): void {
    // System Overview Template
    this.templates.set('system-overview', {
      id: 'system-overview',
      name: 'System Overview',
      description: 'Basic system monitoring dashboard with key metrics',
      category: 'monitoring',
      layout: {
        columns: 12,
        rows: 8,
        widgets: [
          { id: 'cpu-usage', x: 0, y: 0, w: 6, h: 4 },
          { id: 'memory-usage', x: 6, y: 0, w: 6, h: 4 },
          { id: 'network-traffic', x: 0, y: 4, w: 12, h: 4 }
        ]
      },
      widgets: [
        {
          id: 'cpu-usage',
          type: 'metric',
          title: 'CPU Usage',
          dataSource: 'system.cpu',
          config: { unit: '%', color: 'blue' }
        },
        {
          id: 'memory-usage',
          type: 'metric',
          title: 'Memory Usage',
          dataSource: 'system.memory',
          config: { unit: '%', color: 'green' }
        },
        {
          id: 'network-traffic',
          type: 'chart',
          title: 'Network Traffic',
          dataSource: 'system.network',
          config: { chartType: 'line', timeRange: '1h' }
        }
      ],
      tags: ['monitoring', 'system', 'basic']
    });

    // DevOps Pipeline Template
    this.templates.set('devops-pipeline', {
      id: 'devops-pipeline',
      name: 'DevOps Pipeline',
      description: 'CI/CD pipeline monitoring and status dashboard',
      category: 'devops',
      layout: {
        columns: 12,
        rows: 10,
        widgets: [
          { id: 'pipeline-status', x: 0, y: 0, w: 12, h: 3 },
          { id: 'build-history', x: 0, y: 3, w: 6, h: 4 },
          { id: 'deployment-status', x: 6, y: 3, w: 6, h: 4 },
          { id: 'test-results', x: 0, y: 7, w: 12, h: 3 }
        ]
      },
      widgets: [
        {
          id: 'pipeline-status',
          type: 'status',
          title: 'Pipeline Status',
          dataSource: 'pipeline.status',
          config: { showHistory: true }
        },
        {
          id: 'build-history',
          type: 'chart',
          title: 'Build History',
          dataSource: 'pipeline.builds',
          config: { chartType: 'bar', timeRange: '7d' }
        },
        {
          id: 'deployment-status',
          type: 'table',
          title: 'Deployment Status',
          dataSource: 'pipeline.deployments',
          config: { columns: ['service', 'version', 'status', 'timestamp'] }
        },
        {
          id: 'test-results',
          type: 'metric',
          title: 'Test Coverage',
          dataSource: 'pipeline.tests',
          config: { unit: '%', color: 'purple' }
        }
      ],
      tags: ['devops', 'pipeline', 'ci-cd']
    });

    // Security Monitoring Template
    this.templates.set('security-monitoring', {
      id: 'security-monitoring',
      name: 'Security Monitoring',
      description: 'Security events, vulnerabilities, and compliance dashboard',
      category: 'security',
      layout: {
        columns: 12,
        rows: 8,
        widgets: [
          { id: 'security-events', x: 0, y: 0, w: 8, h: 4 },
          { id: 'vulnerability-summary', x: 8, y: 0, w: 4, h: 4 },
          { id: 'compliance-status', x: 0, y: 4, w: 6, h: 4 },
          { id: 'threat-intel', x: 6, y: 4, w: 6, h: 4 }
        ]
      },
      widgets: [
        {
          id: 'security-events',
          type: 'chart',
          title: 'Security Events',
          dataSource: 'security.events',
          config: { chartType: 'line', timeRange: '24h' }
        },
        {
          id: 'vulnerability-summary',
          type: 'metric',
          title: 'Open Vulnerabilities',
          dataSource: 'security.vulnerabilities',
          config: { unit: 'count', color: 'red' }
        },
        {
          id: 'compliance-status',
          type: 'status',
          title: 'Compliance Status',
          dataSource: 'security.compliance',
          config: { showDetails: true }
        },
        {
          id: 'threat-intel',
          type: 'table',
          title: 'Threat Intelligence',
          dataSource: 'security.threats',
          config: { columns: ['threat', 'severity', 'status', 'updated'] }
        }
      ],
      tags: ['security', 'monitoring', 'compliance']
    });
  }

  private async loadFromStorage(): Promise<void> {
    try {
      // Load dashboards from storage
      const storedDashboards = await advancedDatabase.getMetric('dashboards');
      if (storedDashboards) {
        for (const dashboard of storedDashboards) {
          this.dashboards.set(dashboard.id, dashboard);
        }
      }

      // Load widgets from storage
      const storedWidgets = await advancedDatabase.getMetric('widgets');
      if (storedWidgets) {
        for (const widget of storedWidgets) {
          this.widgets.set(widget.id, widget);
        }
      }

      // Load snapshots from storage
      const storedSnapshots = await advancedDatabase.getMetric('snapshots');
      if (storedSnapshots) {
        for (const snapshot of storedSnapshots) {
          const dashboardSnapshots = this.snapshots.get(snapshot.dashboardId) || [];
          dashboardSnapshots.push(snapshot);
          this.snapshots.set(snapshot.dashboardId, dashboardSnapshots);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboards from storage:', error);
    }
  }

  // Dashboard Management
  async createDashboard(config: Partial<DashboardConfig>): Promise<string> {
    const id = `dashboard-${Date.now()}`;
    const now = new Date().toISOString();
    
    const dashboard: DashboardConfig = {
      id,
      name: config.name || 'New Dashboard',
      description: config.description || '',
      layout: config.layout || { columns: 12, rows: 8, widgets: [] },
      widgets: config.widgets || [],
      refreshInterval: config.refreshInterval || 30000,
      created: now,
      updated: now,
      owner: config.owner || 'default',
      tags: config.tags || [],
      isPublic: config.isPublic || false
    };

    this.dashboards.set(id, dashboard);
    await this.saveDashboard(dashboard);
    
    console.log(`Dashboard created: ${dashboard.name}`);
    return id;
  }

  async updateDashboard(id: string, updates: Partial<DashboardConfig>): Promise<boolean> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      return false;
    }

    Object.assign(dashboard, updates, { updated: new Date().toISOString() });
    await this.saveDashboard(dashboard);
    
    console.log(`Dashboard updated: ${dashboard.name}`);
    return true;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      return false;
    }

    // Remove all widgets
    for (const widgetId of dashboard.widgets) {
      this.widgets.delete(widgetId);
    }

    // Remove snapshots
    this.snapshots.delete(id);

    // Remove dashboard
    this.dashboards.delete(id);

    // Save changes
    await this.saveAllDashboards();
    await this.saveAllWidgets();
    
    console.log(`Dashboard deleted: ${dashboard.name}`);
    return true;
  }

  getDashboard(id: string): DashboardConfig | undefined {
    return this.dashboards.get(id);
  }

  getAllDashboards(): DashboardConfig[] {
    return Array.from(this.dashboards.values());
  }

  // Widget Management
  async createWidget(config: Partial<AdvancedWidget>): Promise<string> {
    const id = `widget-${Date.now()}`;
    const now = new Date().toISOString();
    
    const widget: AdvancedWidget = {
      id,
      type: config.type || 'metric',
      title: config.title || 'New Widget',
      dataSource: config.dataSource || '',
      config: config.config || {},
      refreshInterval: config.refreshInterval || 30000,
      lastUpdate: now,
      status: 'active'
    };

    this.widgets.set(id, widget);
    await this.saveWidget(widget);
    
    console.log(`Widget created: ${widget.title}`);
    return id;
  }

  async updateWidget(id: string, updates: Partial<AdvancedWidget>): Promise<boolean> {
    const widget = this.widgets.get(id);
    if (!widget) {
      return false;
    }

    Object.assign(widget, updates, { lastUpdate: new Date().toISOString() });
    await this.saveWidget(widget);
    
    console.log(`Widget updated: ${widget.title}`);
    return true;
  }

  async deleteWidget(id: string): Promise<boolean> {
    const widget = this.widgets.get(id);
    if (!widget) {
      return false;
    }

    // Remove from all dashboards
    for (const dashboard of this.dashboards.values()) {
      const index = dashboard.widgets.indexOf(id);
      if (index > -1) {
        dashboard.widgets.splice(index, 1);
        await this.saveDashboard(dashboard);
      }
    }

    // Remove widget
    this.widgets.delete(id);
    await this.saveAllWidgets();
    
    console.log(`Widget deleted: ${widget.title}`);
    return true;
  }

  getWidget(id: string): AdvancedWidget | undefined {
    return this.widgets.get(id);
  }

  getAllWidgets(): AdvancedWidget[] {
    return Array.from(this.widgets.values());
  }

  // Template Management
  getTemplates(): DashboardTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): DashboardTemplate | undefined {
    return this.templates.get(id);
  }

  async createFromTemplate(templateId: string, name: string, owner: string): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create dashboard
    const dashboardId = await this.createDashboard({
      name,
      description: template.description,
      layout: template.layout,
      owner,
      tags: template.tags
    });

    // Create widgets
    for (const widgetTemplate of template.widgets) {
      const widgetId = await this.createWidget({
        type: widgetTemplate.type || 'metric',
        title: widgetTemplate.title || 'Widget',
        dataSource: widgetTemplate.dataSource || '',
        config: widgetTemplate.config || {}
      });

      // Add widget to dashboard
      const dashboard = this.dashboards.get(dashboardId);
      if (dashboard) {
        dashboard.widgets.push(widgetId);
        await this.saveDashboard(dashboard);
      }
    }

    console.log(`Dashboard created from template: ${name}`);
    return dashboardId;
  }

  // Snapshot Management
  async createSnapshot(dashboardId: string, name: string, description: string, createdBy: string): Promise<string> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const snapshot: DashboardSnapshot = {
      id: `snapshot-${Date.now()}`,
      dashboardId,
      name,
      description,
      data: {
        dashboard,
        widgets: dashboard.widgets.map(id => this.widgets.get(id)).filter(Boolean)
      },
      timestamp: new Date().toISOString(),
      createdBy
    };

    const dashboardSnapshots = this.snapshots.get(dashboardId) || [];
    dashboardSnapshots.push(snapshot);
    this.snapshots.set(dashboardId, dashboardSnapshots);

    // Save snapshot
    await this.saveSnapshot(snapshot);
    
    console.log(`Snapshot created: ${name}`);
    return snapshot.id;
  }

  getSnapshots(dashboardId: string): DashboardSnapshot[] {
    return this.snapshots.get(dashboardId) || [];
  }

  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    // Find snapshot
    let snapshot: DashboardSnapshot | undefined;
    for (const snapshots of this.snapshots.values()) {
      snapshot = snapshots.find(s => s.id === snapshotId);
      if (snapshot) break;
    }

    if (!snapshot) {
      return false;
    }

    // Restore dashboard
    const dashboard = snapshot.data.dashboard;
    this.dashboards.set(dashboard.id, dashboard);

    // Restore widgets
    for (const widget of snapshot.data.widgets) {
      if (widget) {
        this.widgets.set(widget.id, widget);
      }
    }

    // Save restored data
    await this.saveDashboard(dashboard);
    await this.saveAllWidgets();
    
    console.log(`Snapshot restored: ${snapshot.name}`);
    return true;
  }

  // Real-time Updates
  startRealTimeUpdates(dashboardId: string): void {
    if (this.realTimeUpdates.has(dashboardId)) {
      return; // Already running
    }

    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return;
    }

    const interval = setInterval(async () => {
      await this.updateDashboardData(dashboardId);
    }, dashboard.refreshInterval);

    this.realTimeUpdates.set(dashboardId, interval);
    console.log(`Real-time updates started for dashboard: ${dashboard.name}`);
  }

  stopRealTimeUpdates(dashboardId: string): void {
    const interval = this.realTimeUpdates.get(dashboardId);
    if (interval) {
      clearInterval(interval);
      this.realTimeUpdates.delete(dashboardId);
      
      const dashboard = this.dashboards.get(dashboardId);
      console.log(`Real-time updates stopped for dashboard: ${dashboard?.name}`);
    }
  }

  private async updateDashboardData(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return;
    }

    // Update widget data
    for (const widgetId of dashboard.widgets) {
      const widget = this.widgets.get(widgetId);
      if (widget && widget.status === 'active') {
        try {
          // In a real implementation, this would fetch data from the data source
          // For now, we'll just update the timestamp
          widget.lastUpdate = new Date().toISOString();
          await this.saveWidget(widget);
        } catch (error) {
          console.error(`Failed to update widget ${widgetId}:`, error);
          widget.status = 'error';
          await this.saveWidget(widget);
        }
      }
    }
  }

  // Export/Import
  async exportDashboard(dashboardId: string): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const widgets = dashboard.widgets.map(id => this.widgets.get(id)).filter(Boolean);
    
    return {
      dashboard,
      widgets,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  async importDashboard(data: any): Promise<string> {
    // Validate import data
    if (!data.dashboard || !data.widgets) {
      throw new Error('Invalid import data');
    }

    // Create dashboard
    const dashboardId = await this.createDashboard({
      name: `${data.dashboard.name} (Imported)`,
      description: data.dashboard.description,
      layout: data.dashboard.layout,
      owner: 'default',
      tags: [...(data.dashboard.tags || []), 'imported']
    });

    // Create widgets
    for (const widgetData of data.widgets) {
      const widgetId = await this.createWidget({
        type: widgetData.type,
        title: widgetData.title,
        dataSource: widgetData.dataSource,
        config: widgetData.config
      });

      // Add widget to dashboard
      const dashboard = this.dashboards.get(dashboardId);
      if (dashboard) {
        dashboard.widgets.push(widgetId);
        await this.saveDashboard(dashboard);
      }
    }

    console.log(`Dashboard imported: ${data.dashboard.name}`);
    return dashboardId;
  }

  // Storage Methods
  private async saveDashboard(dashboard: DashboardConfig): Promise<void> {
    try {
      await advancedDatabase.saveMetric('dashboards', dashboard);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  }

  private async saveAllDashboards(): Promise<void> {
    try {
      const dashboards = Array.from(this.dashboards.values());
      await advancedDatabase.saveMetric('dashboards', dashboards);
    } catch (error) {
      console.error('Failed to save all dashboards:', error);
    }
  }

  private async saveWidget(widget: AdvancedWidget): Promise<void> {
    try {
      await advancedDatabase.saveMetric('widgets', widget);
    } catch (error) {
      console.error('Failed to save widget:', error);
    }
  }

  private async saveAllWidgets(): Promise<void> {
    try {
      const widgets = Array.from(this.widgets.values());
      await advancedDatabase.saveMetric('widgets', widgets);
    } catch (error) {
      console.error('Failed to save all widgets:', error);
    }
  }

  private async saveSnapshot(snapshot: DashboardSnapshot): Promise<void> {
    try {
      await advancedDatabase.saveMetric('snapshots', snapshot);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  }

  // Utility Methods
  setActiveDashboard(dashboardId: string): void {
    this.activeDashboard = dashboardId;
  }

  getActiveDashboard(): string | null {
    return this.activeDashboard;
  }

  getDashboardStats(): { [key: string]: any } {
    return {
      totalDashboards: this.dashboards.size,
      totalWidgets: this.widgets.size,
      totalTemplates: this.templates.size,
      totalSnapshots: Array.from(this.snapshots.values()).reduce((sum, snapshots) => sum + snapshots.length, 0),
      activeRealTimeUpdates: this.realTimeUpdates.size
    };
  }

  isRealTimeActive(dashboardId: string): boolean {
    return this.realTimeUpdates.has(dashboardId);
  }
}

export const advancedDashboardService = new AdvancedDashboardService(); 