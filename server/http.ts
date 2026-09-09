import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.ts';
import { getDb, nowIso, parseJson } from './db.ts';
import { encryptJson, decryptJson, randomId, sha256, randomToken } from './crypto.ts';
import { requireAuth, requirePermission, requireRole, clientMeta, type AuthedRequest } from './middleware.ts';
import { collectAllMetrics, persistMetrics, overviewFromMetrics, collectHostMetrics } from './collectors.ts';
import { evaluateAlerts, seedDefaultRules, testChannel } from './alerting.ts';
import { clusterLogs, detectValueAnomalies } from './anomaly.ts';

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
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    permissions: parseJson(String(row.permissions || '[]'), [] as string[]),
    isActive: Number(row.is_active) === 1,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    orgId: row.org_id,
  };
}

function audit(orgId: string | null, userId: string, action: string, description: string, req?: AuthedRequest, details?: unknown): void {
  const meta = req ? clientMeta(req) : { ip: 'system', userAgent: 'system' };
  getDb().run(
    'INSERT INTO audit_logs (id, org_id, user_id, action, description, details, ip_address, user_agent, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [randomId('log'), orgId, userId, action, description, details ? JSON.stringify(details) : null, meta.ip, meta.userAgent, nowIso()]
  );
}

export function createRouter(): express.Router {
  const router = express.Router();
  const db = getDb();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: db.kind,
      time: nowIso(),
      uptime: process.uptime(),
    });
  });

  router.get('/setup/status', (_req, res) => {
    const count = db.get<{ c: number }>('SELECT COUNT(*) as c FROM users');
    res.json({ needsSetup: (count?.c || 0) === 0 });
  });

  router.post('/setup', async (req, res) => {
    const count = db.get<{ c: number }>('SELECT COUNT(*) as c FROM users');
    if ((count?.c || 0) > 0) {
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
    const orgId = randomId('org');
    const userId = randomId('user');
    const passwordHash = await bcrypt.hash(String(adminPassword), 12);
    db.run('INSERT INTO orgs (id, name, created_at) VALUES (?, ?, ?)', [orgId, companyName || systemName || 'Default Org', nowIso()]);
    db.run(
      `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'admin', ?, ?, 1, 0, ?, ?)`,
      [userId, orgId, String(adminUsername), adminEmail || 'admin@localhost', adminFullName || 'Administrator', JSON.stringify(ROLE_PERMISSIONS.admin), passwordHash, nowIso(), nowIso()]
    );
    db.run('INSERT INTO settings (key, org_id, value_encrypted) VALUES (?, ?, ?)', [
      'system_config',
      orgId,
      encryptJson({ systemName: systemName || 'DevOps AI Sentinel', companyName: companyName || '', setupDate: nowIso() }),
    ]);
    seedDefaultRules(orgId);
    audit(orgId, userId, 'system_setup', 'Initial administrator created', req as AuthedRequest);
    const sessionId = randomId('session');
    const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
    const meta = clientMeta(req);
    db.run(
      'INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, ip_address, user_agent, last_activity) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      [sessionId, userId, nowIso(), expires, meta.ip, meta.userAgent, nowIso()]
    );
    const user = { id: userId, username: String(adminUsername), role: 'admin', orgId };
    res.json({
      success: true,
      token: signToken(user, sessionId, false),
      user: publicUser(db.get('SELECT * FROM users WHERE id = ?', [userId]) as Record<string, unknown>),
    });
  });

  router.post('/auth/login', async (req, res) => {
    const { username, password, rememberMe } = req.body || {};
    const user = db.get<Record<string, unknown>>('SELECT * FROM users WHERE username = ?', [String(username || '')]);
    if (!user) {
      audit(null, 'system', 'login_failed', `Unknown user ${username}`, req as AuthedRequest);
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
      db.run('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockedUntil, String(user.id)]);
      audit(String(user.org_id), String(user.id), 'login_failed', 'Invalid password', req as AuthedRequest);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    db.run('UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = ? WHERE id = ?', [nowIso(), String(user.id)]);
    const sessionId = randomId('session');
    const hours = rememberMe ? config.rememberMeDays * 24 : config.sessionHours;
    const expires = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const meta = clientMeta(req);
    db.run(
      'INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, ip_address, user_agent, last_activity) VALUES (?, ?, ?, ?, 1, ?, ?, ?)',
      [sessionId, String(user.id), nowIso(), expires, meta.ip, meta.userAgent, nowIso()]
    );
    audit(String(user.org_id), String(user.id), 'user_login', 'User logged in', req as AuthedRequest);
    res.json({
      success: true,
      token: signToken({ id: String(user.id), username: String(user.username), role: String(user.role), orgId: String(user.org_id) }, sessionId, Boolean(rememberMe)),
      user: publicUser(user),
    });
  });

  router.post('/auth/logout', requireAuth, (req: AuthedRequest, res) => {
    db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [req.user!.sessionId]);
    audit(req.user!.orgId, req.user!.id, 'user_logout', 'User logged out', req);
    res.json({ success: true });
  });

  router.get('/auth/me', requireAuth, (req: AuthedRequest, res) => {
    const user = db.get<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [req.user!.id]);
    res.json({ success: true, user: user ? publicUser(user) : null });
  });

  router.post('/auth/refresh', requireAuth, (req: AuthedRequest, res) => {
    const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
    db.run('UPDATE sessions SET expires_at = ?, last_activity = ? WHERE id = ?', [expires, nowIso(), req.user!.sessionId]);
    res.json({
      success: true,
      token: signToken({ id: req.user!.id, username: req.user!.username, role: req.user!.role, orgId: req.user!.orgId }, req.user!.sessionId, false),
    });
  });

  router.get('/auth/github', (_req, res) => {
    if (!config.githubOauth.clientId) {
      res.status(501).json({ success: false, message: 'GitHub OAuth is not configured' });
      return;
    }
    const state = randomToken(16);
    db.run('INSERT INTO oauth_states (state, created_at) VALUES (?, ?)', [state, nowIso()]);
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', config.githubOauth.clientId);
    url.searchParams.set('redirect_uri', config.githubOauth.callbackUrl);
    url.searchParams.set('scope', 'read:user user:email');
    url.searchParams.set('state', state);
    res.redirect(url.toString());
  });

  router.get('/auth/github/callback', async (req, res) => {
    const { code, state } = req.query;
    const saved = db.get('SELECT state FROM oauth_states WHERE state = ?', [String(state || '')]);
    if (!saved || !code) {
      res.status(400).send('Invalid OAuth state');
      return;
    }
    db.run('DELETE FROM oauth_states WHERE state = ?', [String(state)]);
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
    let user = db.get<Record<string, unknown>>('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      const org = db.get<{ id: string }>('SELECT id FROM orgs LIMIT 1');
      if (!org) {
        res.status(409).send('Complete first-time setup before SSO login');
        return;
      }
      const userId = randomId('user');
      const randomPassword = await bcrypt.hash(randomToken(), 12);
      db.run(
        `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'viewer', ?, ?, 1, 0, ?, ?)`,
        [userId, org.id, username, profile.email || `${username}@users.noreply.github.com`, profile.name || username, JSON.stringify(ROLE_PERMISSIONS.viewer), randomPassword, nowIso(), nowIso()]
      );
      user = db.get<Record<string, unknown>>('SELECT * FROM users WHERE id = ?', [userId])!;
    }
    const sessionId = randomId('session');
    const expires = new Date(Date.now() + config.sessionHours * 3600 * 1000).toISOString();
    db.run(
      'INSERT INTO sessions (id, user_id, created_at, expires_at, is_active, last_activity) VALUES (?, ?, ?, ?, 1, ?)',
      [sessionId, String(user.id), nowIso(), expires, nowIso()]
    );
    const jwtToken = signToken({ id: String(user.id), username: String(user.username), role: String(user.role), orgId: String(user.org_id) }, sessionId, false);
    res.redirect(`${config.webOrigin}/login?sso=${encodeURIComponent(jwtToken)}`);
  });

  router.get('/users', requireAuth, requirePermission('user:read'), (req: AuthedRequest, res) => {
    const users = db.all<Record<string, unknown>>('SELECT * FROM users WHERE org_id = ?', [req.user!.orgId]).map(publicUser);
    res.json({ success: true, users });
  });

  router.post('/users', requireAuth, requirePermission('user:write'), async (req: AuthedRequest, res) => {
    const { username, email, fullName, role, password, permissions } = req.body || {};
    if (!username || !password || String(password).length < 8) {
      res.status(400).json({ success: false, message: 'Username and password (8+ characters) are required' });
      return;
    }
    const exists = db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (exists) {
      res.status(409).json({ success: false, message: 'Username already exists' });
      return;
    }
    const id = randomId('user');
    const assignedRole = ['admin', 'user', 'viewer'].includes(role) ? role : 'user';
    const perms = Array.isArray(permissions) && permissions.length ? permissions : ROLE_PERMISSIONS[assignedRole];
    db.run(
      `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
      [id, req.user!.orgId, username, email || '', fullName || '', assignedRole, JSON.stringify(perms), await bcrypt.hash(String(password), 12), nowIso(), nowIso()]
    );
    audit(req.user!.orgId, req.user!.id, 'user_created', `Created user ${username}`, req);
    res.status(201).json({ success: true, id });
  });

  router.put('/users/:id', requireAuth, requirePermission('user:write'), async (req: AuthedRequest, res) => {
    const user = db.get<Record<string, unknown>>('SELECT * FROM users WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
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
    db.run(
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

  router.delete('/users/:id', requireAuth, requirePermission('user:delete'), (req: AuthedRequest, res) => {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ success: false, message: 'Cannot delete your own account' });
      return;
    }
    db.run('DELETE FROM users WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    audit(req.user!.orgId, req.user!.id, 'user_deleted', `Deleted user ${req.params.id}`, req);
    res.json({ success: true });
  });

  router.post('/users/me/password', requireAuth, async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const user = db.get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
    if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.password_hash))) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }
    if (!newPassword || String(newPassword).length < 8) {
      res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
      return;
    }
    db.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [await bcrypt.hash(String(newPassword), 12), nowIso(), req.user!.id]);
    audit(req.user!.orgId, req.user!.id, 'password_changed', 'Password changed', req);
    res.json({ success: true });
  });

  router.get('/audit', requireAuth, requirePermission('logs:read'), (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit || 200), 1000);
    const logs = db.all('SELECT * FROM audit_logs WHERE org_id = ? ORDER BY timestamp DESC LIMIT ?', [req.user!.orgId, limit]);
    res.json({ success: true, logs });
  });

  router.get('/metrics', requireAuth, requirePermission('monitoring:read'), (req: AuthedRequest, res) => {
    const hours = Math.min(Number(req.query.hours || 24), 168);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const name = req.query.name ? String(req.query.name) : null;
    const rows = name
      ? db.all('SELECT * FROM metrics WHERE org_id = ? AND name = ? AND timestamp >= ? ORDER BY timestamp ASC', [req.user!.orgId, name, since])
      : db.all('SELECT * FROM metrics WHERE org_id = ? AND timestamp >= ? ORDER BY timestamp ASC', [req.user!.orgId, since]);
    res.json({ success: true, metrics: rows });
  });

  router.get('/metrics/latest', requireAuth, requirePermission('monitoring:read'), (_req: AuthedRequest, res) => {
    const latest = collectHostMetrics();
    res.json({ success: true, metrics: latest, overview: overviewFromMetrics(latest) });
  });

  router.get('/metrics/overview', requireAuth, requirePermission('monitoring:read'), (req: AuthedRequest, res) => {
    const latest = db.all<{ name: string; value: number; source: string; unit: string; timestamp: string }>(
      `SELECT name, value, source, unit, timestamp FROM metrics WHERE org_id = ? AND id IN (
         SELECT MAX(id) FROM metrics WHERE org_id = ? GROUP BY name, source
       )`,
      [req.user!.orgId, req.user!.orgId]
    );
    const mapped = latest.map((m) => ({ ...m, tags: {}, category: 'performance' }));
    const overview = overviewFromMetrics(mapped as never);
    const services = summarizeServices(req.user!.orgId);
    res.json({ success: true, overview, latest, services });
  });

  router.post('/metrics/collect', requireAuth, requirePermission('monitoring:write'), async (req: AuthedRequest, res) => {
    const metrics = await collectAllMetrics(req.user!.orgId);
    persistMetrics(metrics, req.user!.orgId);
    const alerts = await evaluateAlerts(req.user!.orgId, metrics);
    res.json({ success: true, collected: metrics.length, alertsTriggered: alerts.length, metrics, overview: overviewFromMetrics(metrics) });
  });

  router.get('/alerts', requireAuth, requirePermission('alerts:read'), (req: AuthedRequest, res) => {
    const alerts = db.all('SELECT * FROM alerts WHERE org_id = ? ORDER BY timestamp DESC LIMIT 200', [req.user!.orgId]);
    res.json({ success: true, alerts });
  });

  router.post('/alerts/:id/ack', requireAuth, requirePermission('alerts:write'), (req: AuthedRequest, res) => {
    db.run("UPDATE alerts SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by = ? WHERE id = ? AND org_id = ?", [nowIso(), req.user!.id, req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.post('/alerts/:id/resolve', requireAuth, requirePermission('alerts:write'), (req: AuthedRequest, res) => {
    db.run("UPDATE alerts SET status = 'resolved', resolved_at = ?, resolved_by = ? WHERE id = ? AND org_id = ?", [nowIso(), req.user!.id, req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.get('/alert-rules', requireAuth, requirePermission('alerts:read'), (req: AuthedRequest, res) => {
    res.json({ success: true, rules: db.all('SELECT * FROM alert_rules WHERE org_id = ?', [req.user!.orgId]) });
  });

  router.post('/alert-rules', requireAuth, requirePermission('alerts:write'), (req: AuthedRequest, res) => {
    const { name, description, metric, operator, threshold, severity, durationSeconds, actions } = req.body || {};
    if (!name || !metric || !operator) {
      res.status(400).json({ success: false, message: 'name, metric, and operator are required' });
      return;
    }
    const id = randomId('rule');
    db.run(
      `INSERT INTO alert_rules (id, org_id, name, description, metric, operator, threshold, duration_seconds, severity, enabled, actions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, req.user!.orgId, name, description || '', metric, operator, Number(threshold), Number(durationSeconds || 0), severity || 'warning', JSON.stringify(actions || {}), nowIso()]
    );
    res.status(201).json({ success: true, id });
  });

  router.get('/channels', requireAuth, requirePermission('alerts:read'), (req: AuthedRequest, res) => {
    const rows = db.all<Record<string, unknown>>('SELECT id, org_id, type, name, is_enabled, is_default, created_at FROM notification_channels WHERE org_id = ?', [req.user!.orgId]);
    res.json({ success: true, channels: rows });
  });

  router.post('/channels', requireAuth, requirePermission('alerts:write'), (req: AuthedRequest, res) => {
    const { type, name, config: channelConfig, isEnabled } = req.body || {};
    if (!type || !name) {
      res.status(400).json({ success: false, message: 'type and name are required' });
      return;
    }
    const id = randomId('channel');
    db.run(
      'INSERT INTO notification_channels (id, org_id, type, name, config_encrypted, is_enabled, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
      [id, req.user!.orgId, type, name, encryptJson(channelConfig || {}), isEnabled === false ? 0 : 1, nowIso()]
    );
    res.status(201).json({ success: true, id });
  });

  router.post('/channels/:id/test', requireAuth, requirePermission('alerts:write'), async (req: AuthedRequest, res) => {
    try {
      await testChannel(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
    }
  });

  router.get('/dashboards', requireAuth, (req: AuthedRequest, res) => {
    const rows = db.all('SELECT * FROM dashboards WHERE org_id = ? ORDER BY updated_at DESC', [req.user!.orgId]);
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

  router.post('/dashboards', requireAuth, (req: AuthedRequest, res) => {
    const { name, description, category, tags, widgets, layout, refreshInterval, isPublic } = req.body || {};
    if (!name) {
      res.status(400).json({ success: false, message: 'name is required' });
      return;
    }
    const id = randomId('dash');
    db.run(
      `INSERT INTO dashboards (id, org_id, owner_id, name, description, category, tags, widgets, layout, refresh_interval, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user!.orgId, req.user!.id, name, description || '', category || 'custom', JSON.stringify(tags || []), JSON.stringify(widgets || []), layout || 'grid', Number(refreshInterval || 30), isPublic ? 1 : 0, nowIso(), nowIso()]
    );
    res.status(201).json({ success: true, id });
  });

  router.put('/dashboards/:id', requireAuth, (req: AuthedRequest, res) => {
    const existing = db.get<Record<string, unknown>>('SELECT * FROM dashboards WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }
    const body = req.body || {};
    db.run(
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

  router.delete('/dashboards/:id', requireAuth, (req: AuthedRequest, res) => {
    db.run('DELETE FROM dashboards WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
    res.json({ success: true });
  });

  router.get('/dashboards/:id/export', requireAuth, (req: AuthedRequest, res) => {
    const row = db.get<Record<string, unknown>>('SELECT * FROM dashboards WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
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

  router.post('/dashboards/import', requireAuth, (req: AuthedRequest, res) => {
    const dashboard = req.body?.dashboard || req.body;
    if (!dashboard?.name) {
      res.status(400).json({ success: false, message: 'dashboard.name is required' });
      return;
    }
    const id = randomId('dash');
    db.run(
      `INSERT INTO dashboards (id, org_id, owner_id, name, description, category, tags, widgets, layout, refresh_interval, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, req.user!.orgId, req.user!.id, dashboard.name, dashboard.description || '', dashboard.category || 'custom', JSON.stringify(dashboard.tags || []), JSON.stringify(dashboard.widgets || []), dashboard.layout || 'grid', Number(dashboard.refreshInterval || 30), nowIso(), nowIso()]
    );
    res.status(201).json({ success: true, id });
  });

  router.get('/integrations', requireAuth, requirePermission('settings:read'), (req: AuthedRequest, res) => {
    const rows = db.all<Record<string, unknown>>('SELECT id, org_id, type, name, status, last_sync, error FROM integrations WHERE org_id = ?', [req.user!.orgId]);
    res.json({ success: true, integrations: rows });
  });

  router.post('/integrations', requireAuth, requirePermission('settings:write'), (req: AuthedRequest, res) => {
    const { type, name, config: integrationConfig } = req.body || {};
    if (!type || !name) {
      res.status(400).json({ success: false, message: 'type and name are required' });
      return;
    }
    const id = randomId('int');
    db.run(
      'INSERT INTO integrations (id, org_id, type, name, status, config_encrypted, last_sync, error) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)',
      [id, req.user!.orgId, type, name, 'disconnected', encryptJson(integrationConfig || {}), nowIso()]
    );
    audit(req.user!.orgId, req.user!.id, 'integration_saved', `Saved ${type} integration`, req, { type, name });
    res.status(201).json({ success: true, id });
  });

  router.post('/integrations/:id/test', requireAuth, requirePermission('settings:write'), async (req: AuthedRequest, res) => {
    try {
      const metrics = await collectAllMetrics(req.user!.orgId);
      persistMetrics(metrics, req.user!.orgId);
      const row = db.get('SELECT status, error FROM integrations WHERE id = ? AND org_id = ?', [req.params.id, req.user!.orgId]);
      res.json({ success: true, integration: row, collected: metrics.length });
    } catch (error) {
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
    }
  });

  router.get('/settings', requireAuth, requirePermission('settings:read'), (req: AuthedRequest, res) => {
    const row = db.get<{ value_encrypted: string }>('SELECT value_encrypted FROM settings WHERE key = ? AND org_id = ?', ['system_config', req.user!.orgId]);
    res.json({
      success: true,
      settings: decryptJson(row?.value_encrypted, {}),
      ipAllowlist: db.all('SELECT id, cidr FROM ip_allowlist WHERE org_id = ?', [req.user!.orgId]),
    });
  });

  router.put('/settings', requireAuth, requirePermission('settings:write'), (req: AuthedRequest, res) => {
    db.run('INSERT INTO settings (key, org_id, value_encrypted) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_encrypted = excluded.value_encrypted', [
      'system_config',
      req.user!.orgId,
      encryptJson(req.body || {}),
    ]);
    res.json({ success: true });
  });

  router.post('/settings/ip-allowlist', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const cidr = String(req.body?.cidr || '');
    if (!cidr) {
      res.status(400).json({ success: false, message: 'cidr is required' });
      return;
    }
    db.run('INSERT INTO ip_allowlist (id, org_id, cidr) VALUES (?, ?, ?)', [randomId('ip'), req.user!.orgId, cidr]);
    res.status(201).json({ success: true });
  });

  router.get('/anomalies', requireAuth, requirePermission('monitoring:read'), (req: AuthedRequest, res) => {
    const series = db.all<{ value: number; timestamp: string }>(
      `SELECT value, timestamp FROM metrics WHERE org_id = ? AND name = 'cpu_usage' ORDER BY timestamp DESC LIMIT 120`,
      [req.user!.orgId]
    ).reverse();
    const points = detectValueAnomalies(series);
    const anomalies = points.filter((p) => p.isAnomaly).slice(-10).reverse();
    res.json({ success: true, anomalies, sampleSize: series.length });
  });

  router.post('/anomalies/logs', requireAuth, requirePermission('monitoring:read'), (req: AuthedRequest, res) => {
    const logs = Array.isArray(req.body?.logs) ? req.body.logs.map(String) : [];
    res.json({ success: true, clusters: clusterLogs(logs) });
  });

  router.get('/reports/compliance', requireAuth, requirePermission('logs:read'), (req: AuthedRequest, res) => {
    const logs = db.all('SELECT timestamp, user_id, action, description, ip_address FROM audit_logs WHERE org_id = ? ORDER BY timestamp DESC LIMIT 500', [req.user!.orgId]);
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

  router.post('/agents/keys', requireAuth, requireRole('admin'), (req: AuthedRequest, res) => {
    const name = String(req.body?.name || 'host-agent');
    const token = randomToken(24);
    db.run('INSERT INTO agent_keys (id, org_id, name, key_hash, created_at) VALUES (?, ?, ?, ?, ?)', [randomId('agent'), req.user!.orgId, name, sha256(token), nowIso()]);
    res.status(201).json({ success: true, token, name });
  });

  router.post('/agents/ingest', (req, res) => {
    const key = String(req.headers['x-agent-key'] || '');
    if (!key) {
      res.status(401).json({ success: false, message: 'Missing X-Agent-Key' });
      return;
    }
    const row = db.get<{ id: string; org_id: string }>('SELECT id, org_id FROM agent_keys WHERE key_hash = ?', [sha256(key)]);
    if (!row) {
      res.status(401).json({ success: false, message: 'Invalid agent key' });
      return;
    }
    const incoming = Array.isArray(req.body?.metrics) ? req.body.metrics : [];
    const timestamp = nowIso();
    for (const metric of incoming) {
      if (!metric?.name || typeof metric.value !== 'number') continue;
      db.run(
        'INSERT INTO metrics (org_id, name, value, unit, source, category, tags, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [row.org_id, String(metric.name), metric.value, metric.unit || '', metric.source || 'agent', metric.category || 'custom', JSON.stringify(metric.tags || {}), timestamp]
      );
    }
    db.run('UPDATE agent_keys SET last_seen = ? WHERE id = ?', [timestamp, row.id]);
    res.json({ success: true, ingested: incoming.length });
  });

  router.get('/infra/status', requireAuth, requirePermission('monitoring:read'), (req: AuthedRequest, res) => {
    const integrations = db.all<Record<string, unknown>>('SELECT type, name, status, last_sync, error FROM integrations WHERE org_id = ?', [req.user!.orgId]);
    const host = collectHostMetrics();
    res.json({
      success: true,
      host: overviewFromMetrics(host),
      hostMetrics: host,
      integrations,
      database: { type: db.kind, isConnected: true },
    });
  });

  return router;
}

function summarizeServices(orgId: string) {
  const db = getDb();
  const integrations = db.all<{ type: string; status: string; last_sync: string | null; error: string | null }>(
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
