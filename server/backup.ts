import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { config } from './config.ts';
import { closeDb, getDb, initDb, nowIso } from './db.ts';
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

function backupDir(): string {
  const dir = path.join(config.dataDir, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function copySqliteFiles(from: string, to: string): void {
  fs.copyFileSync(from, to);
  for (const suffix of ['-wal', '-shm']) {
    const extra = `${from}${suffix}`;
    if (fs.existsSync(extra)) fs.copyFileSync(extra, `${to}${suffix}`);
  }
}

export async function createBackup(orgId: string, note = ''): Promise<BackupRecord> {
  const id = randomId('bak');
  const createdAt = nowIso();
  const dir = backupDir();
  let filePath: string;
  let kind: string;
  const db = getDb();

  if (db.kind === 'postgres') {
    filePath = path.join(dir, `${id}.sql`);
    const dumped = spawnSync('pg_dump', [
      '-h', config.postgres.host,
      '-p', String(config.postgres.port),
      '-U', config.postgres.user,
      '-d', config.postgres.database,
      '-f', filePath,
    ], {
      env: { ...process.env, PGPASSWORD: config.postgres.password },
      encoding: 'utf8',
    });
    if (dumped.status !== 0 || !fs.existsSync(filePath)) {
      throw new Error(dumped.stderr || 'pg_dump failed; install PostgreSQL client tools or use SQLITE_PATH backups');
    }
    kind = 'postgres-dump';
  } else {
    filePath = path.join(dir, `${id}.sqlite`);
    try {
      const escaped = filePath.replace(/'/g, "''");
      await db.exec(`VACUUM INTO '${escaped}'`);
    } catch {
      await closeDb();
      try {
        copySqliteFiles(config.sqlitePath, filePath);
      } finally {
        await initDb();
      }
    }
    kind = 'sqlite-file';
  }

  const sizeBytes = fs.statSync(filePath).size;
  await getDb().run(
    'INSERT INTO db_backups (id, org_id, connection_id, created_at, note, file_path, size_bytes, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, orgId, getDb().kind, createdAt, note || `${kind} snapshot`, filePath, sizeBytes, kind]
  );
  return { id, orgId, createdAt, filePath, sizeBytes, kind, note };
}

export async function restoreBackup(orgId: string, backupId: string): Promise<BackupRecord> {
  const row = await getDb().get<{
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

  if (row.kind === 'postgres-dump' || getDb().kind === 'postgres') {
    const restored = spawnSync('psql', [
      '-h', config.postgres.host,
      '-p', String(config.postgres.port),
      '-U', config.postgres.user,
      '-d', config.postgres.database,
      '-f', row.file_path,
    ], {
      env: { ...process.env, PGPASSWORD: config.postgres.password },
      encoding: 'utf8',
    });
    if (restored.status !== 0) {
      throw new Error(restored.stderr || 'psql restore failed');
    }
  } else {
    await closeDb();
    try {
      copySqliteFiles(row.file_path, config.sqlitePath);
    } finally {
      await initDb();
    }
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
