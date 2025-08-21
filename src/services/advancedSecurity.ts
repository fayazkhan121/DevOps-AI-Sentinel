import { SecurityScan, SecurityFinding, LogEntry, User, AuditLog, PlatformMetric } from '../types';
import { advancedDatabase } from './advancedDatabase';

export interface SecurityConfig {
  enabled: boolean;
  realTimeScanning: boolean;
  vulnerabilityScanning: boolean;
  complianceChecking: boolean;
  secretScanning: boolean;
  threatIntelligence: boolean;
  autoRemediation: boolean;
  alerting: boolean;
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  type: 'vulnerability' | 'compliance' | 'secret' | 'threat' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  conditions: SecurityRuleCondition[];
  actions: SecurityRuleAction[];
  createdAt: string;
  updatedAt: string;
}

export interface SecurityRuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'greater' | 'less' | 'in' | 'not_in';
  value: any;
  metadata?: Record<string, any>;
}

export interface SecurityRuleAction {
  type: 'alert' | 'block' | 'quarantine' | 'log' | 'email' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

export interface ThreatIndicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email';
  value: string;
  threatType: 'malware' | 'phishing' | 'botnet' | 'spam' | 'exploit' | 'other';
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  sources: string[];
  metadata?: Record<string, any>;
}

export interface ComplianceCheck {
  id: string;
  framework: 'SOC2' | 'ISO27001' | 'PCI-DSS' | 'HIPAA' | 'GDPR' | 'custom';
  control: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  evidence: string[];
  lastChecked: string;
  nextCheck: string;
  risk: 'low' | 'medium' | 'high';
  remediation?: string;
}

export class AdvancedSecurityService {
  private config: SecurityConfig;
  private rules: Map<string, SecurityRule> = new Map();
  private threatIndicators: Map<string, ThreatIndicator> = new Map();
  private complianceChecks: Map<string, ComplianceCheck> = new Map();
  private activeScans: Map<string, SecurityScan> = new Map();
  private securityEvents: LogEntry[] = [];
  private auditLogs: AuditLog[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private callbacks: Map<string, (event: any) => void> = new Map();
  private isRunning: boolean = false;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeDefaultRules();
    this.initializeDefaultComplianceChecks();
  }

