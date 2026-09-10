import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const tmp = path.join(os.tmpdir(), `sentinel-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test-jwt-secret-key-min-16';
process.env.ENCRYPTION_KEY = 'test-enc-secret-key-16';
process.env.SQLITE_PATH = tmp;
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.CORS_ORIGIN = 'http://127.0.0.1';

const { createApp } = await import('../server/index.ts');
const { totpCode } = await import('../server/totp.ts');

let server: Server;
let base = '';

before(async () => {
  const app = await createApp();
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  fs.rmSync(tmp, { force: true });
  fs.rmSync(`${tmp}-wal`, { force: true });
  fs.rmSync(`${tmp}-shm`, { force: true });
});

async function json(pathName: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${pathName}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json();
  return { status: res.status, body };
}

test('health endpoint does not require auth', async () => {
  const { status, body } = await json('/api/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
});

test('setup, login, metrics, and rbac', async () => {
  const setupStatus = await json('/api/setup/status');
  assert.equal(setupStatus.body.needsSetup, true);

  const setup = await json('/api/setup', {
    method: 'POST',
    body: JSON.stringify({
      adminUsername: 'admin',
      adminPassword: 'super-secret-pass',
      adminEmail: 'admin@example.com',
      adminFullName: 'Admin',
      companyName: 'Acme',
    }),
  });
  assert.equal(setup.status, 200, JSON.stringify(setup.body));
  assert.equal(setup.body.success, true);
  const token = setup.body.token as string;
  assert.ok(token);

  const short = await json('/api/setup', {
    method: 'POST',
    body: JSON.stringify({ adminUsername: 'x', adminPassword: 'short' }),
  });
  assert.equal(short.status, 409);

  const login = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'super-secret-pass' }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.success, true);

  const bad = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'wrong-password' }),
  });
  assert.equal(bad.status, 401);

  const metrics = await json('/api/metrics/latest', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(metrics.status, 200);
  assert.ok(Array.isArray(metrics.body.metrics));
  assert.ok(metrics.body.metrics.some((m: { name: string }) => m.name === 'cpu_usage'));

  const unauth = await json('/api/metrics/latest');
  assert.equal(unauth.status, 401);

  const collect = await json('/api/metrics/collect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(collect.status, 200);
  assert.ok(collect.body.collected >= 1);

  const dash = await json('/api/dashboards', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Ops', widgets: [] }),
  });
  assert.equal(dash.status, 201);

  const listed = await json('/api/dashboards', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(listed.body.dashboards.length, 1);
});

test('integrations persist many of the same type, notification channels, and sqlite probe', async () => {
  const login = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'super-secret-pass' }),
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const token = login.body.token as string;
  const headers = { Authorization: `Bearer ${token}` };

  const first = await json('/api/integrations', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'prometheus', name: 'Prom', config: { url: 'http://127.0.0.1:9090' } }),
  });
  assert.ok(first.status === 201 || first.status === 200, JSON.stringify(first.body));
  const id = first.body.id as string;
  assert.ok(id);

  const second = await json('/api/integrations', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'prometheus', name: 'Prom-west', config: { url: 'http://127.0.0.1:9091' } }),
  });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  assert.notEqual(second.body.id, id);

  const listed = await json('/api/integrations', { headers });
  const prom = (listed.body.integrations || []).filter((row: { type: string }) => row.type === 'prometheus');
  assert.equal(prom.length, 2);

  const updated = await json('/api/integrations', {
    method: 'POST',
    headers,
    body: JSON.stringify({ id, type: 'prometheus', name: 'Prom-updated', config: { url: 'http://127.0.0.1:9092' } }),
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.id, id);
  assert.equal(updated.body.updated, true);

  const aws = await json('/api/integrations', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'aws',
      name: 'AWS',
      config: { aws_access_key_id: 'AKIATEST', aws_secret_access_key: 'secret', aws_region: 'us-east-1' },
    }),
  });
  assert.ok(aws.status === 200 || aws.status === 201, JSON.stringify(aws.body));

  const probeOk = await json('/api/databases/test', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'sqlite' }),
  });
  assert.equal(probeOk.status, 200, JSON.stringify(probeOk.body));
  assert.equal(probeOk.body.success, true);

  const probeBad = await json('/api/databases/test', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'oracle' }),
  });
  assert.equal(probeBad.status, 400);

  const channel = await json('/api/channels', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'webhook', name: 'Hook', config: { url: 'http://127.0.0.1/hook' }, isEnabled: true }),
  });
  assert.equal(channel.status, 201, JSON.stringify(channel.body));
  const channelId = channel.body.id as string;

  const updated = await json(`/api/channels/${channelId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: 'Hook-2', config: { url: 'http://127.0.0.1/hook2' } }),
  });
  assert.equal(updated.status, 200);

  const channels = await json('/api/channels', { headers });
  const saved = (channels.body.channels || []).find((row: { id: string }) => row.id === channelId);
  assert.equal(saved.name, 'Hook-2');
  assert.equal(saved.config.url, 'http://127.0.0.1/hook2');

  const delChannel = await json(`/api/channels/${channelId}`, { method: 'DELETE', headers });
  assert.equal(delChannel.status, 200);

  const delInt = await json(`/api/integrations/${id}`, { method: 'DELETE', headers });
  assert.equal(delInt.status, 200);

  const backup = await json('/api/backups', {
    method: 'POST',
    headers,
    body: JSON.stringify({ connectionId: 'sqlite' }),
  });
  assert.equal(backup.status, 201, JSON.stringify(backup.body));
  assert.equal(backup.body.filePath, undefined);
});

