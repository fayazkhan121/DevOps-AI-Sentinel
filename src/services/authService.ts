import { User, UserSession, AuditLog } from '../types';
import { advancedDatabase } from './advancedDatabase';

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  lastLogin?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class AuthService {
  private currentUser: User | null = null;
  private currentSession: UserSession | null = null;
  private readonly JWT_SECRET = 'devops-ai-sentinel-secret-key';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Don't auto-create admin user - let setup wizard handle it
    this.initializeFromStorage();
  }

  private initializeFromStorage() {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('currentUser');
      const storedSessionId = localStorage.getItem('sessionId');
      
      if (storedToken && storedUser && storedSessionId) {
        // Try to restore the session
        const user = JSON.parse(storedUser);
        const session = this.getStoredSession(storedSessionId);
        
        if (user && session && this.isTokenValid(storedToken)) {
          this.currentUser = user;
          this.currentSession = session;
        } else {
          // Invalid or expired session, clear storage
          this.clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Failed to initialize from storage:', error);
      this.clearStoredAuth();
    }
  }

  private getStoredSession(sessionId: string): UserSession | null {
    try {
      const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      return sessions.find((s: UserSession) => s.id === sessionId) || null;
    } catch (error) {
      return null;
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const decoded = this.decodeJWT(token);
      if (!decoded) return false;
      
      // Check if token is expired
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async refreshSession(): Promise<boolean> {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('currentUser');
      
      if (!storedToken || !storedUser) {
        return false;
      }

      // Check if token is still valid
      if (!this.isTokenValid(storedToken)) {
        this.clearStoredAuth();
        return false;
      }

      // Extend the session
      const user = JSON.parse(storedUser);
      const newSession = await this.createSession(user);
      const newToken = this.generateJWT(user, newSession.id);

      this.currentUser = user;
      this.currentSession = newSession;

      // Update stored session
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('sessionId', newSession.id);

      return true;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      this.clearStoredAuth();
      return false;
    }
  }

  private clearStoredAuth() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionId');
  }

  private async createDefaultAdmin(): Promise<void> {
    const hashedPassword = await this.hashPassword('admin');
    const adminUser: User = {
      id: 'admin-001',
      username: 'admin',
      email: 'admin@devops-ai-sentinel.local',
      fullName: 'System Administrator',
      role: 'admin',
      permissions: [
        'user:read', 'user:write', 'user:delete',
        'system:read', 'system:write', 'system:delete',
        'monitoring:read', 'monitoring:write',
        'alerts:read', 'alerts:write',
        'settings:read', 'settings:write',
        'logs:read', 'logs:write'
      ],
      passwordHash: hashedPassword,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      failedLoginAttempts: 0,
      lockedUntil: null
    };

    await advancedDatabase.saveMetric('users', adminUser);
    await this.logActivity('system', 'user_created', `Default admin user created`, adminUser);
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const user = await this.getUserByUsername(credentials.username);
      
      if (!user) {
        await this.logFailedLogin(credentials.username, 'User not found');
        return { success: false, message: 'Invalid credentials' };
      }

      if (!user.isActive) {
        await this.logFailedLogin(credentials.username, 'Account disabled');
        return { success: false, message: 'Account is disabled' };
      }

      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        return { success: false, message: 'Account is temporarily locked' };
      }

      const isValidPassword = await this.verifyPassword(credentials.password, user.passwordHash);
      if (!isValidPassword) {
        await this.handleFailedLogin(user);
        return { success: false, message: 'Invalid credentials' };
      }

      // Reset failed login attempts on successful login
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      user.lastLogin = new Date().toISOString();
      
      // Update user in localStorage
      try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex((u: User) => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex] = user;
          localStorage.setItem('users', JSON.stringify(users));
        }
      } catch (error) {
        console.error('Failed to update user in localStorage:', error);
      }
      
      // Also try to update in advancedDatabase
      try {
        await advancedDatabase.saveMetric('users', user);
      } catch (error) {
        console.error('Failed to update user in database:', error);
      }

      // Create session
      const session = await this.createSession(user);
      const token = this.generateJWT(user, session.id, credentials.rememberMe || false);

      this.currentUser = user;
      this.currentSession = session;

      // Store authentication state in localStorage for persistence
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify(this.sanitizeUser(user)));
      localStorage.setItem('sessionId', session.id);

      await this.logActivity(user.id, 'user_login', 'User logged in successfully', user);
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        token
      };

    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  async logout(): Promise<void> {
    if (this.currentSession) {
      await this.terminateSession(this.currentSession.id);
      await this.logActivity(this.currentUser?.id || 'unknown', 'user_logout', 'User logged out');
    }
    
    this.currentUser = null;
    this.currentSession = null;
    
    // Clear authentication state from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionId');
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const decoded = this.decodeJWT(token);
      if (!decoded) return null;

      const session = await this.getSession(decoded.sessionId);
      if (!session || !session.isActive) {
        return null;
      }

      const user = await this.getUserById(decoded.userId);
      if (!user || !user.isActive) {
        return null;
      }

      this.currentUser = user;
      this.currentSession = session;
      return this.sanitizeUser(user);

    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  async createUser(userData: Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<string> {
    try {
      const hashedPassword = await this.hashPassword(userData.password || 'changeme123');
      
      const newUser: User = {
        ...userData,
        id: `user-${Date.now()}`,
        passwordHash: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        failedLoginAttempts: 0,
        lockedUntil: null
      };

      // Save to localStorage first
      try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
      } catch (error) {
        console.error('Failed to save user to localStorage:', error);
      }

      // Also try to save in advancedDatabase
      try {
        await advancedDatabase.saveMetric('users', newUser);
      } catch (error) {
        console.error('Failed to save user to database:', error);
      }

      await this.logActivity(this.currentUser?.id || 'system', 'user_created', `User ${newUser.username} created`, newUser);
      
      return newUser.id;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      // If password is being updated, hash it
      if (updates.password) {
        updates.passwordHash = await this.hashPassword(updates.password);
        delete updates.password;
      }

      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await advancedDatabase.saveMetric('users', updatedUser);
      await this.logActivity(this.currentUser?.id || 'system', 'user_updated', `User ${user.username} updated`, updatedUser);
      
      return true;
    } catch (error) {
      console.error('Failed to update user:', error);
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      // Don't allow admin to delete themselves
      if (user.username === 'admin') {
        throw new Error('Cannot delete admin user');
      }

      await advancedDatabase.deleteMetric('users', userId);
      await this.logActivity(this.currentUser?.id || 'system', 'user_deleted', `User ${user.username} deleted`, user);
      
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      const isValidCurrentPassword = await this.verifyPassword(currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        return false;
      }

      const hashedNewPassword = await this.hashPassword(newPassword);
      await this.updateUser(userId, { passwordHash: hashedNewPassword });
      
      await this.logActivity(userId, 'password_changed', 'Password changed successfully');
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      // Try localStorage first
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      if (localUsers.length > 0) {
        return localUsers.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          permissions: user.permissions,
          lastLogin: user.lastLogin,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }));
      }

      // Fallback to advancedDatabase
      const users = await advancedDatabase.getMetric('users') || [];
      return users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  }

  async getUserActivityLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
    try {
      // Try localStorage first
      const localLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      if (localLogs.length > 0) {
        return localLogs
          .filter(log => log.userId === userId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      }

      // Fallback to advancedDatabase
      const logs = await advancedDatabase.getMetric('audit_logs') || [];
      return logs
        .filter(log => log.userId === userId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get user activity logs:', error);
      return [];
    }
  }

  async getAllActivityLogs(limit: number = 1000): Promise<AuditLog[]> {
    try {
      // Try localStorage first
      const localLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      if (localLogs.length > 0) {
        return localLogs
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      }

      // Fallback to advancedDatabase
      const logs = await advancedDatabase.getMetric('audit_logs') || [];
      return logs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get activity logs:', error);
      return [];
    }
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return false;

      return user.permissions.includes(permission) || user.role === 'admin';
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser ? this.sanitizeUser(this.currentUser) : null;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  private async getUserByUsername(username: string): Promise<User | null> {
    try {
      // Try localStorage first, then fallback to advancedDatabase
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: User) => u.username === username);
      if (user) return user;
      
      // Fallback to advancedDatabase
      const dbUsers = await advancedDatabase.getMetric('users') || [];
      return dbUsers.find((u: User) => u.username === username) || null;
    } catch (error) {
      console.error('Failed to get user by username:', error);
      return null;
    }
  }

  private async getUserById(userId: string): Promise<User | null> {
    try {
      // Try localStorage first, then fallback to advancedDatabase
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: User) => u.id === userId);
      if (user) return user;
      
      // Fallback to advancedDatabase
      const dbUsers = await advancedDatabase.getMetric('users') || [];
      return dbUsers.find((u: User) => u.id === userId) || null;
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return null;
    }
  }

  private async userExists(username: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    return user !== null;
  }

  private async createSession(user: User): Promise<UserSession> {
    const session: UserSession = {
      id: `session-${Date.now()}`,
      userId: user.id,
      username: user.username,
      ipAddress: 'unknown', // Would be set from request context
      userAgent: 'unknown', // Would be set from request context
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.SESSION_DURATION).toISOString(),
      isActive: true,
      lastActivity: new Date().toISOString()
    };

    // Save session to localStorage
    try {
      const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      sessions.push(session);
      localStorage.setItem('sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
    }

    // Also try to save in advancedDatabase
    try {
      await advancedDatabase.saveMetric('sessions', session);
    } catch (error) {
      console.error('Failed to save session to database:', error);
    }

    return session;
  }

  private async getSession(sessionId: string): Promise<UserSession | null> {
    try {
      // Try localStorage first, then fallback to advancedDatabase
      const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      const session = sessions.find((s: UserSession) => s.id === sessionId);
      if (session) return session;
      
      // Fallback to advancedDatabase
      const dbSessions = await advancedDatabase.getMetric('sessions') || [];
      return dbSessions.find((s: UserSession) => s.id === sessionId) || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  private async terminateSession(sessionId: string): Promise<void> {
    try {
      // Update session in localStorage
      const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
      const sessionIndex = sessions.findIndex((s: UserSession) => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].isActive = false;
        localStorage.setItem('sessions', JSON.stringify(sessions));
      }
      
      // Also try to update in advancedDatabase
      try {
        const dbSessions = await advancedDatabase.getMetric('sessions') || [];
        const session = dbSessions.find(s => s.id === sessionId);
        if (session) {
          session.isActive = false;
          await advancedDatabase.saveMetric('sessions', session);
        }
      } catch (error) {
        console.error('Failed to update session in database:', error);
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  }

  private generateJWT(user: User, sessionId: string, rememberMe: boolean = false): string {
    // Simple JWT-like token for browser environment
    const expirationTime = rememberMe ? (30 * 24 * 60 * 60) : (24 * 60 * 60); // 30 days or 24 hours
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId: sessionId,
      exp: Math.floor(Date.now() / 1000) + expirationTime,
      rememberMe: rememberMe
    };
    
    return btoa(JSON.stringify(payload));
  }

  private decodeJWT(token: string): any {
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expired
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    // Simple hash for browser environment
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.JWT_SECRET);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedPassword = await this.hashPassword(password);
    return hashedPassword === hash;
  }

  private async handleFailedLogin(user: User): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // Lock for 30 minutes
    }

    await advancedDatabase.saveMetric('users', user);
  }

  private async logFailedLogin(username: string, reason: string): Promise<void> {
    await this.logActivity('system', 'login_failed', `Failed login attempt for ${username}: ${reason}`);
  }

  private async logActivity(userId: string, action: string, description: string, details?: any): Promise<void> {
    try {
      const log: AuditLog = {
        id: `log-${Date.now()}`,
        userId,
        action,
        description,
        details: details ? JSON.stringify(details) : null,
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown', // Would be set from request context
        userAgent: 'unknown' // Would be set from request context
      };

      // Save to localStorage first
      try {
        const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
        logs.push(log);
        localStorage.setItem('audit_logs', JSON.stringify(logs));
      } catch (error) {
        console.error('Failed to save log to localStorage:', error);
      }

      // Also try to save in advancedDatabase
      try {
        const logs = await advancedDatabase.getMetric('audit_logs') || [];
        logs.push(log);
        await advancedDatabase.saveMetric('audit_logs', logs);
      } catch (error) {
        console.error('Failed to save log to database:', error);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  private sanitizeUser(user: User): User {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser as User;
  }
}

export const authService = new AuthService(); 