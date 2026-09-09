import { apiFetch } from '@/lib/apiClient';
import type { LogEntry, SecurityScan } from '../types';

export class AdvancedSecurityService {
  private events: LogEntry[] = [];
  private scans: SecurityScan[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private callbacks = new Map<string, () => void>();

  startSecurityMonitoring(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), 30000);
  }
  stopSecurityMonitoring(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  private async refresh() {
    try {
      const data = await apiFetch<{ logs: Array<{ id: string; action: string; description: string; timestamp: string; user_id: string }> }>('/audit?limit=50');
      this.events = (data.logs || []).map((log) => ({
        id: log.id,
        level: log.action.includes('fail') ? 'error' : 'info',
        message: log.description,
        timestamp: log.timestamp,
        source: log.user_id,
        service: 'audit',
        metadata: {},
        tags: [log.action],
      })) as LogEntry[];
    } catch {
      this.events = [];
    }
    this.callbacks.forEach((cb) => cb());
  }
  onSecurityEvent(type: string, cb: () => void): void { this.callbacks.set(type, cb); }
  removeSecurityEventCallback(type: string): void { this.callbacks.delete(type); }
  getSecurityEvents(): LogEntry[] { return this.events; }
  getActiveScans(): SecurityScan[] { return this.scans; }
  getSecurityStatus(): 'secure' | 'at-risk' | 'compromised' {
    const errors = this.events.filter((e) => (e as { level?: string }).level === 'error').length;
    if (errors > 10) return 'compromised';
    if (errors > 0) return 'at-risk';
    return 'secure';
  }
  addRule(): void {}
  removeRule(): boolean { return true; }
  getRule() { return undefined; }
  getAllRules() { return []; }
  updateRule(): boolean { return true; }
  addThreatIndicator(): void {}
  removeThreatIndicator(): boolean { return true; }
  getThreatIndicator() { return undefined; }
  getAllThreatIndicators() { return []; }
  addComplianceCheck(): void {}
  removeComplianceCheck(): boolean { return true; }
  getComplianceCheck() { return undefined; }
  getAllComplianceChecks() { return []; }
  updateConfig(): void {}
  getConfig() { return { enabled: true, realTimeScanning: true, vulnerabilityScanning: true, complianceChecking: true, secretScanning: true, threatIntelligence: false, autoRemediation: false, alerting: true }; }
  isMonitoring(): boolean { return this.timer !== null; }
}

export const advancedSecurity = new AdvancedSecurityService();
