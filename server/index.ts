import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config.ts';
import { getDb, initDb } from './db.ts';
import { createRouter } from './http.ts';
import { collectAllMetrics, persistMetrics, overviewFromMetrics } from './collectors.ts';
import { evaluateAlerts } from './alerting.ts';
import type { AuthUser } from './middleware.ts';

const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (req.path === '/api/health' || req.path === '/api/agents/ingest') {
    next();
    return;
  }
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = hits.get(ip);
  if (!current || current.reset < now) {
    hits.set(ip, { count: 1, reset: now + config.rateLimit.windowMs });
    next();
    return;
  }
  current.count += 1;
  if (current.count > config.rateLimit.max) {
    res.status(429).json({ success: false, message: 'Rate limit exceeded' });
    return;
  }
  next();
}

function snapshotPayload(metrics: Awaited<ReturnType<typeof collectAllMetrics>>) {
  return {
    metrics,
    overview: overviewFromMetrics(metrics),
    time: new Date().toLocaleTimeString(),
    value: metrics.find((m) => m.name === 'cpu_usage')?.value ?? 0,
  };
}

export async function createApp() {
  await initDb();
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(rateLimit);
  app.use('/api', createRouter());

  const dist = path.join(process.cwd(), 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        next();
        return;
      }
      res.sendFile(path.join(dist, 'index.html'));
    });
  }
  return app;
}

async function tick(io?: SocketIOServer): Promise<void> {
  const db = getDb();
  const orgs = await db.all<{ id: string }>('SELECT id FROM orgs');
  for (const org of orgs) {
    const metrics = await collectAllMetrics(org.id);
    await persistMetrics(metrics, org.id);
    await evaluateAlerts(org.id, metrics);
    io?.to(`org:${org.id}`).emit('metrics-update', snapshotPayload(metrics));
  }
}

export async function startServer(): Promise<http.Server> {
  const app = await createApp();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: config.webOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = String(socket.handshake.auth?.token || socket.handshake.query?.token || '');
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
      if (!payload.orgId || !payload.sessionId) {
        next(new Error('Invalid token'));
        return;
      }
      socket.data.orgId = payload.orgId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const orgId = String(socket.data.orgId || '');
    if (orgId) socket.join(`org:${orgId}`);

    const sendSnapshot = async () => {
      if (!orgId) return;
      const metrics = await collectAllMetrics(orgId);
      socket.emit('metrics-update', snapshotPayload(metrics));
      socket.emit('service-health', {
        services: metrics.reduce<Record<string, string>>((acc, m) => {
          acc[m.source] = 'healthy';
          return acc;
        }, {}),
      });
    };

    socket.on('request-metrics', sendSnapshot);
    socket.on('request-service-health', sendSnapshot);
    void sendSnapshot();
  });

  setInterval(() => {
    void tick(io).catch((error) => {
      console.error('collection tick failed', error);
    });
  }, config.collectIntervalMs);

  await new Promise<void>((resolve) => {
    server.listen(config.port, '0.0.0.0', () => resolve());
  });
  console.log(`DevOps AI Sentinel API listening on ${config.port}`);
  void tick(io);
  return server;
}

const isDirect = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server/index.ts');
if (isDirect) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
