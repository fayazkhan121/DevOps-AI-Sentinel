import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.ts';

type SqlParams = Array<string | number | null | bigint>;

export interface DbAdapter {
  exec(sql: string): void;
  run(sql: string, params?: SqlParams): void;
  get<T = Record<string, unknown>>(sql: string, params?: SqlParams): T | undefined;
  all<T = Record<string, unknown>>(sql: string, params?: SqlParams): T[];
  close(): void;
  kind: string;
}

class SqliteAdapter implements DbAdapter {
  kind = 'sqlite';
  private db: DatabaseSync;

  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, params: SqlParams = []): void {
    this.db.prepare(sql).run(...params);
  }

  get<T = Record<string, unknown>>(sql: string, params: SqlParams = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  all<T = Record<string, unknown>>(sql: string, params: SqlParams = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  close(): void {
    this.db.close();
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL,
  permissions TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  last_activity TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  description TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  source TEXT,
  category TEXT,
  tags TEXT,
  timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_metrics_name_ts ON metrics(name, timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_source_ts ON metrics(source, timestamp);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  rule_id TEXT,
  name TEXT,
  description TEXT,
  severity TEXT,
  status TEXT,
  source TEXT,
  timestamp TEXT,
  acknowledged_at TEXT,
  resolved_at TEXT,
  acknowledged_by TEXT,
  resolved_by TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  name TEXT,
  description TEXT,
  metric TEXT,
  operator TEXT,
  threshold REAL,
  duration_seconds INTEGER,
  severity TEXT,
  enabled INTEGER,
  actions TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS notification_channels (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  type TEXT,
  name TEXT,
  config_encrypted TEXT,
  is_enabled INTEGER,
  is_default INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  owner_id TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  tags TEXT,
  widgets TEXT,
  layout TEXT,
  refresh_interval INTEGER,
  is_public INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  type TEXT,
  name TEXT,
  status TEXT,
  config_encrypted TEXT,
  last_sync TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  org_id TEXT,
  value_encrypted TEXT
);

CREATE TABLE IF NOT EXISTS agent_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  name TEXT,
  key_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen TEXT
);

CREATE TABLE IF NOT EXISTS ip_allowlist (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  cidr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS db_backups (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  connection_id TEXT,
  created_at TEXT NOT NULL,
  note TEXT
);
`;

let adapter: DbAdapter | null = null;

function sqliteFile(): string {
  return process.env.SQLITE_PATH || config.sqlitePath;
}

export function getDb(): DbAdapter {
  if (!adapter) {
    adapter = new SqliteAdapter(sqliteFile());
    adapter.exec(SCHEMA);
  }
  return adapter;
}

export function closeDb(): void {
  adapter?.close();
  adapter = null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
