import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config.ts';
import { getDb } from './db.ts';
import { createRouter } from './http.ts';
import { collectAllMetrics, persistMetrics, overviewFromMetrics } from './collectors.ts';
import { evaluateAlerts } from './alerting.ts';

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

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
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

async function tick(): Promise<void> {
  const db = getDb();
  const orgs = db.all<{ id: string }>('SELECT id FROM orgs');
  for (const org of orgs) {
    const metrics = await collectAllMetrics(org.id);
    persistMetrics(metrics, org.id);
    await evaluateAlerts(org.id, metrics);
  }
}

export async function startServer(): Promise<http.Server> {
  getDb();
  const app = createApp();
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
      jwt.verify(token, config.jwtSecret);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const sendSnapshot = async () => {
      const metrics = await collectAllMetrics();
      const overview = overviewFromMetrics(metrics);
      socket.emit('metrics-update', {
        metrics,
        overview,
        time: new Date().toLocaleTimeString(),
        value: metrics.find((m) => m.name === 'cpu_usage')?.value ?? 0,
      });
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
    void tick().then(async () => {
      const metrics = await collectAllMetrics();
      io.emit('metrics-update', {
        metrics,
        overview: overviewFromMetrics(metrics),
        time: new Date().toLocaleTimeString(),
        value: metrics.find((m) => m.name === 'cpu_usage')?.value ?? 0,
      });
    }).catch((error) => {
      console.error('collection tick failed', error);
    });
  }, config.collectIntervalMs);

  await new Promise<void>((resolve) => {
    server.listen(config.port, '0.0.0.0', () => resolve());
  });
  console.log(`DevOps AI Sentinel API listening on ${config.port}`);
  void tick();
  return server;
}

const isDirect = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server/index.ts');
if (isDirect) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
