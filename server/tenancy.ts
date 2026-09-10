import bcrypt from 'bcryptjs';
import { getDb, nowIso, parseJson } from './db.ts';
import { encryptJson, decryptJson, randomId } from './crypto.ts';
import { seedDefaultRules } from './alerting.ts';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
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

export interface ProvisionInput {
  orgName: string;
  adminUsername: string;
  adminPassword: string;
  adminEmail?: string;
  adminFullName?: string;
  collectHostMetrics?: boolean;
}

export interface ProvisionedOrg {
  orgId: string;
  userId: string;
}

export async function upsertSetting(orgId: string, key: string, value: unknown): Promise<void> {
  await getDb().run(
    'INSERT INTO settings (org_id, key, value_encrypted) VALUES (?, ?, ?) ON CONFLICT(org_id, key) DO UPDATE SET value_encrypted = excluded.value_encrypted',
    [orgId, key, encryptJson(value)]
  );
}

export async function readSetting<T>(orgId: string, key: string, fallback: T): Promise<T> {
  const row = await getDb().get<{ value_encrypted: string }>('SELECT value_encrypted FROM settings WHERE org_id = ? AND key = ?', [orgId, key]);
  return decryptJson(row?.value_encrypted, fallback);
}

export async function orgWantsHostMetrics(orgId: string): Promise<boolean> {
  const settings = await readSetting<{ collectHostMetrics?: boolean }>(orgId, 'system_config', {});
  if (settings.collectHostMetrics === true) return true;
  const host = await getDb().get('SELECT id FROM integrations WHERE org_id = ? AND type = ?', [orgId, 'host']);
  return Boolean(host);
}

export async function provisionOrg(input: ProvisionInput): Promise<ProvisionedOrg> {
  const db = getDb();
  const username = String(input.adminUsername);
  const orgId = randomId('org');
  const userId = randomId('user');
  const passwordHash = await bcrypt.hash(String(input.adminPassword), 12);
  await db.run('INSERT INTO orgs (id, name, created_at) VALUES (?, ?, ?)', [orgId, input.orgName, nowIso()]);
  await db.run(
    `INSERT INTO users (id, org_id, username, email, full_name, role, permissions, password_hash, is_active, failed_login_attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'admin', ?, ?, 1, 0, ?, ?)`,
    [userId, orgId, username, input.adminEmail || 'admin@localhost', input.adminFullName || 'Administrator', JSON.stringify(ROLE_PERMISSIONS.admin), passwordHash, nowIso(), nowIso()]
  );
  await upsertSetting(orgId, 'system_config', {
    systemName: 'DevOps AI Sentinel',
    companyName: input.orgName,
    setupDate: nowIso(),
    collectHostMetrics: input.collectHostMetrics === true,
  });
  await seedDefaultRules(orgId);
  return { orgId, userId };
}

export async function findLoginUsers(username: string, orgHint?: string): Promise<Array<Record<string, unknown>>> {
  const db = getDb();
  const name = String(username || '');
  if (orgHint) {
    const row = await db.get<Record<string, unknown>>(
      `SELECT u.* FROM users u JOIN orgs o ON o.id = u.org_id
       WHERE u.username = ? AND (u.org_id = ? OR o.name = ?)`,
      [name, orgHint, orgHint]
    );
    return row ? [row] : [];
  }
  return db.all<Record<string, unknown>>('SELECT * FROM users WHERE username = ?', [name]);
}

export function publicUser(row: Record<string, unknown>) {
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
    totpEnabled: Number(row.totp_enabled) === 1,
  };
}
