import { CostAnalysis, CostRecommendation, PlatformMetric, CloudResource } from '../types';
import { advancedDatabase } from './advancedDatabase';
import { cloudMonitoring } from './cloudMonitoring';

export interface CostConfig {
  enabled: boolean;
  realTimeMonitoring: boolean;
  budgetAlerts: boolean;
  optimization: boolean;
  reporting: boolean;
  currency: string;
  timezone: string;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  isActive: boolean;
  alerts: BudgetAlert[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlert {
  id: string;
  threshold: number; // Percentage of budget
  type: 'warning' | 'critical';
  enabled: boolean;
  channels: string[];
  lastTriggered?: string;
}

export interface CostTrend {
  period: string;
  totalCost: number;
  change: number; // Percentage change from previous period
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    database: number;
    other: number;
  };
  topServices: {
    service: string;
    cost: number;
    percentage: number;
  }[];
}

export interface ResourceCost {
  id: string;
  name: string;
  type: string;
  provider: string;
  region: string;
  cost: number;
  currency: string;
  period: string;
  usage: {
    hours?: number;
    gb?: number;
    requests?: number;
    other?: number;
  };
  tags: Record<string, string>;
  optimization: {
    potentialSavings: number;
    recommendations: string[];
    effort: 'low' | 'medium' | 'high';
    risk: 'low' | 'medium' | 'high';
  };
}

export interface CostOptimization {
  id: string;
  type: 'resize' | 'shutdown' | 'reservation' | 'savings_plan' | 'spot_instance' | 'storage_tier';
  resourceId: string;
  resourceName: string;
  currentCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  implementation: string;
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'implemented' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  implementedAt?: string;
  notes?: string;
}

export class AdvancedCostManagementService {
  private config: CostConfig;
  private budgets: Map<string, Budget> = new Map();
  private costTrends: Map<string, CostTrend[]> = new Map();
  private resourceCosts: Map<string, ResourceCost[]> = new Map();
  private optimizations: Map<string, CostOptimization[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, (event: any) => void> = new Map();
  private isRunning: boolean = false;

  constructor(config: CostConfig) {
    this.config = config;
    this.initializeDefaultBudgets();
  }

  private initializeDefaultBudgets(): void {
    // Default monthly budget
    this.addBudget({
      id: 'default-monthly',
      name: 'Default Monthly Budget',
      amount: 1000,
      currency: 'USD',
      period: 'monthly',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      alerts: [
        {
          id: 'budget-warning-80',
          threshold: 80,
          type: 'warning',
          enabled: true,
          channels: ['email', 'dashboard']
        },
        {
          id: 'budget-critical-95',
          threshold: 95,
          type: 'critical',
          enabled: true,
          channels: ['email', 'dashboard', 'slack']
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  addBudget(budget: Budget): void {
    this.budgets.set(budget.id, budget);
  }

  removeBudget(budgetId: string): boolean {
    return this.budgets.delete(budgetId);
  }

  getBudget(budgetId: string): Budget | undefined {
    return this.budgets.get(budgetId);
  }

  getAllBudgets(): Budget[] {
    return Array.from(this.budgets.values());
  }

  updateBudget(budgetId: string, updates: Partial<Budget>): boolean {
    const budget = this.budgets.get(budgetId);
    if (!budget) return false;

    Object.assign(budget, updates);
    budget.updatedAt = new Date().toISOString();
    this.budgets.set(budgetId, budget);
    return true;
  }

  startCostMonitoring(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.runCostAnalysis();
    }, 300000); // Check every 5 minutes

    console.log('Advanced cost management service started');
  }

  stopCostMonitoring(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Advanced cost management service stopped');
  }

  private async runCostAnalysis(): Promise<void> {
    try {
      // Collect current cost data
      const currentCosts = await this.collectCurrentCosts();
      
      // Analyze cost trends
      await this.analyzeCostTrends(currentCosts);
      
      // Check budget alerts
      await this.checkBudgetAlerts(currentCosts);
      
      // Generate optimization recommendations
      await this.generateOptimizationRecommendations(currentCosts);
      
      // Store cost metrics
      await this.storeCostMetrics(currentCosts);

    } catch (error) {
      console.error('Error during cost analysis:', error);
    }
  }

  private async collectCurrentCosts(): Promise<{ total: number; breakdown: any; resources: ResourceCost[] }> {
    try {
      // Get cloud resources and their costs
      const cloudResources = await cloudMonitoring.getResourceInventory();
      
      let totalCost = 0;
      const breakdown = {
        compute: 0,
        storage: 0,
        network: 0,
        database: 0,
        other: 0
      };

      const resourceCosts: ResourceCost[] = [];

      for (const resource of cloudResources) {
        const cost = resource.metrics.cost || 0;
        totalCost += cost;

        // Categorize costs
        if (resource.type.includes('compute') || resource.type.includes('instance')) {
          breakdown.compute += cost;
        } else if (resource.type.includes('storage') || resource.type.includes('bucket')) {
          breakdown.storage += cost;
        } else if (resource.type.includes('network') || resource.type.includes('loadbalancer')) {
          breakdown.network += cost;
        } else if (resource.type.includes('database') || resource.type.includes('rds')) {
          breakdown.database += cost;
        } else {
          breakdown.other += cost;
        }

        // Create resource cost object
        const resourceCost: ResourceCost = {
          id: resource.id,
          name: resource.name,
          type: resource.type,
          provider: 'aws', // Would be determined from resource
          region: resource.region,
          cost,
          currency: 'USD',
          period: 'monthly',
          usage: {
            hours: Math.random() * 730, // Simulate usage hours
            gb: Math.random() * 1000, // Simulate storage usage
            requests: Math.random() * 1000000 // Simulate request count
          },
          tags: resource.metrics || {},
          optimization: {
            potentialSavings: cost * 0.15, // Assume 15% potential savings
            recommendations: this.generateResourceRecommendations(resource),
            effort: this.calculateEffort(resource),
            risk: this.calculateRisk(resource)
          }
        };

        resourceCosts.push(resourceCost);
      }

      return { total: totalCost, breakdown, resources: resourceCosts };

    } catch (error) {
      console.error('Failed to collect current costs:', error);
      return { total: 0, breakdown: { compute: 0, storage: 0, network: 0, database: 0, other: 0 }, resources: [] };
    }
  }

  private generateResourceRecommendations(resource: CloudResource): string[] {
    const recommendations: string[] = [];

    if (resource.type.includes('compute')) {
      if (resource.metrics.cpu < 30) {
        recommendations.push('Consider downsizing instance type');
      }
      if (resource.metrics.memory < 40) {
        recommendations.push('Reduce memory allocation');
      }
      recommendations.push('Use reserved instances for long-term workloads');
      recommendations.push('Consider spot instances for non-critical workloads');
    }

    if (resource.type.includes('storage')) {
      recommendations.push('Enable lifecycle policies for cost optimization');
      recommendations.push('Use appropriate storage tiers');
      recommendations.push('Implement data compression');
    }

    if (resource.type.includes('database')) {
      recommendations.push('Use reserved capacity for predictable workloads');
      recommendations.push('Enable auto-scaling');
      recommendations.push('Consider serverless options');
    }

    return recommendations;
  }

  private calculateEffort(resource: CloudResource): 'low' | 'medium' | 'high' {
    if (resource.type.includes('storage')) return 'low';
    if (resource.type.includes('compute')) return 'medium';
    if (resource.type.includes('database')) return 'high';
    return 'medium';
  }

  private calculateRisk(resource: CloudResource): 'low' | 'medium' | 'high' {
    if (resource.type.includes('storage')) return 'low';
    if (resource.type.includes('compute')) return 'medium';
    if (resource.type.includes('database')) return 'high';
    return 'medium';
  }

  private async analyzeCostTrends(currentCosts: { total: number; breakdown: any; resources: ResourceCost[] }): Promise<void> {
    const now = new Date();
    const period = this.getCurrentPeriod();
    
    // Get previous period costs for comparison
    const previousCosts = this.getPreviousPeriodCosts(period);
    
    const change = previousCosts.total > 0 
      ? ((currentCosts.total - previousCosts.total) / previousCosts.total) * 100 
      : 0;

    // Calculate top services by cost
    const serviceCosts = new Map<string, number>();
    for (const resource of currentCosts.resources) {
      const current = serviceCosts.get(resource.type) || 0;
      serviceCosts.set(resource.type, current + resource.cost);
    }

    const topServices = Array.from(serviceCosts.entries())
      .map(([service, cost]) => ({
        service,
        cost,
        percentage: (cost / currentCosts.total) * 100
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    const costTrend: CostTrend = {
      period,
      totalCost: currentCosts.total,
      change,
      breakdown: currentCosts.breakdown,
      topServices
    };

    // Store trend
    const trends = this.costTrends.get(period) || [];
    trends.push(costTrend);
    
    // Keep only recent trends
    if (trends.length > 12) { // Keep last 12 periods
      trends.splice(0, trends.length - 12);
    }
    
    this.costTrends.set(period, trends);
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getPreviousPeriodCosts(currentPeriod: string): { total: number; breakdown: any } {
    // Simulate previous period costs
    const [year, month] = currentPeriod.split('-');
    const prevMonth = month === '01' ? '12' : String(parseInt(month) - 1).padStart(2, '0');
    const prevYear = month === '01' ? String(parseInt(year) - 1) : year;
    const prevPeriod = `${prevYear}-${prevMonth}`;
    
    const trends = this.costTrends.get(prevPeriod);
    if (trends && trends.length > 0) {
      const lastTrend = trends[trends.length - 1];
      return { total: lastTrend.totalCost, breakdown: lastTrend.breakdown };
    }
    
    // Return simulated data if no previous data
    return {
      total: 950, // Simulate 5% increase
      breakdown: { compute: 400, storage: 200, network: 150, database: 150, other: 50 }
    };
  }

  private async checkBudgetAlerts(currentCosts: { total: number; breakdown: any; resources: ResourceCost[] }): Promise<void> {
    const activeBudgets = Array.from(this.budgets.values()).filter(b => b.isActive);
    
    for (const budget of activeBudgets) {
      const budgetAmount = budget.amount;
      const currentSpent = currentCosts.total;
      const percentageUsed = (currentSpent / budgetAmount) * 100;

      for (const alert of budget.alerts) {
        if (!alert.enabled) continue;

        if (percentageUsed >= alert.threshold) {
          // Check if alert was already triggered
          const shouldTrigger = !alert.lastTriggered || 
            (Date.now() - new Date(alert.lastTriggered).getTime()) > (24 * 60 * 60 * 1000); // Once per day

          if (shouldTrigger) {
            await this.triggerBudgetAlert(budget, alert, percentageUsed, currentSpent);
            alert.lastTriggered = new Date().toISOString();
          }
        }
      }
    }
  }

  private async triggerBudgetAlert(budget: Budget, alert: BudgetAlert, percentageUsed: number, currentSpent: number): Promise<void> {
    const alertData = {
      id: `budget-alert-${Date.now()}`,
      budgetId: budget.id,
      budgetName: budget.name,
      threshold: alert.threshold,
      type: alert.type,
      percentageUsed,
      currentSpent,
      budgetAmount: budget.amount,
      currency: budget.currency,
      timestamp: new Date().toISOString()
    };

    // Notify callbacks
    this.notifyCallbacks('budget-alert', alertData);

    // Log the alert
    console.log(`Budget Alert: ${budget.name} - ${percentageUsed.toFixed(1)}% used (${alert.type})`);

    // Send notifications based on channels
    for (const channel of alert.channels) {
      switch (channel) {
        case 'email':
          await this.sendBudgetAlertEmail(alertData);
          break;
        case 'slack':
          await this.sendBudgetAlertSlack(alertData);
          break;
        case 'dashboard':
          // Dashboard notification handled by callback
          break;
      }
    }
  }

  private async sendBudgetAlertEmail(alertData: any): Promise<void> {
    // Simulate sending budget alert email
    console.log(`Budget alert email sent for ${alertData.budgetName}`);
  }

  private async sendBudgetAlertSlack(alertData: any): Promise<void> {
    // Simulate sending budget alert to Slack
    console.log(`Budget alert sent to Slack for ${alertData.budgetName}`);
  }

  private async generateOptimizationRecommendations(currentCosts: { total: number; breakdown: any; resources: ResourceCost[] }): Promise<void> {
    const optimizations: CostOptimization[] = [];

    for (const resource of currentCosts.resources) {
      if (resource.optimization.potentialSavings > 10) { // Only show if savings > $10
        const optimization: CostOptimization = {
          id: `opt-${resource.id}-${Date.now()}`,
          type: this.determineOptimizationType(resource),
          resourceId: resource.id,
          resourceName: resource.name,
          currentCost: resource.cost,
          potentialSavings: resource.optimization.potentialSavings,
          savingsPercentage: (resource.optimization.potentialSavings / resource.cost) * 100,
          effort: resource.optimization.effort,
          risk: resource.optimization.risk,
          implementation: resource.optimization.recommendations.join('; '),
          estimatedTime: this.estimateImplementationTime(resource.optimization.effort),
          priority: this.calculatePriority(resource.optimization.potentialSavings, resource.optimization.effort, resource.optimization.risk),
          status: 'pending'
        };

        optimizations.push(optimization);
      }
    }

    // Store optimizations
    const period = this.getCurrentPeriod();
    this.optimizations.set(period, optimizations);
  }

  private determineOptimizationType(resource: ResourceCost): 'resize' | 'shutdown' | 'reservation' | 'savings_plan' | 'spot_instance' | 'storage_tier' {
    if (resource.type.includes('compute')) {
      if (resource.usage.hours && resource.usage.hours > 600) { // More than 25 days per month
        return 'reservation';
      }
      return 'resize';
    }
    if (resource.type.includes('storage')) {
      return 'storage_tier';
    }
    if (resource.type.includes('database')) {
      return 'reservation';
    }
    return 'resize';
  }

  private estimateImplementationTime(effort: 'low' | 'medium' | 'high'): string {
    switch (effort) {
      case 'low': return '1-2 hours';
      case 'medium': return '4-8 hours';
      case 'high': return '1-3 days';
      default: return 'Unknown';
    }
  }

  private calculatePriority(savings: number, effort: 'low' | 'medium' | 'high', risk: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' | 'critical' {
    if (savings > 1000) return 'critical';
    if (savings > 500) return 'high';
    if (savings > 100) return 'medium';
    return 'low';
  }

  private async storeCostMetrics(currentCosts: { total: number; breakdown: any; resources: ResourceCost[] }): Promise<void> {
    try {
      // Store total cost metric
      const totalMetric: PlatformMetric = {
        id: `cost-total-${Date.now()}`,
        name: 'total_cost',
        value: currentCosts.total,
        unit: 'USD',
        timestamp: new Date().toISOString(),
        source: 'cost-management',
        category: 'cost',
        tags: {
          period: this.getCurrentPeriod(),
          type: 'total'
        },
        metadata: {
          breakdown: currentCosts.breakdown,
          resourceCount: currentCosts.resources.length
        }
      };

      await advancedDatabase.saveMetric(totalMetric);

      // Store breakdown metrics
      for (const [category, cost] of Object.entries(currentCosts.breakdown)) {
        const breakdownMetric: PlatformMetric = {
          id: `cost-${category}-${Date.now()}`,
          name: `cost_${category}`,
          value: cost,
          unit: 'USD',
          timestamp: new Date().toISOString(),
          source: 'cost-management',
          category: 'cost',
          tags: {
            period: this.getCurrentPeriod(),
            type: category
          },
          metadata: {
            percentage: (cost / currentCosts.total) * 100
          }
        };

        await advancedDatabase.saveMetric(breakdownMetric);
      }

    } catch (error) {
      console.error('Failed to store cost metrics:', error);
    }
  }

  private notifyCallbacks(eventType: string, data: any): void {
    const callback = this.callbacks.get(eventType);
    if (callback) {
      callback(data);
    }
  }

  onCostEvent(eventType: string, callback: (event: any) => void): void {
    this.callbacks.set(eventType, callback);
  }

  removeCostEventCallback(eventType: string): void {
    this.callbacks.delete(eventType);
  }

  getCostTrends(period?: string): CostTrend[] {
    const targetPeriod = period || this.getCurrentPeriod();
    return this.costTrends.get(targetPeriod) || [];
  }

  getResourceCosts(period?: string): ResourceCost[] {
    const targetPeriod = period || this.getCurrentPeriod();
    return this.resourceCosts.get(targetPeriod) || [];
  }

  getOptimizations(period?: string): CostOptimization[] {
    const targetPeriod = period || this.getCurrentPeriod();
    return this.optimizations.get(targetPeriod) || [];
  }

  getCurrentPeriodCosts(): { total: number; breakdown: any } {
    const period = this.getCurrentPeriod();
    const trends = this.costTrends.get(period);
    if (trends && trends.length > 0) {
      const latest = trends[trends.length - 1];
      return { total: latest.totalCost, breakdown: latest.breakdown };
    }
    return { total: 0, breakdown: { compute: 0, storage: 0, network: 0, database: 0, other: 0 } };
  }

  getBudgetUtilization(budgetId: string): { used: number; remaining: number; percentage: number } {
    const budget = this.budgets.get(budgetId);
    if (!budget) return { used: 0, remaining: 0, percentage: 0 };

    const currentCosts = this.getCurrentPeriodCosts();
    const used = currentCosts.total;
    const remaining = Math.max(0, budget.amount - used);
    const percentage = (used / budget.amount) * 100;

    return { used, remaining, percentage };
  }

  updateConfig(newConfig: Partial<CostConfig>): void {
    Object.assign(this.config, newConfig);
  }

  getConfig(): CostConfig {
    return { ...this.config };
  }

  isMonitoring(): boolean {
    return this.isRunning;
  }
}

export const advancedCostManagement = new AdvancedCostManagementService({
  enabled: true,
  realTimeMonitoring: true,
  budgetAlerts: true,
  optimization: true,
  reporting: true,
  currency: 'USD',
  timezone: 'UTC'
}); 