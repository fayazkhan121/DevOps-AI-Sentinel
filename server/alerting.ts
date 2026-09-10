import nodemailer from 'nodemailer';
import { config } from './config.ts';
import { decryptJson, randomId } from './crypto.ts';
import { getDb, nowIso, parseJson } from './db.ts';
import { evaluateCondition } from './anomaly.ts';
import type { CollectedMetric } from './collectors.ts';

interface RuleRow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  metric: string;
  operator: string;
  threshold: number;
  duration_seconds: number;
  severity: string;
  enabled: number;
  actions: string;
}

interface ChannelRow {
  id: string;
  org_id: string;
  type: string;
  name: string;
  config_encrypted: string | null;
  is_enabled: number;
}

export async function sendSystemEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    await deliverEmail([to], subject, body);
    return true;
  } catch {
    return false;
  }
}

async function deliverEmail(to: string[], subject: string, body: string, smtpOverride?: Record<string, string>): Promise<void> {
  const host = smtpOverride?.host || smtpOverride?.smtpHost || config.smtp.host;
  const user = smtpOverride?.username || smtpOverride?.user || config.smtp.user;
  const pass = smtpOverride?.password || config.smtp.password;
  const port = Number(smtpOverride?.port || smtpOverride?.smtpPort || config.smtp.port);
  const secure = smtpOverride?.secure === 'true' || config.smtp.secure;
  const from = smtpOverride?.from || smtpOverride?.username || config.smtp.from || user;
  if (!host || !user) {
    throw new Error('SMTP is not configured');
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from,
    to: to.join(','),
    subject,
    text: body,
  });
}

async function deliverWebhook(url: string, payload: unknown, extraHeaders?: Record<string, string>, method = 'POST'): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Webhook failed with HTTP ${res.status}`);
  }
}

async function sendChannel(channel: ChannelRow, alert: Record<string, unknown>): Promise<void> {
  const cfg = decryptJson<Record<string, string>>(channel.config_encrypted, {});
  const text = `[${alert.severity}] ${alert.name}: ${alert.description}`;
  switch (channel.type) {
    case 'email': {
      const recipients = (cfg.to || cfg.recipients || cfg.username || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (recipients.length === 0) throw new Error('Email channel has no recipients');
      await deliverEmail(recipients, String(alert.name), text, cfg);
      break;
    }
    case 'slack': {
      const url = cfg.url || cfg.webhook || config.slackWebhook;
      if (!url) throw new Error('Slack webhook URL missing');
      await deliverWebhook(url, { text });
      break;
    }
    case 'discord': {
      if (!cfg.url) throw new Error('Discord webhook URL missing');
      await deliverWebhook(cfg.url, { content: text });
      break;
    }
    case 'telegram': {
      if (!cfg.botToken || !cfg.chatId) throw new Error('Telegram botToken and chatId required');
      const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cfg.chatId, text }),
      });
      if (!res.ok) throw new Error(`Telegram failed with HTTP ${res.status}`);
      break;
    }
    case 'sms': {
      const sid = cfg.accountSid || process.env.TWILIO_ACCOUNT_SID || '';
      const token = cfg.authToken || process.env.TWILIO_AUTH_TOKEN || '';
      const from = cfg.from || process.env.TWILIO_FROM || '';
      const to = cfg.to || '';
      if (!sid || !token || !from || !to) throw new Error('Twilio SMS configuration incomplete');
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: from, To: to, Body: text }),
      });
      if (!res.ok) throw new Error(`Twilio failed with HTTP ${res.status}`);
      break;
    }
    case 'webhook':
    default: {
      if (!cfg.url) throw new Error('Webhook URL missing');
      await deliverWebhook(cfg.url, { alert, timestamp: nowIso() }, undefined, cfg.method || 'POST');
    }
  }
}

export async function evaluateAlerts(orgId: string, metrics: CollectedMetric[]): Promise<string[]> {
  const db = getDb();
  const rules = await db.all<RuleRow>('SELECT * FROM alert_rules WHERE org_id = ? AND enabled = 1', [orgId]);
  const triggered: string[] = [];

  for (const rule of rules) {
    const metric = metrics.find((m) => m.name === rule.metric || m.source === rule.metric);
    if (!metric) continue;
    if (!evaluateCondition(metric.value, rule.operator, rule.threshold)) continue;

    const existing = await db.get<{ id: string }>(
      `SELECT id FROM alerts WHERE org_id = ? AND rule_id = ? AND status IN ('active','acknowledged') ORDER BY timestamp DESC LIMIT 1`,
      [orgId, rule.id]
    );
    if (existing) continue;

    const alertId = randomId('alert');
    const description = `${rule.name}: ${metric.name} is ${metric.value}${metric.unit} (threshold ${rule.operator} ${rule.threshold})`;
    await db.run(
      `INSERT INTO alerts (id, org_id, rule_id, name, description, severity, status, source, timestamp, metadata)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        alertId,
        orgId,
        rule.id,
        rule.name,
        description,
        rule.severity,
        metric.source,
        nowIso(),
        JSON.stringify({ metricValue: metric.value, threshold: rule.threshold, unit: metric.unit }),
      ]
    );
    triggered.push(alertId);

    const actions = parseJson<{ channels?: string[] }>(rule.actions, {});
    const channels = await db.all<ChannelRow>('SELECT * FROM notification_channels WHERE org_id = ? AND is_enabled = 1', [orgId]);
    const selected = actions.channels?.length
      ? channels.filter((c) => actions.channels!.includes(c.id) || actions.channels!.includes(c.type))
      : channels.filter((c) => c.is_enabled);
    for (const channel of selected) {
      try {
        await sendChannel(channel, {
          id: alertId,
          name: rule.name,
          description,
          severity: rule.severity,
        });
      } catch (error) {
        await db.run(
          'INSERT INTO audit_logs (id, org_id, user_id, action, description, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [randomId('log'), orgId, 'system', 'alert_delivery_failed', `Failed ${channel.type} delivery`, error instanceof Error ? error.message : 'error', nowIso()]
        );
      }
    }
  }

  return triggered;
}

export async function testChannel(channelId: string): Promise<void> {
  const db = getDb();
  const channel = await db.get<ChannelRow>('SELECT * FROM notification_channels WHERE id = ?', [channelId]);
  if (!channel) throw new Error('Channel not found');
  await sendChannel(channel, {
    name: 'Test alert',
    description: 'DevOps AI Sentinel notification channel test',
    severity: 'info',
  });
}

export async function seedDefaultRules(orgId: string): Promise<void> {
  const db = getDb();
  const existing = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM alert_rules WHERE org_id = ?', [orgId]);
  if ((existing?.c || 0) > 0) return;
  const defaults = [
    { metric: 'cpu_usage', name: 'High CPU Usage', threshold: config.thresholds.cpuCritical, severity: 'critical' },
    { metric: 'memory_usage', name: 'High Memory Usage', threshold: config.thresholds.memoryCritical, severity: 'critical' },
    { metric: 'disk_usage', name: 'High Disk Usage', threshold: config.thresholds.diskCritical, severity: 'warning' },
  ];
  for (const rule of defaults) {
    await db.run(
      `INSERT INTO alert_rules (id, org_id, name, description, metric, operator, threshold, duration_seconds, severity, enabled, actions, created_at)
       VALUES (?, ?, ?, ?, ?, '>', ?, 300, ?, 1, '{}', ?)`,
      [randomId('rule'), orgId, rule.name, `${rule.name} threshold`, rule.metric, rule.threshold, rule.severity, nowIso()]
    );
  }
}