test('orgs, TOTP, invite, reset, settings isolation, and sqlite restore', async () => {
  const firstLogin = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'super-secret-pass', org: 'Acme' }),
  });
  assert.equal(firstLogin.status, 200, JSON.stringify(firstLogin.body));
  const tokenA = firstLogin.body.token as string;
  const headersA = { Authorization: `Bearer ${tokenA}` };

  const settingsA = await json('/api/settings', {
    method: 'PUT',
    headers: headersA,
    body: JSON.stringify({ companyName: 'Acme', marker: 'before-backup', collectHostMetrics: true }),
  });
  assert.equal(settingsA.status, 200, JSON.stringify(settingsA.body));

  const orgB = await json('/api/orgs', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Beta Corp',
      adminUsername: 'admin',
      adminPassword: 'beta-secret-pass',
      adminEmail: 'beta@example.com',
    }),
  });
  assert.equal(orgB.status, 201, JSON.stringify(orgB.body));
  const tokenB = orgB.body.token as string;
  const headersB = { Authorization: `Bearer ${tokenB}` };

  const ambiguous = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'super-secret-pass' }),
  });
  assert.equal(ambiguous.status, 400);
  assert.ok(Array.isArray(ambiguous.body.orgs));

  const scoped = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'super-secret-pass', org: 'Acme' }),
  });
  assert.equal(scoped.status, 200, JSON.stringify(scoped.body));

  const settingsB = await json('/api/settings', { headers: headersB });
  assert.notEqual(settingsB.body.settings?.marker, 'before-backup');

  await json('/api/settings', {
    method: 'PUT',
    headers: headersB,
    body: JSON.stringify({ companyName: 'Beta Corp', marker: 'beta-only' }),
  });
  const rereadA = await json('/api/settings', { headers: headersA });
  assert.equal(rereadA.body.settings?.marker, 'before-backup');

  const backup = await json('/api/backups', {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ note: 'pre-restore' }),
  });
  assert.equal(backup.status, 201, JSON.stringify(backup.body));
  assert.ok(backup.body.id);
  assert.equal(backup.body.filePath, undefined);

  await json('/api/settings', {
    method: 'PUT',
    headers: headersA,
    body: JSON.stringify({ companyName: 'Acme', marker: 'after-backup', collectHostMetrics: true }),
  });
  const restore = await json(`/api/backups/${backup.body.id}/restore`, { method: 'POST', headers: headersA });
  assert.equal(restore.status, 200, JSON.stringify(restore.body));
  const restored = await json('/api/settings', { headers: headersA });
  assert.equal(restored.body.settings?.marker, 'before-backup');

  const invite = await json('/api/users/invite', {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ email: 'ops@example.com', role: 'user' }),
  });
  assert.equal(invite.status, 201, JSON.stringify(invite.body));
  assert.ok(invite.body.token);

  const accepted = await json('/api/auth/accept-invite', {
    method: 'POST',
    body: JSON.stringify({ token: invite.body.token, username: 'ops', password: 'ops-secret-pass', fullName: 'Ops' }),
  });
  assert.equal(accepted.status, 201, JSON.stringify(accepted.body));

  const opsLogin = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ops', password: 'ops-secret-pass', org: 'Acme' }),
  });
  assert.equal(opsLogin.status, 200, JSON.stringify(opsLogin.body));
  const headersOps = { Authorization: `Bearer ${opsLogin.body.token}` };

  const setupTotp = await json('/api/auth/totp/setup', { method: 'POST', headers: headersOps });
  assert.equal(setupTotp.status, 200, JSON.stringify(setupTotp.body));
  const secret = setupTotp.body.secret as string;
  const enable = await json('/api/auth/totp/enable', {
    method: 'POST',
    headers: headersOps,
    body: JSON.stringify({ code: totpCode(secret) }),
  });
  assert.equal(enable.status, 200, JSON.stringify(enable.body));

  const totpRequired = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ops', password: 'ops-secret-pass', org: 'Acme' }),
  });
  assert.equal(totpRequired.status, 401);
  assert.equal(totpRequired.body.requiresTotp, true);

  const totpOk = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ops', password: 'ops-secret-pass', org: 'Acme', totp: totpCode(secret) }),
  });
  assert.equal(totpOk.status, 200, JSON.stringify(totpOk.body));

  const forgot = await json('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ username: 'ops', org: 'Acme' }),
  });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.body.token);

  const reset = await json('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: forgot.body.token, password: 'ops-reset-pass' }),
  });
  assert.equal(reset.status, 200, JSON.stringify(reset.body));

  const afterReset = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ops', password: 'ops-reset-pass', org: 'Acme', totp: totpCode(secret) }),
  });
  assert.equal(afterReset.status, 200, JSON.stringify(afterReset.body));

  const oidc = await json('/api/auth/oidc/start');
  assert.equal(oidc.status, 501);
  const saml = await json('/api/auth/saml/login');
  assert.equal(saml.status, 501);

  const current = await json('/api/orgs/current', { headers: headersA });
  assert.equal(current.status, 200);
  assert.equal(current.body.org?.name, 'Acme');
});

