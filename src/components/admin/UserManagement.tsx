import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Users, UserPlus, UserX, Shield, Activity,
  Eye, EyeOff, Lock, Unlock, Trash2, Settings, Key
} from 'lucide-react';
import { authService, UserProfile } from '@/services/authService';
import { advancedDatabase } from '@/services/advancedDatabase';
import { apiFetch } from '@/lib/apiClient';

interface UserFormData {
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user' | 'viewer';
  password: string;
  permissions: string[];
}

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ email: string; role: 'admin' | 'user' | 'viewer' }>({
    email: '',
    role: 'user',
  });
  const [inviteResult, setInviteResult] = useState<{ token?: string; message?: string } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    email: '',
    fullName: '',
    role: 'user',
    password: '',
    permissions: []
  });

  const availablePermissions = [
    { category: 'User Management', permissions: ['user:read', 'user:write', 'user:delete'] },
    { category: 'System', permissions: ['system:read', 'system:write', 'system:delete'] },
    { category: 'Monitoring', permissions: ['monitoring:read', 'monitoring:write'] },
    { category: 'Alerts', permissions: ['alerts:read', 'alerts:write'] },
    { category: 'Settings', permissions: ['settings:read', 'settings:write'] },
    { category: 'Logs', permissions: ['logs:read', 'logs:write'] }
  ];

  const rolePermissions = {
    admin: availablePermissions.flatMap(cat => cat.permissions),
    user: ['monitoring:read', 'alerts:read', 'settings:read', 'logs:read'],
    viewer: ['monitoring:read', 'alerts:read']
  };

  useEffect(() => {
    loadUsers();
    loadActivityLogs();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const allUsers = await authService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const logs = await authService.getAllActivityLogs(1000);
      setActivityLogs(logs);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    }
  };

  const handleInviteUser = async () => {
    try {
      if (!inviteForm.email) {
        setError('Email is required');
        return;
      }

      const data = await apiFetch<{ token?: string; message?: string }>('/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteForm.email, role: inviteForm.role }),
      });

      setError('');
      if (data.token || data.message) {
        setInviteResult({ token: data.token, message: data.message });
      } else {
        setShowInviteDialog(false);
        setInviteForm({ email: '', role: 'user' });
        setInviteResult(null);
      }
    } catch (error) {
      console.error('Failed to invite user:', error);
      setError(error instanceof Error ? error.message : 'Failed to invite user');
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!userFormData.username || !userFormData.password) {
        setError('Username and password are required');
        return;
      }

      await authService.createUser({
        ...userFormData,
        permissions: rolePermissions[userFormData.role]
      });

      setShowCreateDialog(false);
      resetForm();
      loadUsers();
      setError('');
    } catch (error) {
      console.error('Failed to create user:', error);
      setError('Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const updates: Partial<UserProfile> = {
        email: userFormData.email,
        fullName: userFormData.fullName,
        role: userFormData.role,
        permissions: rolePermissions[userFormData.role]
      };

      if (userFormData.password) {
        updates.password = userFormData.password;
      }

      await authService.updateUser(editingUser.id, updates);
      
      setEditingUser(null);
      resetForm();
      loadUsers();
      setError('');
    } catch (error) {
      console.error('Failed to update user:', error);
      setError('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === 'admin') {
      setError('Cannot delete admin user');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await authService.deleteUser(userId);
        loadUsers();
        setError('');
      } catch (error) {
        console.error('Failed to delete user:', error);
        setError('Failed to delete user');
      }
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await authService.updateUser(userId, { isActive: !currentStatus });
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      setError('Failed to update user status');
    }
  };

  const resetForm = () => {
    setUserFormData({
      username: '',
      email: '',
      fullName: '',
      role: 'user',
      password: '',
      permissions: []
    });
  };

  const openEditDialog = (user: UserProfile) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      password: '',
      permissions: user.permissions
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'user': return 'default';
      case 'viewer': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-red-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions for the platform
          </p>
        </div>
        <div className="flex items-center space-x-2">
        <Dialog
          open={showInviteDialog}
          onOpenChange={(open) => {
            setShowInviteDialog(open);
            if (!open) {
              setInviteForm({ email: '', role: 'user' });
              setInviteResult(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline">Invite User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an invite with an email and role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email"
                  disabled={Boolean(inviteResult)}
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: 'admin' | 'user' | 'viewer') =>
                    setInviteForm(prev => ({ ...prev, role: value }))
                  }
                  disabled={Boolean(inviteResult)}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteResult?.message && (
                <p className="text-sm">{inviteResult.message}</p>
              )}
              {inviteResult?.token && (
                <div>
                  <Label htmlFor="invite-token">Token</Label>
                  <Input id="invite-token" value={inviteResult.token} readOnly />
                </div>
              )}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteForm({ email: '', role: 'user' });
                    setInviteResult(null);
                  }}
                >
                  Cancel
                </Button>
                {!inviteResult && (
                  <Button onClick={handleInviteUser}>
                    Send invite
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the platform with appropriate permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={userFormData.fullName}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={userFormData.role}
                  onValueChange={(value: 'admin' | 'user' | 'viewer') => 
                    setUserFormData(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser}>
                  Create User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Users ({users.length})</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Activity Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>System Users</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(user.isActive)}
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-muted-foreground">
                            @{user.username} • {user.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {user.lastLogin && (
                        <div className="text-xs text-muted-foreground">
                          Last: {new Date(user.lastLogin).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                      >
                        {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </Button>
                      {user.username !== 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Activity Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                Monitor user activities and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{log.description}</div>
                        <div className="text-sm text-muted-foreground">
                          Action: {log.action} • User: {log.userId}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input value={userFormData.username} disabled />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={userFormData.fullName}
                onChange={(e) => setUserFormData(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={userFormData.role}
                onValueChange={(value: 'admin' | 'user' | 'viewer') => 
                  setUserFormData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Leave blank to keep current password"
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>
                Update User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement; 