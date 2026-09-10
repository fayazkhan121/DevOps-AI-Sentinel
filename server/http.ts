import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.ts';
import { getDb, nowIso, parseJson, type DbAdapter } from './db.ts';
import { encryptJson, decryptJson, randomId, sha256, randomToken } from './crypto.ts';
import { requireAuth, requirePermission, requireRole, clientMeta, type AuthedRequest } from './middleware.ts';
import { collectAllMetrics, persistMetrics, overviewFromMetrics, collectHostMetrics, probeDatabase, normalizeIntegrationConfig } from './collectors.ts';
import { evaluateAlerts, testChannel, sendSystemEmail } from './alerting.ts';
import { clusterLogs, detectValueAnomalies } from './anomaly.ts';
import { provisionOrg, findLoginUsers, publicUser as tenantPublicUser, upsertSetting, orgWantsHostMetrics } from './tenancy.ts';
import { generateTotpSecret, verifyTotp, totpOtpauthUrl } from './totp.ts';
import { createBackup, restoreBackup } from './backup.ts';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'user:read', 'user:write', 'user:delete',
    'system:read', 'system:write', 'system:delete',
    'monitoring:read', 'monitoring:write',
    'alerts:read', 'alerts:write',
    'settings:read', 'settings:write',
    'logs:read', 'logs:write',
  ],
  user: ['monitoring:read', 'alerts:read', 'alerts:write', 'settings:read', 'logs:read'],
  viewer: ['monitoring:read', 'alerts:read'],
};

function signToken(user: { id: string; username: string; role: string; orgId: string }, sessionId: string, rememberMe: boolean): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, orgId: user.orgId, sessionId },
    config.jwtSecret,
    { expiresIn: rememberMe ? `${config.rememberMeDays}d` : `${config.sessionHours}h` }
  );
}

function publicUser(row: Record<string, unknown>) {
  return tenantPublicUser(row);
}

async function audit(orgId: string | null, userId: string, action: string, description: string, req?: AuthedRequest, details?: unknown): Promise<void> {
  const meta = req ? clientMeta(req) : { ip: 'system', userAgent: 'system' };
  await getDb().run(
    'INSERT INTO audit_logs (id, org_id, user_id, action, description, details, ip_address, user_agent, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [randomId('log'), orgId, userId, action, description, details ? JSON.stringify(details) : null, meta.ip, meta.userAgent, nowIso()]
  );
}

