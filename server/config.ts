import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

function requiredSecret(name: string, fallbackDev: string): string {
  const value = process.env[name];
  if (value && value.length >= 16 && !/change-this|change-in-production|your_/i.test(value)) {
    return value;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set to a strong unique value in production`);
  }
  return value && value.length >= 8 ? value : fallbackDev;
}

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  webOrigin: process.env.CORS_ORIGIN || process.env.WEB_BASE_URL || 'http://localhost:5173',
  jwtSecret: requiredSecret('JWT_SECRET', crypto.randomBytes(32).toString('hex')),
  encryptionKey: requiredSecret('ENCRYPTION_KEY', crypto.randomBytes(32).toString('hex')),
  sessionHours: Number(process.env.SESSION_HOURS || 24),
  rememberMeDays: Number(process.env.REMEMBER_ME_DAYS || 30),
  dataDir,
  sqlitePath: process.env.SQLITE_PATH || path.join(dataDir, 'sentinel.db'),
  databaseType: (process.env.DATABASE_TYPE || 'sqlite').toLowerCase(),
  postgres: {
    host: process.env.POSTGRES_HOST || process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || 5432),
    database: process.env.POSTGRES_DB || process.env.DATABASE_NAME || 'devops_sentinel',
    user: process.env.POSTGRES_USER || process.env.DATABASE_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD || '',
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300),
  },
  collectIntervalMs: Number(process.env.METRICS_COLLECTION_INTERVAL || 30) * 1000,
  healthIntervalMs: Number(process.env.HEALTH_CHECK_INTERVAL || 60) * 1000,
  thresholds: {
    cpuWarning: Number(process.env.CPU_WARNING_THRESHOLD || 70),
    cpuCritical: Number(process.env.CPU_CRITICAL_THRESHOLD || 90),
    memoryWarning: Number(process.env.MEMORY_WARNING_THRESHOLD || 80),
    memoryCritical: Number(process.env.MEMORY_CRITICAL_THRESHOLD || 95),
    diskWarning: Number(process.env.DISK_WARNING_THRESHOLD || 85),
    diskCritical: Number(process.env.DISK_CRITICAL_THRESHOLD || 95),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'DevOps AI Sentinel <noreply@localhost>',
  },
  slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
  githubOauth: {
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_OAUTH_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
  },
};
