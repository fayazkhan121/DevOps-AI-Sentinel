import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const enabled = ['postgres', 'postgresql'].includes((process.env.DATABASE_TYPE || '').toLowerCase());

let server: Server;
let base = '';

async function json(pathName: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${pathName}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json();
  return { status: res.status, body };
}

test('postgres adapter health, setup, and settings round trip', { skip: !enabled }, async (t) => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-min-16';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-enc-secret-key-16';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.CORS_ORIGIN = 'http://127.0.0.1';

  const { createApp } = await import('../server/index.ts');
  const { closeDb } = await import('../server/db.ts');
  const app = await createApp();
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;

  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await closeDb();
  });

  const health = await json('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.database, 'postgres');

  const setupStatus = await json('/api/setup/status');
  if (setupStatus.body.needsSetup) {
    const setup = await json('/api/setup', {
      method: 'POST',
      body: JSON.stringify({
        adminUsername: 'admin',
        adminPassword: 'super-secret-pass',
        adminEmail: 'admin@example.com',
        companyName: 'PgOrg',
      }),
    });
    assert.equal(setup.status, 200, JSON.stringify(setup.body));
  }

  const login = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'super-secret-pass', org: 'PgOrg' }),
  });
  assert.ok(login.status === 200 || login.status === 400, JSON.stringify(login.body));
  const token = login.body.token as string | undefined;
  if (!token) return;
  const headers = { Authorization: `Bearer ${token}` };
  const saved = await json('/api/settings', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ marker: 'pg-ok' }),
  });
  assert.equal(saved.status, 200);
  const read = await json('/api/settings', { headers });
  assert.equal(read.body.settings?.marker, 'pg-ok');
});