export function createRouter(): express.Router {
  const router = express.Router();
  const db: DbAdapter = {
    get kind() {
      return getDb().kind;
    },
    exec(sql) {
      return getDb().exec(sql);
    },
    run(sql, params) {
      return getDb().run(sql, params);
    },
    get(sql, params) {
      return getDb().get(sql, params);
    },
    all(sql, params) {
      return getDb().all(sql, params);
    },
    close() {
      return getDb().close();
    },
  };

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: db.kind,
      time: nowIso(),
      uptime: process.uptime(),
    });
  });

  router.get('/setup/status', async (_req, res) => {
    const count = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users');
    res.json({ needsSetup: Number(count?.c || 0) === 0 });
  });

  router.post('/setup', async (req, res) => {
    const count = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users');
    if (Number(count?.c || 0) > 0) {
      res.status(409).json({ success: false, message: 'Setup already completed' });
      return;
    }
    const {
      adminUsername, adminPassword, adminEmail, adminFullName, companyName, systemName,
    } = req.body || {};
    if (!adminUsername || !adminPassword || String(adminPassword).length < 8) {
      res.status(400).json({ success: false, message: 'Admin username and a password of at least 8 characters are required' });
      return;
    }
    const provisioned = await provisionOrg({
      orgName: companyName || systemName || 'Default Org',
      adminUsername: String(adminUsername),
      adminPassword: String(adminPassword),
      adminEmail,
      adminFullName,
      collectHostMetrics: true,
    });
    await audit(provisioned.orgId, provisioned.userId, 'system_setup', 'Initial administrator created', req as AuthedRequest);
    const sessionId = randomId('session');
    const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
    const meta = clientMeta(req);
    await db.run(
      'INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, ip_address, user_agent, last_activity) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      [sessionId, provisioned.userId, nowIso(), expires, meta.ip, meta.userAgent, nowIso()]
    );
    const user = { id: provisioned.userId, username: String(adminUsername), role: 'admin', orgId: provisioned.orgId };
    res.json({
      success: true,
      token: signToken(user, sessionId, false),
      user: publicUser(await db.get('SELECT * FROM users WHERE id = ?', [provisioned.userId]) as Record<string, unknown>),
    });
  });

  router.post('/auth/login', async (req, res) => {
    const { username, password, rememberMe, org, orgId, totp, totpCode } = req.body || {};
    const matches = await findLoginUsers(String(username || ''), String(org || orgId || ''));
    if (matches.length > 1) {
      res.status(400).json({
        success: false,
        message: 'Multiple organizations match this username; pass org or orgId',
        orgs: await Promise.all(matches.map(async (row) => {
          const orgRow = await db.get<{ id: string; name: string }>('SELECT id, name FROM orgs WHERE id = ?', [String(row.org_id)]);
          return { id: orgRow?.id, name: orgRow?.name };
        })),
      });
      return;
    }
    const user = matches[0];
    if (!user) {
      await audit(null, 'system', 'login_failed', `Unknown user ${username}`, req as AuthedRequest);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    if (Number(user.is_active) !== 1) {
      res.status(403).json({ success: false, message: 'Account is disabled' });
      return;
    }
    if (user.locked_until && new Date(String(user.locked_until)) > new Date()) {
      res.status(423).json({ success: false, message: 'Account is temporarily locked' });
      return;
    }
    const ok = await bcrypt.compare(String(password || ''), String(user.password_hash));
    if (!ok) {
      const attempts = Number(user.failed_login_attempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      await db.run('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockedUntil, String(user.id)]);
      await audit(String(user.org_id), String(user.id), 'login_failed', 'Invalid password', req as AuthedRequest);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    if (Number(user.totp_enabled) === 1) {
      const code = String(totp || totpCode || '');
      if (!code) {
        res.status(401).json({ success: false, requiresTotp: true, message: 'TOTP code required' });
        return;
      }
      if (!verifyTotp(String(user.totp_secret || ''), code)) {
        res.status(401).json({ success: false, requiresTotp: true, message: 'Invalid TOTP code' });
        return;
      }
    }
    await db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = ? WHERE id = ?', [nowIso(), String(user.id)]);
    const sessionId = randomId('session');
    const hours = rememberMe ? config.rememberMeDays * 24 : config.sessionHours;
    const expires = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const meta = clientMeta(req);
    await db.run(
      'INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, ip_address, user_agent, last_activity) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      [sessionId, String(user.id), nowIso(), expires, meta.ip, meta.userAgent, nowIso()]
    );
    await audit(String(user.org_id), String(user.id), 'user_login', 'User logged in', req as AuthedRequest);
    res.json({
      success: true,
      token: signToken({ id: String(user.id), username: String(user.username), role: String(user.role), orgId: String(user.org_id) }, sessionId, Boolean(rememberMe)),
      user: publicUser(user),
    });
  });

  router.post('/auth/logout', requireAuth, async (req: AuthedRequest, res) => {
    await db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [req.user!.sessionId]);
    audit(req.user!.orgId, req.user!.id, 'user_logout', 'User logged out', req);
    res.json({ success: true });
  });

  router.get('/auth/me', requireAuth, async (req: AuthedRequest, res) => {
    const user = await db.get<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    res.json({ success: true, user: user ? publicUser(user) : null });
  });

  router.post('/auth/refresh', requireAuth, async (req: AuthedRequest, res) => {
    const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
    await db.run('UPDATE sessions SET expires_at = ?, last_activity = ? WHERE id = ?', [expires, nowIso(), req.user!.sessionId]);
    res.json({
      success: true,
      token: signToken({ id: req.user!.id, username: req.user!.username, role: req.user!.role, orgId: req.user!.orgId }, req.user!.sessionId, false),
    });
  });

  router.get('/auth/methods', (_req, res) => {
    res.json({
      github: Boolean(config.githubOauth.clientId),
      oidc: Boolean(config.oidc.issuer && config.oidc.clientId),
      saml: Boolean(config.saml.idpSsoUrl),
      smtp: Boolean(config.smtp.host && config.smtp.user),
    });
  });

  router.get('/auth/github', async (req, res) => {
    if (!config.githubOauth.clientId) {
      res.status(501).json({ success: false, message: 'GitHub OAuth is not configured' });
      return;
    }
    const state = randomToken(16);
    const orgId = String(req.query.org || req.query.orgId || '');
    await db.run('INSERT INTO oauth_states (state, created_at, org_id, purpose) VALUES (?, ?, ?, ?)', [state, nowIso(), orgId || null, 'github']);
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', config.githubOauth.clientId);
    url.searchParams.set('redirect_uri', config.githubOauth.callbackUrl);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', state);
    res.redirect(url.toString());
  });

  router.get('/auth/github/callback', async (req, res) => {
    const { code, state } = req.query;
    const saved = await db.get<{ state: string; org_id: string | null }>('SELECT state, org_id FROM oauth_states WHERE state = ?', [String(state || '')]);
    if (!saved || !code) {
      res.status(400).send('Invalid OAuth state');
      return;
    }
    await db.run('DELETE FROM oauth_states WHERE state = ?', [String(state)]);
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.githubOauth.clientId,
        client_secret: config.githubOauth.clientSecret,
        code,
      }),
    });
    const tokenJson = await tokenRes.json() as { access_token?: string };
    if (!tokenJson.access_token) {
      res.status(401).send('GitHub OAuth failed');
      return;
    }
    const profileRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, 'User-Agent': 'devops-ai-sentinel' },
    });
    const profile = await profileRes.json() as { login?: string; email?: string; name?: string };
    const username = profile.login || '';
    const matches = await findLoginUsers(username, saved.org_id || undefined);
    if (matches.length > 1) {
      res.status(400).send('Multiple organizations match this GitHub user; restart from /api/auth/github?org=');
      return;
    }
    let user = matches[0];
    if (!user) {
      const org = saved.org_id
        ? await db.get<{ id: string }>('SELECT id FROM orgs WHERE id = ?', [saved.org_id])
        : await db.get<{ id: string }>('SELECT id FROM orgs LIMIT 1');
      if (!org) {
        res.status(409).send('Complete first-time setup before SSO login');
        return;
      }
      const userId = randomId('user');
      const randomPassword = await bcrypt.hash(randomToken(), 12);
      await db.run(
        `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'viewer', ?, ?, 1, 0, ?, ?)`,
        [userId, org.id, username, profile.email || `${username}@users.noreply.github.com`, profile.name || username, JSON.stringify(ROLE_PERMISSIONS.viewer), randomPassword, nowIso(), nowIso()]
      );
      user = await db.get<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [userId])!;
    }
    const sessionId = randomId('session');
    const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
    await db.run(
      'INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, last_activity) VALUES (?, ?, ?, ?, 1, ?)',
      [sessionId, String(user.id), nowIso(), expires, nowIso()]
    );
    const jwtToken = signToken({ id: String(user.id), username: String(user.username), role: String(user.role), orgId: String(user.org_id) }, sessionId, false);
    res.redirect(`${config.webOrigin}/login?sso=${encodeURIComponent(jwtToken)}`);
  });

  router.get('/users', requireAuth, requirePermission('user:read'), async (req: AuthedRequest, res) => {
    const users = (await db.all<Record<string, unknown>>('SELECT * FROM users WHERE org_id = ?', [req.user!.orgId])).map(publicUser);
    res.json({ success: true, users });
  });

  router.post('/users', requireAuth, requirePermission('user:write'), async (req: AuthedRequest, res) => {
    const { username, email, fullName, role, password, permissions } = req.body || {};
    if (!username || !password || String(password).length < 8) {
      res.status(400).json({ success: false, message: 'Username and password (8+ characters) are required' });
      return;
    }
    const exists = await db.get('SELECT id FROM users WHERE username = ? AND org_id = ?', [username, req.user!.orgId]);
    if (exists) {
      res.status(409).json({ success: false, message: 'Username already exists' });
      return;
    }
    const id = randomId('user');
    const assignedRole = ['admin', 'user', 'viewer'].includes(role) ? role : 'user';
    const perms = Array.isArray(permissions) && permissions.length ? permissions : ROLE_PERMISSIONS[assignedRole];
    await db.run(
      `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      [id, req.user!.orgId, username, email || '', fullName || '', assignedRole, JSON.stringify(perms), await bcrypt.hash(String(password), 12), nowIso(), nowIso()]
    );
    audit(req.user!.orgId, req.user!.id, 'user_created', `Created user ${username}`, req);
    res.status(201).json({ success: true, id });
  });

  router.put('/users/:id', requireAuth, requirePermission('user:write'), async (req: AuthedRequest, res) => {
    const user = await db.get<Record<string, unknown>>('SELECT * FROM users WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const { email, fullName, role, isActive, permissions, password } = req.body || {};
    let passwordHash = String(user.password_hash);
    if (password) {
      if (String(password).length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        return;
      }
      passwordHash = await bcrypt.hash(String(password), 12);
    }
    await db.run(
      `UPDATE users SET email = ?, full_name = ?, role = ?, is_active = ?, permissions = ?, password_hash = ?, updated_at = ? WHERE id = ?`,
      [
        email ?? user.email,
        fullName ?? user.full_name,
        role ?? user.role,
        isActive === false ? 0 : 1,
        JSON.stringify(permissions || parseJson(String(user.permissions), [])),
        passwordHash,
        nowIso(),
        req.params.id,
      ]
    );
    audit(req.user!.orgId, req.user!.id, 'user_updated', `Updated user ${user.username}`, req);
    res.json({ success: true });
  });

  router.delete('/users/:id', requireAuth, requirePermission('user:delete'), async (req: AuthedRequest, res) => {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ success: false, message: 'Cannot delete your own account' });
      return;
    }
    await db.run('DELETE FROM users WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    audit(req.user!.orgId, req.user!.id, 'user_deleted', `Deleted user ${req.params.id}`, req);
    res.json({ success: true });
  });

  router.post('/users/me/password', requireAuth, async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const user = await db.get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
    if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.password_hash))) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }
    if (!newPassword || String(newPassword).length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
      return;
    }
    await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [await bcrypt.hash(String(newPassword), 12), nowIso(), req.user!.id]);
    audit(req.user!.orgId, req.user!.id, 'password_changed', 'Password changed', req);
    res.json({ success: true });
  });

  router.get('/audit', requireAuth, requirePermission('logs:read'), async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit || 200), 1000);
    const logs = await db.all('SELECT * FROM audit_logs WHERE org_id = ? ORDER BY timestamp DESC LIMIT ?', [req.user!.orgId, limit]);
    res.json({ success: true, logs });
  });

  router.get('/metrics', requireAuth, requirePermission('monitoring:read'), async (req: AuthedRequest, res) => {
    const hours = Math.min(Number(req.query.hours || 24), 24 * 90);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const name = req.query.name ? String(req.query.name) : null;
    const rows = name
      ? await db.all('SELECT * FROM metrics WHERE org_id = ? AND name = ? AND timestamp >= ? ORDER BY timestamp ASC', [req.user!.orgId, name, since])
      : await db.all('SELECT * FROM metrics WHERE org_id = ? AND timestamp >= ? ORDER BY timestamp ASC', [req.user!.orgId, since]);
    res.json({ success: true, metrics: rows });
  });

  router.get('/metrics/latest', requireAuth, requirePermission('monitoring:read'), async (req: AuthedRequest, res) => {
    const host = await orgWantsHostMetrics(req.user!.orgId) ? collectHostMetrics() : [];
    const persisted = await db.all<{ name: string; value: number; source: string; unit: string; timestamp: string; category?: string; tags?: string }>(
      `SELECT name, value, source, unit, timestamp, category, tags FROM metrics WHERE org_id = ? AND id IN (
         SELECT MAX(id) FROM metrics WHERE org_id = ? GROUP BY name, source
       )`,
      [req.user!.orgId, req.user!.orgId]
    );
    const hostKeys = new Set(host.map((m) => `${m.source}:${m.name}`));
    const extra = persisted
      .filter((row) => !hostKeys.has(`${row.source}:${row.name}`))
      .map((row) => ({
        name: row.name,
        value: row.value,
        unit: row.unit,
        source: row.source,
        category: row.category || 'inventory',
        tags: parseJson(row.tags || '{}', {}),
        timestamp: row.timestamp,
      }));
    const latest = [...host, ...extra];
    res.json({ success: true, metrics: latest, overview: overviewFromMetrics(latest) });
  });

  router.get('/metrics/overview', requireAuth, requirePermission('monitoring:read'), async (req: AuthedRequest, res) => {
    const latest = await db.all<{ name: string; value: number; source: string; unit: string; timestamp: string }>(
      `SELECT name, value, source, unit, timestamp FROM metrics WHERE org_id = ? AND id IN (
         SELECT MAX(id) FROM metrics WHERE org_id = ? GROUP BY name, source
       )`,
      [req.user!.orgId, req.user!.orgId]
    );
    const mapped = latest.map((m) => ({ ...m, tags: {}, category: 'performance' }));
    const overview = overviewFromMetrics(mapped as never);
    const services = await summarizeServices(req.user!.orgId);
    res.json({ success: true, overview, latest, services });
  });

  router.post('/metrics/collect', requireAuth, requirePermission('monitoring:write'), async (req: AuthedRequest, res) => {
    const metrics = await collectAllMetrics(req.user!.orgId);
    await persistMetrics(metrics, req.user!.orgId);
    const alerts = await evaluateAlerts(req.user!.orgId, metrics);
    res.json({ success: true, collected: metrics.length, alertsTriggered: alerts.length, metrics, overview: overviewFromMetrics(metrics) });
  });

  router.get('/alerts', requireAuth, requirePermission('alerts:read'), async (req: AuthedRequest, res) => {
    const alerts = await db.all('SELECT * FROM alerts WHERE org_id = ? ORDER BY timestamp DESC LIMIT 200', [req.user!.orgId]);
    res.json({ success: true, alerts });
  });

  router.post('/alerts/:id/ack', requireAuth, requirePermission('alerts:write'), async (req: AuthedRequest, res) => {
    await db.run("UPDATE alerts SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by = ? WHERE id = ? AND org_id = ?", [nowIso(), req.user!.id, req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.post('/alerts/:id/resolve', requireAuth, requirePermission('alerts:write'), async (req: AuthedRequest, res) => {
    await db.run("UPDATE alerts SET status = 'resolved', resolved_at = ?, resolved_by = ? WHERE id = ? AND org_id = ?", [nowIso(), req.user!.id, req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.get('/alert-rules', requireAuth, requirePermission('alerts:read'), async (req: AuthedRequest, res) => {
    res.json({ success: true, rules: await db.all('SELECT * FROM alert_rules WHERE org_id = ?', [req.user!.orgId]) });
  });

  router.post('/alert-rules', requireAuth, requirePermission('alerts:write'), async (req: AuthedRequest, res) => {
    const { name, description, metric, operator, threshold, severity, durationSeconds, actions } = req.body || {};
    if (!name || !metric || !operator) {
      res.status(400).json({ success: false, message: 'name, metric, and operator are required' });
      return;
    }
    const id = randomId('rule');
    await db.run(
      `INSERT INTO alert_rules (id, org_id, name, description, metric, operator, threshold, duration_seconds, severity, enabled, actions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, req.user!.orgId, name, description || '', metric, operator, Number(threshold), Number(durationSeconds || 0), severity || 'warning', JSON.stringify(actions || {}), nowIso()]
    );
    res.status(201).json({ success: true, id });
  });

  router.get('/channels', requireAuth, requirePermission('alerts:read'), async (req: AuthedRequest, res) => {
    const rows = await db.all<Record<string, unknown>>('SELECT id, org_id, type, name, config_encrypted, is_enabled, is_default, created_at FROM notification_channels WHERE org_id = ?', [req.user!.orgId]);
    res.json({
      success: true,
      channels: rows.map((row) => ({
        id: row.id,
        orgId: row.org_id,
        type: row.type,
        name: row.name,
        config: decryptJson(row.config_encrypted as string | null, {}),
        isEnabled: Number(row.is_enabled) === 1,
        enabled: Number(row.is_enabled) === 1,
        isDefault: Number(row.is_default) === 1,
        createdAt: row.created_at,
      })),
    });
  });

  router.post('/channels', requireAuth, requirePermission('alerts:write'), async (req: AuthedRequest, res) => {
    const { type, name, config: channelConfig, isEnabled } = req.body || {};
    if (!type || !name) {
      res.status(400).json({ success: false, message: 'type and name are required' });
      return;
    }
    const id = randomId('channel');
    await db.run(
      'INSERT INTO notification_channels (id, org_id, type, name, config_encrypted, is_enabled, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
      [id, req.user!.orgId, type, name, encryptJson(channelConfig || {}), isEnabled === false ? 0 : 1, nowIso()]
    );
    res.status(201).json({ success: true, id });
  });

  router.post('/channels/:id/test', requireAuth, requirePermission('alerts:write'), async (req: AuthedRequest, res) => {
    const existing = await db.get('SELECT id FROM notification_channels WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Channel not found' });
      return;
    }
    try {
      await testChannel(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
    }
  });

  router.get('/dashboards', requireAuth, async (req: AuthedRequest, res) => {
    const rows = await db.all('SELECT * FROM dashboards WHERE org_id = ? ORDER BY updated_at DESC', [req.user!.orgId]);
    res.json({
      success: true,
      dashboards: rows.map((row: Record<string, unknown>) => ({
        ...row,
        tags: parseJson(String(row.tags || '[]'), []),
        widgets: parseJson(String(row.widgets || '[]'), []),
        isPublic: Number(row.is_public) === 1,
      })),
    });
  });

  router.post('/dashboards', requireAuth, async (req: AuthedRequest, res) => {
    const { name, description, category, tags, widgets, layout, refreshInterval, isPublic } = req.body || {};
    if (!name) {
      res.status(400).json({ success: false, message: 'name is required' });
      return;
    }
    const id = randomId('dash');
    await db.run(
      `INSERT INTO dashboards (id, org_id, owner_id, name, description, category, tags, widgets, layout, refresh_interval, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user!.orgId, req.user!.id, name, description || '', category || 'custom', JSON.stringify(tags || []), JSON.stringify(widgets || []), layout || 'grid', Number(refreshInterval || 30), isPublic ? 1 : 0, nowIso(), nowIso()]
    );
    res.status(201).json({ success: true, id });
  });

  router.put('/dashboards/:id', requireAuth, async (req: AuthedRequest, res) => {
    const existing = await db.get<Record<string, unknown>>('SELECT * FROM dashboards WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }
    const body = req.body || {};
    await db.run(
      `UPDATE dashboards SET name = ?, description = ?, category = ?, tags = ?, widgets = ?, layout = ?, refresh_interval = ?, is_public = ?, updated_at = ? WHERE id = ?`,
      [
        body.name ?? existing.name,
        body.description ?? existing.description,
        body.category ?? existing.category,
        JSON.stringify(body.tags ?? parseJson(String(existing.tags), [])),
        JSON.stringify(body.widgets ?? parseJson(String(existing.widgets), [])),
        body.layout ?? existing.layout,
        Number(body.refreshInterval ?? existing.refresh_interval),
        body.isPublic ? 1 : Number(existing.is_public),
        nowIso(),
        req.params.id,
      ]
    );
    res.json({ success: true });
  });

  router.delete('/dashboards/:id', requireAuth, async (req: AuthedRequest, res) => {
    await db.run('DELETE FROM dashboards WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.get('/dashboards/:id/export', requireAuth, async (req: AuthedRequest, res) => {
    const row = await db.get<Record<string, unknown>>('SELECT * FROM dashboards WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    if (!row) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }
    res.json({
      success: true,
      dashboard: {
        ...row,
        tags: parseJson(String(row.tags || '[]'), []),
        widgets: parseJson(String(row.widgets || '[]'), []),
      },
    });
  });

  router.post('/dashboards/import', requireAuth, async (req: AuthedRequest, res) => {
    const dashboard = req.body?.dashboard || req.body;
    if (!dashboard?.name) {
      res.status(400).json({ success: false, message: 'dashboard.name is required' });
      return;
    }
    const id = randomId('dash');
    await db.run(
      `INSERT INTO dashboards (id, org_id, owner_id, name, description, category, tags, widgets, layout, refresh_interval, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, req.user!.orgId, req.user!.id, dashboard.name, dashboard.description || '', dashboard.category || 'custom', JSON.stringify(dashboard.tags || []), JSON.stringify(dashboard.widgets || []), dashboard.layout || 'grid', Number(dashboard.refreshInterval || 30), nowIso(), nowIso()]
    );
    res.status(201).json({ success: true, id });
  });

  router.get('/integrations', requireAuth, requirePermission('settings:read'), async (req: AuthedRequest, res) => {
    const rows = await db.all<Record<string, unknown>>('SELECT id, org_id, type, name, status, last_sync, error FROM integrations WHERE org_id = ?', [req.user!.orgId]);
    res.json({ success: true, integrations: rows });
  });

  router.post('/integrations', requireAuth, requirePermission('settings:write'), async (req: AuthedRequest, res) => {
    const { type, name, config: integrationConfig, id: existingId } = req.body || {};
    if (!type || !name) {
      res.status(400).json({ success: false, message: 'type and name are required' });
      return;
    }
    const encrypted = encryptJson(normalizeIntegrationConfig(String(type), integrationConfig || {}));
    if (existingId) {
      const existing = await db.get<{ id: string }>('SELECT id FROM integrations WHERE id = ? AND org_id = ?', [existingId, req.user!.orgId]);
      if (!existing) {
        res.status(404).json({ success: false, message: 'Integration not found' });
        return;
      }
      await db.run('UPDATE integrations SET name = ?, config_encrypted = ?, status = ?, last_sync = ?, error = NULL WHERE id = ?', [
        name, encrypted, 'disconnected', nowIso(), existing.id,
      ]);
      await audit(req.user!.orgId, req.user!.id, 'integration_saved', `Updated ${type} integration`, req, { type, name });
      res.json({ success: true, id: existing.id, updated: true });
      return;
    }
    const id = randomId('int');
    await db.run(
      'INSERT INTO integrations (id, org_id, type, name, status, config_encrypted, last_sync, error) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)',
      [id, req.user!.orgId, type, name, 'disconnected', encrypted, nowIso()]
    );
    await audit(req.user!.orgId, req.user!.id, 'integration_saved', `Saved ${type} integration`, req, { type, name });
    res.status(201).json({ success: true, id, updated: false });
  });

  router.delete('/integrations/:id', requireAuth, requirePermission('settings:write'), async (req: AuthedRequest, res) => {
    await db.run('DELETE FROM integrations WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.post('/databases/test', requireAuth, requirePermission('settings:write'), async (req: AuthedRequest, res) => {
    const result = await probeDatabase(req.body || {});
    res.status(result.ok ? 200 : 400).json({ success: result.ok, message: result.message, latencyMs: result.latencyMs });
  });

  router.put('/channels/:id', requireAuth, requirePermission('alerts:write'), async (req: AuthedRequest, res) => {
    const existing = await db.get('SELECT id FROM notification_channels WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Channel not found' });
      return;
    }
    const { type, name, config: channelConfig, isEnabled } = req.body || {};
    await db.run(
      'UPDATE notification_channels SET type = COALESCE(?, type), name = COALESCE(?, name), config_encrypted = COALESCE(?, config_encrypted), is_enabled = COALESCE(?, is_enabled) WHERE id = ?',
      [
        type || null,
        name || null,
        channelConfig ? encryptJson(channelConfig) : null,
        typeof isEnabled === 'boolean' ? (isEnabled ? 1 : 0) : null,
        req.params.id,
      ]
    );
    res.json({ success: true });
  });

  router.delete('/channels/:id', requireAuth, requirePermission('alerts:write'), async (req: AuthedRequest, res) => {
    await db.run('DELETE FROM notification_channels WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.post('/backups', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const backup = await createBackup(req.user!.orgId, String(req.body?.note || ''));
      res.status(201).json({ success: true, id: backup.id, createdAt: backup.createdAt, sizeBytes: backup.sizeBytes, kind: backup.kind, note: backup.note });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Backup failed' });
    }
  });

  router.post('/backups/:id/restore', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    try {
      const backup = await restoreBackup(req.user!.orgId, req.params.id);
      res.json({ success: true, id: backup.id, restoredAt: nowIso() });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Restore failed' });
    }
  });

  router.get('/backups', requireAuth, requirePermission('settings:read'), async (req: AuthedRequest, res) => {
    const rows = await db.all<Record<string, unknown>>(
      'SELECT id, org_id, connection_id, created_at, note, size_bytes, kind FROM db_backups WHERE org_id = ? ORDER BY created_at DESC',
      [req.user!.orgId]
    );
    res.json({ success: true, backups: rows });
  });

  router.post('/integrations/:id/test', requireAuth, requirePermission('settings:write'), async (req: AuthedRequest, res) => {
    try {
      const metrics = await collectAllMetrics(req.user!.orgId);
      await persistMetrics(metrics, req.user!.orgId);
      const row = await db.get('SELECT status, error FROM integrations WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
      res.json({ success: true, integration: row, collected: metrics.length });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
    }
  });

  router.get('/settings', requireAuth, requirePermission('settings:read'), async (req: AuthedRequest, res) => {
    const row = await db.get<{ value_encrypted: string }>('SELECT value_encrypted FROM settings WHERE key = ? AND org_id = ?', ['system_config', req.user!.orgId]);
    res.json({
      success: true,
      settings: decryptJson(row?.value_encrypted, {}),
      ipAllowlist: await db.all('SELECT id, cidr FROM ip_allowlist WHERE org_id = ?', [req.user!.orgId]),
    });
  });

  router.put('/settings', requireAuth, requirePermission('settings:write'), async (req: AuthedRequest, res) => {
    await upsertSetting(req.user!.orgId, 'system_config', req.body || {});
    res.json({ success: true });
  });

  router.post('/settings/ip-allowlist', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    const cidr = String(req.body?.cidr || '');
    if (!cidr) {
      res.status(400).json({ success: false, message: 'cidr is required' });
      return;
    }
    await db.run('INSERT INTO ip_allowlist (id, org_id, cidr) VALUES (?, ?, ?)', [randomId('ip'), req.user!.orgId, cidr]);
    res.status(201).json({ success: true });
  });

  router.delete('/settings/ip-allowlist/:id', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    await db.run('DELETE FROM ip_allowlist WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.get('/anomalies', requireAuth, requirePermission('monitoring:read'), async (req: AuthedRequest, res) => {
    const series = (await db.all<{ value: number; timestamp: string }>(
      `SELECT value, timestamp FROM metrics WHERE org_id = ? AND name = 'cpu_usage' ORDER BY timestamp DESC LIMIT 120`,
      [req.user!.orgId]
    )).slice().reverse();
    const points = detectValueAnomalies(series);
    const anomalies = points.filter((p) => p.isAnomaly).slice(-10).reverse();
    res.json({ success: true, anomalies, sampleSize: series.length });
  });

  router.post('/anomalies/logs', requireAuth, requirePermission('monitoring:read'), async (req: AuthedRequest, res) => {
    const logs = Array.isArray(req.body?.logs) ? req.body.logs.map(String) : [];
    res.json({ success: true, clusters: clusterLogs(logs) });
  });

  router.get('/reports/compliance', requireAuth, requirePermission('logs:read'), async (req: AuthedRequest, res) => {
    const logs = await db.all('SELECT timestamp, user_id, action, description, ip_address FROM audit_logs WHERE org_id = ? ORDER BY timestamp DESC LIMIT 500', [req.user!.orgId]);
    const format = String(req.query.format || 'json');
    if (format === 'csv') {
      const header = 'timestamp,user_id,action,description,ip_address';
      const lines = (logs as Array<Record<string, string>>).map((l) => [l.timestamp, l.user_id, l.action, JSON.stringify(l.description || ''), l.ip_address].join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.send([header, ...lines].join('\n'));
      return;
    }
    res.json({
      success: true,
      generatedAt: nowIso(),
      orgId: req.user!.orgId,
      encryption: 'AES-256-GCM',
      authentication: 'JWT HS256 + bcrypt',
      events: logs,
    });
  });

  router.post('/agents/keys', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    const name = String(req.body?.name || 'host-agent');
    const token = randomToken(24);
    await db.run('INSERT INTO agent_keys (id, org_id, name, key_hash, created_at) VALUES (?, ?, ?, ?, ?)', [randomId('agent'), req.user!.orgId, name, sha256(token), nowIso()]);
    res.status(201).json({ success: true, token, name });
  });

  router.post('/agents/ingest', async (req, res) => {
    const key = String(req.headers['x-agent-key'] || '');
    if (!key) {
      res.status(401).json({ success: false, message: 'Missing X-Agent-Key' });
      return;
    }
    const row = await db.get<{ id: string; org_id: string }>('SELECT id, org_id FROM agent_keys WHERE key_hash = ?', [sha256(key)]);
    if (!row) {
      res.status(401).json({ success: false, message: 'Invalid agent key' });
      return;
    }
    const incoming = Array.isArray(req.body?.metrics) ? req.body.metrics : [];
    const timestamp = nowIso();
    for (const metric of incoming) {
      if (!metric?.name || typeof metric.value !== 'number') continue;
      await db.run(
        'INSERT INTO metrics (org_id, name, value, unit, source, category, tags, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [row.org_id, String(metric.name), metric.value, metric.unit || '', metric.source || 'agent', metric.category || 'custom', JSON.stringify(metric.tags || {}), timestamp]
      );
    }
    await db.run('UPDATE agent_keys SET last_seen = ? WHERE id = ?', [timestamp, row.id]);
    res.json({ success: true, ingested: incoming.length });
  });

  router.get('/infra/status', requireAuth, requirePermission('monitoring:read'), async (req: AuthedRequest, res) => {
    const integrations = await db.all<Record<string, unknown>>('SELECT type, name, status, last_sync, error FROM integrations WHERE org_id = ?', [req.user!.orgId]);
    const host = await orgWantsHostMetrics(req.user!.orgId) ? collectHostMetrics() : [];
    res.json({
      success: true,
      host: overviewFromMetrics(host),
      hostMetrics: host,
      integrations,
      database: { type: db.kind, isConnected: true },
    });
  });

  router.get('/orgs/current', requireAuth, async (req: AuthedRequest, res) => {
    const org = await db.get('SELECT id, name, created_at FROM orgs WHERE id = ?', [req.user!.orgId]);
    res.json({ success: true, org });
  });

  router.post('/orgs', requireAuth, requireRole('admin'), async (req: AuthedRequest, res) => {
    const { name, adminUsername, adminPassword, adminEmail, adminFullName, collectHostMetrics } = req.body || {};
    if (!name || !adminUsername || !adminPassword || String(adminPassword).length < 8) {
      res.status(400).json({ success: false, message: 'name, adminUsername, and adminPassword (8+ characters) are required' });
      return;
    }
    try {
      const provisioned = await provisionOrg({
        orgName: String(name),
        adminUsername: String(adminUsername),
        adminPassword: String(adminPassword),
        adminEmail,
        adminFullName,
        collectHostMetrics: collectHostMetrics === true,
      });
      await audit(provisioned.orgId, provisioned.userId, 'org_created', `Created organization ${name}`, req as AuthedRequest);
      const sessionId = randomId('session');
      const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
      await db.run(
        'INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, last_activity) VALUES (?, ?, ?, ?, 1, ?)',
        [sessionId, provisioned.userId, nowIso(), expires, nowIso()]
      );
      res.status(201).json({
        success: true,
        orgId: provisioned.orgId,
        token: signToken({ id: provisioned.userId, username: String(adminUsername), role: 'admin', orgId: provisioned.orgId }, sessionId, false),
        user: publicUser(await db.get('SELECT * FROM users WHERE id = ?', [provisioned.userId]) as Record<string, unknown>),
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create organization' });
    }
  });

  router.post('/auth/totp/setup', requireAuth, async (req: AuthedRequest, res) => {
    const secret = generateTotpSecret();
    await db.run('UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?', [secret, req.user!.id]);
    const user = await db.get<{ username: string }>('SELECT username FROM users WHERE id = ?', [req.user!.id]);
    res.json({ success: true, secret, otpauthUrl: totpOtpauthUrl(String(user?.username || req.user!.username), secret) });
  });

  router.post('/auth/totp/enable', requireAuth, async (req: AuthedRequest, res) => {
    const user = await db.get<{ totp_secret: string }>('SELECT totp_secret FROM users WHERE id = ?', [req.user!.id]);
    if (!user?.totp_secret || !verifyTotp(user.totp_secret, String(req.body?.code || req.body?.totp || ''))) {
      res.status(400).json({ success: false, message: 'Invalid TOTP code' });
      return;
    }
    await db.run('UPDATE users SET totp_enabled = 1 WHERE id = ?', [req.user!.id]);
    await audit(req.user!.orgId, req.user!.id, 'totp_enabled', 'TOTP enabled', req);
    res.json({ success: true });
  });

  router.post('/auth/totp/disable', requireAuth, async (req: AuthedRequest, res) => {
    const user = await db.get<{ password_hash: string; totp_secret: string; totp_enabled: number }>('SELECT password_hash, totp_secret, totp_enabled FROM users WHERE id = ?', [req.user!.id]);
    if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) {
      res.status(400).json({ success: false, message: 'Current password is required to disable TOTP' });
      return;
    }
    await db.run('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [req.user!.id]);
    await audit(req.user!.orgId, req.user!.id, 'totp_disabled', 'TOTP disabled', req);
    res.json({ success: true });
  });

  router.post('/users/invite', requireAuth, requirePermission('user:write'), async (req: AuthedRequest, res) => {
    const email = String(req.body?.email || '').trim();
    const role = ['admin', 'user', 'viewer'].includes(req.body?.role) ? req.body.role : 'user';
    if (!email) {
      res.status(400).json({ success: false, message: 'email is required' });
      return;
    }
    const token = randomToken(24);
    const id = randomId('invite');
    await db.run(
      'INSERT INTO invites (id, org_id, email, role, token_hash, invited_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user!.orgId, email, role, sha256(token), req.user!.id, new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), nowIso()]
    );
    await audit(req.user!.orgId, req.user!.id, 'user_invited', `Invited ${email}`, req);
    const origin = config.webOrigin.replace(/\/$/, '');
    const emailed = await sendSystemEmail(
      email,
      'Invitation to DevOps AI Sentinel',
      `You were invited to ${origin}. Role: ${role}. Use Login → Accept invite with this token:\n${token}`
    );
    res.status(201).json({
      success: true,
      id,
      message: emailed ? 'Invite email sent' : 'Invite saved; SMTP is not configured so email was not sent',
      ...(config.env !== 'production' || !emailed ? { token } : {}),
    });
  });

  router.post('/auth/accept-invite', async (req, res) => {
    const { token, username, password, fullName } = req.body || {};
    if (!token || !username || !password || String(password).length < 8) {
      res.status(400).json({ success: false, message: 'token, username, and password (8+ characters) are required' });
      return;
    }
    const invite = await db.get<Record<string, unknown>>(
      'SELECT * FROM invites WHERE token_hash = ? AND accepted_at IS NULL',
      [sha256(String(token))]
    );
    if (!invite || new Date(String(invite.expires_at)) < new Date()) {
      res.status(400).json({ success: false, message: 'Invite is invalid or expired' });
      return;
    }
    const exists = await db.get('SELECT id FROM users WHERE username = ? AND org_id = ?', [username, String(invite.org_id)]);
    if (exists) {
      res.status(409).json({ success: false, message: 'Username already exists in this organization' });
      return;
    }
    const userId = randomId('user');
    const assignedRole = String(invite.role);
    await db.run(
      `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      [userId, String(invite.org_id), String(username), String(invite.email), fullName || '', assignedRole, JSON.stringify(ROLE_PERMISSIONS[assignedRole] || ROLE_PERMISSIONS.user), await bcrypt.hash(String(password), 12), nowIso(), nowIso()]
    );
    await db.run('UPDATE invites SET accepted_at = ? WHERE id = ?', [nowIso(), String(invite.id)]);
    res.status(201).json({ success: true, id: userId });
  });

  router.post('/auth/forgot-password', async (req, res) => {
    const matches = await findLoginUsers(String(req.body?.username || req.body?.email || ''), String(req.body?.org || req.body?.orgId || ''));
    const user = matches[0];
    if (user) {
      const token = randomToken(24);
      await db.run(
        'INSERT INTO password_resets (id, user_id, org_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [randomId('reset'), String(user.id), String(user.org_id), sha256(token), new Date(Date.now() + 2 * 3600 * 1000).toISOString(), nowIso()]
      );
      const emailed = user?.email
        ? await sendSystemEmail(
          String(user.email),
          'Password reset',
          `Reset your DevOps AI Sentinel password with this token:\n${token}`
        )
        : false;
      if (config.env !== 'production') {
        res.json({ success: true, token, message: emailed ? 'Reset email sent' : 'Reset token issued; SMTP is not configured' });
        return;
      }
    }
    res.json({ success: true, message: 'If the account exists, a reset was created' });
  });

  router.post('/auth/reset-password', async (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password || String(password).length < 8) {
      res.status(400).json({ success: false, message: 'token and password (8+ characters) are required' });
      return;
    }
    const row = await db.get<Record<string, unknown>>(
      'SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL',
      [sha256(String(token))]
    );
    if (!row || new Date(String(row.expires_at)) < new Date()) {
      res.status(400).json({ success: false, message: 'Reset token is invalid or expired' });
      return;
    }
    await db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [await bcrypt.hash(String(password), 12), nowIso(), String(row.user_id)]);
    await db.run('UPDATE password_resets SET used_at = ? WHERE id = ?', [nowIso(), String(row.id)]);
    res.json({ success: true });
  });

  router.get('/auth/oidc/start', async (req, res) => {
    if (!config.oidc.issuer || !config.oidc.clientId) {
      res.status(501).json({ success: false, message: 'OIDC is not configured' });
      return;
    }
    const discovery = await fetch(`${config.oidc.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
    if (!discovery.ok) {
      res.status(502).json({ success: false, message: 'OIDC discovery failed' });
      return;
    }
    const meta = await discovery.json() as { authorization_endpoint?: string };
    if (!meta.authorization_endpoint) {
      res.status(502).json({ success: false, message: 'OIDC authorization_endpoint missing' });
      return;
    }
    const state = randomToken(16);
    await db.run('INSERT INTO oauth_states (state, created_at, org_id, purpose) VALUES (?, ?, ?, ?)', [state, nowIso(), String(req.query.org || ''), 'oidc']);
    const url = new URL(meta.authorization_endpoint);
    url.searchParams.set('client_id', config.oidc.clientId);
    url.searchParams.set('redirect_uri', config.oidc.redirectUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.oidc.scope);
    url.searchParams.set('state', state);
    res.redirect(url.toString());
  });

  router.get('/auth/oidc/callback', async (req, res) => {
    const { code, state } = req.query;
    const saved = await db.get<{ org_id: string | null }>('SELECT org_id FROM oauth_states WHERE state = ?', [String(state || '')]);
    if (!saved || !code || !config.oidc.issuer) {
      res.status(400).send('Invalid OIDC state');
      return;
    }
    await db.run('DELETE FROM oauth_states WHERE state = ?', [String(state)]);
    const discovery = await fetch(`${config.oidc.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
    const meta = await discovery.json() as { token_endpoint?: string; userinfo_endpoint?: string };
    const tokenRes = await fetch(String(meta.token_endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: config.oidc.redirectUrl,
        client_id: config.oidc.clientId,
        client_secret: config.oidc.clientSecret,
      }),
    });
    const tokenJson = await tokenRes.json() as { access_token?: string };
    if (!tokenJson.access_token) {
      res.status(401).send('OIDC token exchange failed');
      return;
    }
    const profileRes = await fetch(String(meta.userinfo_endpoint), { headers: { Authorization: `Bearer ${tokenJson.access_token}` } });
    const profile = await profileRes.json() as { email?: string; preferred_username?: string; name?: string; sub?: string };
    const username = profile.preferred_username || profile.email || profile.sub || '';
    const org = saved.org_id
      ? await db.get<{ id: string }>('SELECT id FROM orgs WHERE id = ?', [saved.org_id])
      : await db.get<{ id: string }>('SELECT id FROM orgs LIMIT 1');
    if (!org || !username) {
      res.status(409).send('Complete organization setup before OIDC login');
      return;
    }
    let user = await db.get<Record<string, unknown>>('SELECT * FROM users WHERE username = ? AND org_id = ?', [username, org.id]);
    if (!user) {
      const userId = randomId('user');
      await db.run(
        `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'viewer', ?, ?, 1, 0, ?, ?)`,
        [userId, org.id, username, profile.email || '', profile.name || username, JSON.stringify(ROLE_PERMISSIONS.viewer), await bcrypt.hash(randomToken(), 12), nowIso(), nowIso()]
      );
      user = await db.get<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [userId]);
    }
    const sessionId = randomId('session');
    const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
    await db.run('INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, last_activity) VALUES (?, ?, ?, ?, 1, ?)', [sessionId, String(user!.id), nowIso(), expires, nowIso()]);
    const jwtToken = signToken({ id: String(user!.id), username: String(user!.username), role: String(user!.role), orgId: String(user!.org_id) }, sessionId, false);
    res.redirect(`${config.webOrigin}/login?sso=${encodeURIComponent(jwtToken)}`);
  });

  router.get('/auth/saml/login', async (req, res) => {
    if (!config.saml.idpSsoUrl) {
      res.status(501).json({ success: false, message: 'SAML is not configured. Set SAML_IDP_SSO_URL or use OIDC.' });
      return;
    }
    const state = randomToken(16);
    await db.run('INSERT INTO oauth_states (state, created_at, org_id, purpose) VALUES (?, ?, ?, ?)', [state, nowIso(), String(req.query.org || ''), 'saml']);
    const url = new URL(config.saml.idpSsoUrl);
    url.searchParams.set('RelayState', state);
    res.redirect(url.toString());
  });

  router.post('/auth/saml/acs', express.urlencoded({ extended: false }), async (req, res) => {
    if (!config.saml.idpSsoUrl) {
      res.status(501).send('SAML is not configured');
      return;
    }
    const relay = String(req.body?.RelayState || '');
    const saved = await db.get<{ org_id: string | null }>('SELECT org_id FROM oauth_states WHERE state = ?', [relay]);
    const encoded = String(req.body?.SAMLResponse || '');
    if (!saved || !encoded) {
      res.status(400).send('Invalid SAML response');
      return;
    }
    await db.run('DELETE FROM oauth_states WHERE state = ?', [relay]);
    let xml = '';
    try {
      xml = Buffer.from(encoded, 'base64').toString('utf8');
    } catch {
      res.status(400).send('Invalid SAMLResponse encoding');
      return;
    }
    if (config.saml.idpCert && !xml.includes('Signature')) {
      res.status(401).send('Signed SAML assertions are required');
      return;
    }
    const nameId = xml.match(/<(?:[\w]+:)?NameID[^>]*>([^<]+)<\/(?:[\w]+:)?NameID>/)?.[1];
    if (!nameId) {
      res.status(401).send('SAML NameID missing');
      return;
    }
    const org = saved.org_id
      ? await db.get<{ id: string }>('SELECT id FROM orgs WHERE id = ?', [saved.org_id])
      : await db.get<{ id: string }>('SELECT id FROM orgs LIMIT 1');
    if (!org) {
      res.status(409).send('Complete organization setup before SAML login');
      return;
    }
    let user = await db.get<Record<string, unknown>>('SELECT * FROM users WHERE username = ? AND org_id = ?', [nameId, org.id]);
    if (!user) {
      const userId = randomId('user');
      await db.run(
        `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'viewer', ?, ?, 1, 0, ?, ?)`,
        [userId, org.id, nameId, nameId, nameId, JSON.stringify(ROLE_PERMISSIONS.viewer), await bcrypt.hash(randomToken(), 12), nowIso(), nowIso()]
      );
      user = await db.get<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [userId]);
    }
    const sessionId = randomId('session');
    const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
    await db.run('INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, last_activity) VALUES (?, ?, ?, ?, 1, ?)', [sessionId, String(user!.id), nowIso(), expires, nowIso()]);
    const jwtToken = signToken({ id: String(user!.id), username: String(user!.username), role: String(user!.role), orgId: String(user!.org_id) }, sessionId, false);
    res.redirect(`${config.webOrigin}/login?sso=${encodeURIComponent(jwtToken)}`);
  });

  return router;
}

async function summarizeServices(orgId: string) {
  const db = getDb();
  const integrations = await db.all<{ type: string; status: string; last_sync: string | null; error: string | null }>(
    'SELECT type, status, last_sync, error FROM integrations WHERE org_id = ?',
    [orgId]
  );
  const host = { name: 'sentinel-api', status: 'healthy' as const, uptime: `${Math.floor(process.uptime())}s`, responseTime: 'local', errorRate: '0%', lastIncident: nowIso() };
  const rest = integrations.map((i) => ({
    name: i.type,
    status: i.status === 'connected' ? 'healthy' : 'degraded',
    uptime: i.status === 'connected' ? 'connected' : 'n/a',
    responseTime: i.last_sync || 'never',
    errorRate: i.error ? 'error' : '0%',
    lastIncident: i.error || i.last_sync || nowIso(),
  }));
  return [host, ...rest];
}
