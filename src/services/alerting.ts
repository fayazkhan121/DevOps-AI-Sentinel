import { AlertRule, AlertNotification, AlertChannel } from '../types/alerts';
import { EmailService } from './email';
import { SlackService } from './slack';
import { WebhookService } from './webhook';
import { AnomalyDetectionService } from './anomalyDetection';

export class AlertingService {
  private emailService: EmailService;
  private slackService: SlackService;
  private webhookService: WebhookService;
  private anomalyService: AnomalyDetectionService;

  constructor(config: any) {
    this.emailService = new EmailService(config.email);
    this.slackService = new SlackService(config.slack);
    this.webhookService = new WebhookService(config.webhook);
    this.anomalyService = new AnomalyDetectionService();
  }

  async createAlertRule(rule: AlertRule) {
    // Validate and store alert rule
    return await this.storeAlertRule(rule);
  }

  async evaluateAlerts(metrics: any) {
    const alerts = await this.checkAlertConditions(metrics);
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  private async sendAlert(alert: AlertNotification) {
    switch (alert.channel) {
      case AlertChannel.EMAIL:
        await this.emailService.sendAlert(alert);
        break;
      case AlertChannel.SLACK:
        await this.slackService.sendAlert(alert);
        break;
      case AlertChannel.WEBHOOK:
        await this.webhookService.sendAlert(alert);
        break;
    }
  }

  async predictPotentialIssues(metrics: any) {
    return await this.anomalyService.predictIssues(metrics);
  }
}