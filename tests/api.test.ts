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

let server: Server;
let base = '';

before(async () => {
  const app = createApp();
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
