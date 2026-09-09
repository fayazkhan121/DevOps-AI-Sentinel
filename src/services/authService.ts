import { User, UserSession, AuditLog } from '../types';
import { apiFetch, clearSession, getToken, setSession } from '@/lib/apiClient';

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

  constructor() {
    this.initializeFromStorage();
  }

  private initializeFromStorage() {
    try {
      const storedToken = getToken();
      const storedUser = localStorage.getItem('currentUser');
      if (storedToken && storedUser) {
        this.currentUser = JSON.parse(storedUser);
        this.currentSession = {
          id: localStorage.getItem('sessionId') || 'session',
          userId: this.currentUser?.id || '',
          username: this.currentUser?.username || '',
          ipAddress: '',
          userAgent: '',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          isActive: true,
          lastActivity: new Date().toISOString(),
        };
      }
    } catch {
      clearSession();
    }
  }

  async needsSetup(): Promise<boolean> {
    const data = await apiFetch<{ needsSetup: boolean }>('/setup/status');
    return data.needsSetup;
  }

  async completeSetup(payload: Record<string, unknown>): Promise<AuthResponse> {
    try {
      const data = await apiFetch<AuthResponse>('/setup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (data.success && data.token && data.user) {
        this.persist(data.token, data.user);
      }
      return data;
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Setup failed' };
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const data = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (data.success && data.token && data.user) {
        this.persist(data.token, data.user);
      }
      return data;
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Authentication failed' };
    }
  }

  async logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // still clear local session
    }
    this.currentUser = null;
    this.currentSession = null;
    clearSession();
  }

  async refreshSession(): Promise<boolean> {
    try {
      const data = await apiFetch<{ success: boolean; token?: string }>('/auth/refresh', { method: 'POST' });
      if (data.success && data.token && this.currentUser) {
        setSession(data.token, this.currentUser);
        return true;
      }
      return false;
    } catch {
      this.currentUser = null;
      this.currentSession = null;
      clearSession();
      return false;
    }
  }

  async createUser(userData: Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<string> {
    const data = await apiFetch<{ id: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return data.id;
  }

  async updateUser(userId: string, updates: Partial<User> & { password?: string; isActive?: boolean }): Promise<boolean> {
    await apiFetch(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(updates) });
    return true;
  }

  async deleteUser(userId: string): Promise<boolean> {
    await apiFetch(`/users/${userId}`, { method: 'DELETE' });
    return true;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      await apiFetch('/users/me/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const users = await this.getAllUsers();
    return users.find((u) => u.id === userId) || null;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const data = await apiFetch<{ users: UserProfile[] }>('/users');
    return data.users || [];
  }

  async getUserActivityLogs(userId: string, limit = 100): Promise<AuditLog[]> {
    const logs = await this.getAllActivityLogs(limit);
    return logs.filter((log) => log.userId === userId);
  }

  async getAllActivityLogs(limit = 1000): Promise<AuditLog[]> {
    const data = await apiFetch<{ logs: Array<Record<string, string>> }>(`/audit?limit=${limit}`);
    return (data.logs || []).map((log) => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      description: log.description,
      details: log.details,
      timestamp: log.timestamp,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
    }));
  }

  async hasPermission(_userId: string, permission: string): Promise<boolean> {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin' || (this.currentUser.permissions || []).includes(permission);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && Boolean(getToken());
  }

  applySsoToken(token: string, user: User): void {
    this.persist(token, user);
  }

  private persist(token: string, user: User): void {
    this.currentUser = user;
    this.currentSession = {
      id: 'session',
      userId: user.id,
      username: user.username,
      ipAddress: '',
      userAgent: '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      isActive: true,
      lastActivity: new Date().toISOString(),
    };
    setSession(token, user, this.currentSession.id);
  }
}

export const authService = new AuthService();