  private initializeDefaultRules(): void {
    // Default security rules
    this.addRule({
      id: 'high-severity-vulnerability',
      name: 'High Severity Vulnerability Detection',
      description: 'Detect and alert on high severity vulnerabilities',
      type: 'vulnerability',
      severity: 'high',
      enabled: true,
      conditions: [
        {
          field: 'severity',
          operator: 'in',
          value: ['high', 'critical']
        }
      ],
      actions: [
        {
          type: 'alert',
          config: { priority: 'high' },
          enabled: true
        },
        {
          type: 'email',
          config: { recipients: ['security@company.com'] },
          enabled: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.addRule({
      id: 'suspicious-ip-activity',
      name: 'Suspicious IP Activity',
      description: 'Detect suspicious IP addresses and activities',
      type: 'threat',
      severity: 'medium',
      enabled: true,
      conditions: [
        {
          field: 'source_ip',
          operator: 'in',
          value: ['known_malicious_ips']
        }
      ],
      actions: [
        {
          type: 'block',
          config: { duration: '1h' },
          enabled: true
        },
        {
          type: 'alert',
          config: { priority: 'medium' },
          enabled: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.addRule({
      id: 'data-exfiltration',
      name: 'Data Exfiltration Detection',
      description: 'Detect potential data exfiltration attempts',
      type: 'anomaly',
      severity: 'critical',
      enabled: true,
      conditions: [
        {
          field: 'data_volume',
          operator: 'greater',
          value: 1000000 // 1MB threshold
        },
        {
          field: 'destination',
          operator: 'not_in',
          value: ['internal_networks']
        }
      ],
      actions: [
        {
          type: 'block',
          config: { duration: '24h' },
          enabled: true
        },
        {
          type: 'quarantine',
          config: { target: 'source' },
          enabled: true
        },
        {
          type: 'alert',
          config: { priority: 'critical' },
          enabled: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  private initializeDefaultComplianceChecks(): void {
    // SOC2 Compliance Checks
    this.addComplianceCheck({
      id: 'soc2-access-control',
      framework: 'SOC2',
      control: 'CC6.1',
      description: 'Access to systems and data is restricted to authorized personnel',
      status: 'compliant',
      evidence: ['Access logs reviewed', 'User access matrix maintained'],
      lastChecked: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      risk: 'low'
    });

    this.addComplianceCheck({
      id: 'soc2-data-encryption',
      framework: 'SOC2',
      control: 'CC6.7',
      description: 'Data is encrypted in transit and at rest',
      status: 'compliant',
      evidence: ['TLS 1.3 enabled', 'AES-256 encryption configured'],
      lastChecked: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      risk: 'low'
    });

    // PCI-DSS Compliance Checks
    this.addComplianceCheck({
      id: 'pci-data-protection',
      framework: 'PCI-DSS',
      control: 'PCI-DSS 3.4',
      description: 'Render PAN unreadable anywhere it is stored',
      status: 'not-applicable',
      evidence: ['No PAN data stored in system'],
      lastChecked: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      risk: 'low'
    });
  }

  addRule(rule: SecurityRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRule(ruleId: string): SecurityRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): SecurityRule[] {
    return Array.from(this.rules.values());
  }

  updateRule(ruleId: string, updates: Partial<SecurityRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    rule.updatedAt = new Date().toISOString();
    this.rules.set(ruleId, rule);
    return true;
  }

  addThreatIndicator(indicator: ThreatIndicator): void {
    this.threatIndicators.set(indicator.id, indicator);
  }

  removeThreatIndicator(indicatorId: string): boolean {
    return this.threatIndicators.delete(indicatorId);
  }

  getThreatIndicator(indicatorId: string): ThreatIndicator | undefined {
    return this.threatIndicators.get(indicatorId);
  }

  getAllThreatIndicators(): ThreatIndicator[] {
    return Array.from(this.threatIndicators.values());
  }

  addComplianceCheck(check: ComplianceCheck): void {
    this.complianceChecks.set(check.id, check);
  }

  removeComplianceCheck(checkId: string): boolean {
    return this.complianceChecks.delete(checkId);
  }

  getComplianceCheck(checkId: string): ComplianceCheck | undefined {
    return this.complianceChecks.get(checkId);
  }

  getAllComplianceChecks(): ComplianceCheck[] {
    return Array.from(this.complianceChecks.values());
  }

  startSecurityMonitoring(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.runSecurityChecks();
    }, 60000); // Check every minute

    console.log('Advanced security service started');
  }

  stopSecurityMonitoring(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Advanced security service stopped');
  }

  private async runSecurityChecks(): Promise<void> {
    try {
      // Run vulnerability scans
      if (this.config.vulnerabilityScanning) {
        await this.runVulnerabilityScan();
      }

      // Run compliance checks
      if (this.config.complianceChecking) {
        await this.runComplianceChecks();
      }

      // Run secret scanning
      if (this.config.secretScanning) {
        await this.runSecretScan();
      }

      // Check threat intelligence
      if (this.config.threatIntelligence) {
        await this.checkThreatIntelligence();
      }

    } catch (error) {
      console.error('Error during security checks:', error);
      this.logSecurityEvent('error', 'Security check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async runVulnerabilityScan(): Promise<void> {
    const scanId = `vuln-scan-${Date.now()}`;
    const scan: SecurityScan = {
      id: scanId,
      target: 'system',
      type: 'vulnerability',
      status: 'running',
      findings: [],
      startedAt: new Date().toISOString()
    };

    this.activeScans.set(scanId, scan);

    try {
      // Simulate vulnerability scanning
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Generate sample findings
      const findings: SecurityFinding[] = [
        {
          id: `finding-${Date.now()}-1`,
          severity: 'medium',
          title: 'Outdated SSL/TLS Configuration',
          description: 'System is using TLS 1.1 which is considered insecure',
          recommendation: 'Upgrade to TLS 1.3 and disable older versions',
          discoveredAt: new Date().toISOString()
        },
        {
          id: `finding-${Date.now()}-2`,
          severity: 'low',
          title: 'Weak Password Policy',
          description: 'Password policy allows weak passwords',
          recommendation: 'Implement stronger password requirements',
          discoveredAt: new Date().toISOString()
        }
      ];

      scan.findings = findings;
      scan.status = 'completed';
      scan.completedAt = new Date().toISOString();
      scan.scanDuration = 5000;

      this.activeScans.set(scanId, scan);

      // Evaluate findings against rules
      for (const finding of findings) {
        await this.evaluateSecurityFinding(finding);
      }

      // Store scan results
      await this.storeSecurityScan(scan);

    } catch (error) {
      scan.status = 'failed';
      scan.completedAt = new Date().toISOString();
      this.activeScans.set(scanId, scan);
      
      console.error('Vulnerability scan failed:', error);
    }
  }

  private async runComplianceChecks(): Promise<void> {
    const checks = Array.from(this.complianceChecks.values());
    
    for (const check of checks) {
      try {
        // Simulate compliance check
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update check status (simulate some failures)
        if (Math.random() < 0.1) { // 10% chance of non-compliance
          check.status = 'non-compliant';
          check.evidence.push('Automated check failed');
          check.remediation = 'Review and fix identified issues';
        } else {
          check.status = 'compliant';
          check.evidence.push('Automated check passed');
        }

        check.lastChecked = new Date().toISOString();
        check.nextCheck = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        this.complianceChecks.set(check.id, check);

        // Log compliance event
        this.logSecurityEvent('info', 'Compliance check completed', {
          framework: check.framework,
          control: check.control,
          status: check.status
        });

      } catch (error) {
        console.error(`Compliance check failed for ${check.id}:`, error);
      }
    }
  }

  private async runSecretScan(): Promise<void> {
    try {
      // Simulate secret scanning
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for common secrets in logs and data
      const secretsFound = Math.random() < 0.05; // 5% chance of finding secrets

      if (secretsFound) {
        const finding: SecurityFinding = {
          id: `secret-${Date.now()}`,
          severity: 'high',
          title: 'Potential Secret Exposure',
          description: 'Possible API keys or secrets found in system logs',
          recommendation: 'Review logs and remove any exposed secrets',
          discoveredAt: new Date().toISOString()
        };

        await this.evaluateSecurityFinding(finding);
        this.logSecurityEvent('warning', 'Potential secret exposure detected', { finding });
      }

    } catch (error) {
      console.error('Secret scan failed:', error);
    }
  }

  private async checkThreatIntelligence(): Promise<void> {
    try {
      // Simulate threat intelligence check
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if any known threats are active
      const threats = Array.from(this.threatIndicators.values());
      const activeThreats = threats.filter(t => {
        const lastSeen = new Date(t.lastSeen).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return lastSeen > oneDayAgo;
      });

      if (activeThreats.length > 0) {
        this.logSecurityEvent('warning', 'Active threats detected', {
          threatCount: activeThreats.length,
          threats: activeThreats.map(t => ({ type: t.threatType, value: t.value }))
        });
      }

    } catch (error) {
      console.error('Threat intelligence check failed:', error);
    }
  }

  private async evaluateSecurityFinding(finding: SecurityFinding): Promise<void> {
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled && rule.type === 'vulnerability');

    for (const rule of applicableRules) {
      const isTriggered = this.evaluateRuleConditions(rule, finding);
      
      if (isTriggered) {
        await this.executeRuleActions(rule, finding);
        this.logSecurityEvent('alert', 'Security rule triggered', {
          rule: rule.name,
          finding: finding.title,
          severity: finding.severity
        });
      }
    }
  }

  private evaluateRuleConditions(rule: SecurityRule, finding: SecurityFinding): boolean {
    return rule.conditions.every(condition => {
      const fieldValue = this.getFieldValue(finding, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'regex':
          return new RegExp(condition.value).test(String(fieldValue));
        case 'greater':
          return Number(fieldValue) > Number(condition.value);
        case 'less':
          return Number(fieldValue) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        default:
          return false;
      }
    });
  }

  private getFieldValue(finding: SecurityFinding, field: string): any {
    switch (field) {
      case 'severity':
        return finding.severity;
      case 'title':
        return finding.title;
      case 'description':
        return finding.description;
      default:
        return finding.metadata?.[field];
    }
  }

  private async executeRuleActions(rule: SecurityRule, finding: SecurityFinding): Promise<void> {
    for (const action of rule.actions) {
      if (!action.enabled) continue;

      try {
        switch (action.type) {
          case 'alert':
            await this.createSecurityAlert(rule, finding, action.config);
            break;
          case 'log':
            this.logSecurityEvent('info', 'Security rule action executed', {
              rule: rule.name,
              action: action.type,
              finding: finding.title
            });
            break;
          case 'email':
            await this.sendSecurityEmail(rule, finding, action.config);
            break;
          case 'webhook':
            await this.sendSecurityWebhook(rule, finding, action.config);
            break;
          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  private async createSecurityAlert(rule: SecurityRule, finding: SecurityFinding, config: Record<string, any>): Promise<void> {
    // Create security alert
    const alert = {
      id: `security-alert-${Date.now()}`,
      ruleId: rule.id,
      name: `Security Alert: ${rule.name}`,
      description: finding.description,
      severity: rule.severity,
      status: 'active',
      source: 'security-service',
      timestamp: new Date().toISOString(),
      metadata: {
        rule: rule.name,
        finding: finding.title,
        priority: config.priority || 'medium'
      }
    };

    // Store alert in database
    await this.storeSecurityAlert(alert);
  }

  private async sendSecurityEmail(rule: SecurityRule, finding: SecurityFinding, config: Record<string, any>): Promise<void> {
    // Simulate sending security email
    console.log(`Security email sent for rule: ${rule.name}`);
  }

  private async sendSecurityWebhook(rule: SecurityRule, finding: SecurityFinding, config: Record<string, any>): Promise<void> {
    // Simulate sending webhook
    console.log(`Security webhook sent for rule: ${rule.name}`);
  }

  private async storeSecurityScan(scan: SecurityScan): Promise<void> {
    try {
      // Convert to PlatformMetric for storage
      const metric: PlatformMetric = {
        id: `security-scan-${scan.id}`,
        name: 'security_scan',
        value: scan.status === 'completed' ? 1 : 0,
        unit: 'status',
        timestamp: scan.startedAt,
        source: 'security-service',
        category: 'security',
        tags: {
          scanId: scan.id,
          scanType: scan.type,
          status: scan.status
        },
        metadata: {
          findings: scan.findings.length,
          duration: scan.scanDuration,
          target: scan.target
        }
      };

      await advancedDatabase.saveMetric(metric);
    } catch (error) {
      console.error('Failed to store security scan:', error);
    }
  }

  private async storeSecurityAlert(alert: any): Promise<void> {
    try {
      // Convert to PlatformMetric for storage
      const metric: PlatformMetric = {
        id: `security-alert-${alert.id}`,
        name: 'security_alert',
        value: 1,
        unit: 'count',
        timestamp: alert.timestamp,
        source: 'security-service',
        category: 'security',
        tags: {
          alertId: alert.id,
          severity: alert.severity,
          status: alert.status
        },
        metadata: {
          rule: alert.metadata.rule,
          finding: alert.metadata.finding,
          priority: alert.metadata.priority
        }
      };

      await advancedDatabase.saveMetric(metric);
    } catch (error) {
      console.error('Failed to store security alert:', error);
    }
  }

  private logSecurityEvent(level: 'debug' | 'info' | 'warning' | 'error' | 'fatal', message: string, metadata?: Record<string, any>): void {
    const event: LogEntry = {
      id: `security-event-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      source: 'security-service',
      service: 'advanced-security',
      metadata: metadata || {},
      tags: ['security', level]
    };

    this.securityEvents.push(event);

    // Keep only recent events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Notify callbacks
    this.notifyCallbacks('security-event', event);
  }

  private notifyCallbacks(eventType: string, data: any): void {
    const callback = this.callbacks.get(eventType);
    if (callback) {
      callback(data);
    }
  }

  onSecurityEvent(eventType: string, callback: (event: any) => void): void {
    this.callbacks.set(eventType, callback);
  }

  removeSecurityEventCallback(eventType: string): void {
    this.callbacks.delete(eventType);
  }

  getSecurityEvents(limit: number = 100): LogEntry[] {
    return this.securityEvents.slice(-limit);
  }

  getActiveScans(): SecurityScan[] {
    return Array.from(this.activeScans.values());
  }

  getSecurityStatus(): 'secure' | 'at-risk' | 'compromised' {
    const recentEvents = this.securityEvents.filter(e => {
      const eventTime = new Date(e.timestamp).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return eventTime > oneHourAgo;
    });

    const criticalEvents = recentEvents.filter(e => e.level === 'fatal' || e.level === 'error');
    const warningEvents = recentEvents.filter(e => e.level === 'warning');

    if (criticalEvents.length > 0) return 'compromised';
    if (warningEvents.length > 5) return 'at-risk';
    return 'secure';
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    Object.assign(this.config, newConfig);
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  isMonitoring(): boolean {
    return this.isRunning;
  }
}

export const advancedSecurity = new AdvancedSecurityService({
  enabled: true,
  realTimeScanning: true,
  vulnerabilityScanning: true,
  complianceChecking: true,
  secretScanning: true,
  threatIntelligence: true,
  autoRemediation: false,
  alerting: true
}); 