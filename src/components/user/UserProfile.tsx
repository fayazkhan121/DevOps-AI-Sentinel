import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, Mail, Calendar, Shield, Key, Activity, 
  Eye, EyeOff, Save, Edit, Clock, MapPin, Monitor
} from 'lucide-react';
import { authService, UserProfile as UserProfileType } from '@/services/authService';

interface ProfileFormData {
  email: string;
  fullName: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const UserProfileComponent: React.FC = () => {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    email: '',
    fullName: ''
  });

  const [passwordForm, setPasswordForm] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadProfile();
    loadActivityLogs();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const userProfile = await authService.getUserProfile(currentUser.id);
        if (userProfile) {
          setProfile(userProfile);
          setProfileForm({
            email: userProfile.email,
            fullName: userProfile.fullName
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        const logs = await authService.getUserActivityLogs(currentUser.id, 100);
        setActivityLogs(logs);
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      if (!profile) return;

      const updates: Partial<UserProfileType> = {
        email: profileForm.email,
        fullName: profileForm.fullName
      };

      const success = await authService.updateUser(profile.id, updates);
      if (success) {
        setSuccess('Profile updated successfully');
        setIsEditing(false);
        loadProfile();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile');
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (!profile) return;

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        setError('New password must be at least 8 characters long');
        return;
      }

      const success = await authService.changePassword(
        profile.id,
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (success) {
        setSuccess('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Current password is incorrect');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      setError('Failed to change password');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'user': return 'default';
      case 'viewer': return 'secondary';
      default: return 'outline';
    }
  };

  const getPermissionIcon = (permission: string) => {
    if (permission.includes('read')) return <Eye className="w-4 h-4 text-blue-600" />;
    if (permission.includes('write')) return <Edit className="w-4 h-4 text-green-600" />;
    if (permission.includes('delete')) return <Monitor className="w-4 h-4 text-red-600" />;
    return <Shield className="w-4 h-4 text-gray-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <Alert>
          <AlertDescription>Failed to load user profile</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and settings
          </p>
        </div>
        <Button
          variant={isEditing ? 'outline' : 'default'}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Key className="w-4 h-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleBadgeVariant(profile.role)}>
                      {profile.role}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <Separator />

              {/* Account Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-sm text-muted-foreground">Account Status</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {profile.permissions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Permissions</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Never'}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Login</div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <Label className="text-base font-medium">Your Permissions</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.permissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
                      {getPermissionIcon(permission)}
                      <span className="text-sm text-gray-700">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              {isEditing && (
                <div className="flex justify-end">
                  <Button onClick={handleProfileUpdate} className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePasswordChange} className="flex items-center space-x-2">
                  <Key className="w-4 h-4" />
                  <span>Change Password</span>
                </Button>
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
                Your recent activities and system interactions
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
                          Action: {log.action}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfileComponent; 