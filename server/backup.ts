import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.ts';
import { getDb, nowIso } from './db.ts';
import { randomId } from './crypto.ts';

export interface BackupRecord {
  id: string;
  orgId: string;
  createdAt: string;
  filePath: string;
  sizeBytes: number;
  kind: string;
  note: string;
}

const ORG_TABLES = [
  'users',
  'audit_logs',
  'metrics',
  'alerts',
  'alert_rules',
  'notification_channels',
  'dashboards',
  'integrations',
  'settings',
  'agent_keys',
  'ip_allowlist',
  'invites',
  'password_resets',
] as const;

function backupDir(): string {
  const dir = path.join(config.dataDir, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sqlParams(values: unknown[]): Array<string | number | null | bigint> {
  return values.map((value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number' || typeof value === 'bigint') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

async function insertRows(table: string, rows: Array<Record<string, unknown>>): Promise<void> {
  const db = getDb();
  for (const row of rows) {
    const cols = Object.keys(row);
    if (cols.length === 0) continue;
    const placeholders = cols.map(() => '?').join(', ');
    await db.run(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
      sqlParams(cols.map((col) => row[col]))
    );
  }
}

export async function createBackup(orgId: string, note = ''): Promise<BackupRecord> {
  const id = randomId('bak');
  const createdAt = nowIso();
  const db = getDb();
  const org = await db.get('SELECT * FROM orgs WHERE id = ?', [orgId]);
  if (!org) throw new Error('Organization not found');

  const tables: Record<string, unknown[]> = {};
  for (const table of ORG_TABLES) {
    tables[table] = await db.all(`SELECT * FROM ${table} WHERE org_id = ?`, [orgId]);
  }

  const payload = {
    version: 1,
    kind: 'org-json',
    orgId,
    org,
    createdAt,
    tables,
  };
  const filePath = path.join(backupDir(), `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload));
  const sizeBytes = fs.statSync(filePath).size;
  const kind = 'org-json';

  await db.run(
    'INSERT INTO db_backups (id, org_id, connection_id, created_at, note, file_path, size_bytes, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, orgId, db.kind, createdAt, note || 'org-json snapshot', filePath, sizeBytes, kind]
  );
  return { id, orgId, createdAt, filePath, sizeBytes, kind, note };
}

export async function restoreBackup(orgId: string, backupId: string): Promise<BackupRecord> {
  const db = getDb();
  const row = await db.get<{
    id: string;
    org_id: string;
    created_at: string;
    note: string;
    file_path: string;
    size_bytes: number;
    kind: string;
  }>('SELECT * FROM db_backups WHERE id = ? AND org_id = ?', [backupId, orgId]);
  if (!row?.file_path || !fs.existsSync(row.file_path)) {
    throw new Error('Backup file not found');
  }
  if (row.kind !== 'org-json') {
    throw new Error('Instance-wide dumps cannot be restored; create a new org-json backup');
  }

  const payload = JSON.parse(fs.readFileSync(row.file_path, 'utf8')) as {
    orgId?: string;
    org?: { id: string; name: string; created_at: string };
    tables?: Record<string, Array<Record<string, unknown>>>;
  };
  if (payload.orgId !== orgId) {
    throw new Error('Backup does not belong to this organization');
  }

  const deleteOrder = [...ORG_TABLES].reverse();
  for (const table of deleteOrder) {
    await db.run(`DELETE FROM ${table} WHERE org_id = ?`, [orgId]);
  }

  if (payload.org?.name) {
    await db.run('UPDATE orgs SET name = ? WHERE id = ?', [payload.org.name, orgId]);
  }

  for (const table of ORG_TABLES) {
    await insertRows(table, payload.tables?.[table] || []);
  }

  return {
    id: row.id,
    orgId: row.org_id,
    createdAt: row.created_at,
    filePath: row.file_path,
    sizeBytes: Number(row.size_bytes || 0),
    kind: row.kind,
    note: row.note,
  };
}
