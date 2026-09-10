import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.ts';
import { getDb } from './db.ts';
import { ipv4InCidr } from './crypto.ts';

export interface AuthUser {
  id: string;
  orgId: string;
  username: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  sessionId: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress?.replace('::ffff:', '') || '127.0.0.1';
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  void (async () => {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthUser & { exp: number };
      const db = getDb();
      const session = await db.get<{ is_active: number; expires_at: string }>(
        'SELECT is_active, expires_at FROM sessions WHERE id = ?',
        [payload.sessionId]
      );
      if (!session || Number(session.is_active) !== 1 || new Date(session.expires_at) < new Date()) {
        res.status(401).json({ success: false, message: 'Session expired' });
        return;
      }
      const user = await db.get<{ is_active: number; role: string; permissions: string; org_id: string; username: string }>(
        'SELECT is_active, role, permissions, org_id, username FROM users WHERE id = ?',
        [payload.id]
      );
      if (!user || Number(user.is_active) !== 1) {
        res.status(401).json({ success: false, message: 'Account disabled' });
        return;
      }
      const allowlist = await db.all<{ cidr: string }>('SELECT cidr FROM ip_allowlist WHERE org_id = ?', [user.org_id]);
      if (allowlist.length > 0) {
        const ip = clientIp(req);
        const allowed = allowlist.some((row) => ipv4InCidr(ip, row.cidr) || row.cidr === ip);
        if (!allowed && ip !== '127.0.0.1' && ip !== '::1') {
          res.status(403).json({ success: false, message: 'IP is not allowlisted' });
          return;
        }
      }
      req.user = {
        id: payload.id,
        orgId: user.org_id,
        username: user.username,
        role: user.role as AuthUser['role'],
        permissions: JSON.parse(user.permissions || '[]'),
        sessionId: payload.sessionId,
      };
      await db.run('UPDATE sessions SET last_activity = ? WHERE id = ?', [new Date().toISOString(), payload.sessionId]);
      next();
    } catch {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  })();
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.user.role === 'admin') {
      next();
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient role' });
      return;
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.user.role === 'admin' || req.user.permissions.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: `Missing permission ${permission}` });
  };
}

export function clientMeta(req: Request): { ip: string; userAgent: string } {
  return {
    ip: clientIp(req),
    userAgent: String(req.headers['user-agent'] || 'unknown'),
  };
}
