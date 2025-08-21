import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Cloud, 
  Server, 
  Bell, 
  Shield, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  TestTube,
  Save,
  Download,
  Upload
} from 'lucide-react';
import { advancedDatabase } from '@/services/advancedDatabase';
import { cloudMonitoring } from '@/services/cloudMonitoring';
import { devopsIntegrations } from '@/services/devopsIntegrations';
import { advancedAlerting } from '@/services/advancedAlerting';

interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'indexeddb';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  connectionString?: string;
}

interface CloudCredentials {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  azure?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
  };
  gcp?: {
    projectId: string;
    keyFilename: string;
  };
}

export const AdvancedSettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('database');
  const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfig>({
    type: 'indexeddb'
  });
  const [cloudCredentials, setCloudCredentials] = useState<CloudCredentials>({});
  const [devopsConfig, setDevopsConfig] = useState({
    kubernetes: { enabled: false, config: {} },
    docker: { enabled: false, config: {} },
    jenkins: { enabled: false, config: {} },
    git: { enabled: false, config: {} }
  });
  const [notificationChannels, setNotificationChannels] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadCurrentConfig();
    testConnections();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      // Load database configuration
      const dbConfig = await advancedDatabase.getConnectionStatus();
      if (dbConfig) {
        setDatabaseConfig({ type: dbConfig.type as any });
      }

      // Load cloud provider status
      const cloudStatus = cloudMonitoring.getProviderStatus();
      setConnectionStatus(cloudStatus);

      // Load DevOps integration status
      const devopsStatus = devopsIntegrations.getIntegrationStatus();
      setConnectionStatus(prev => ({ ...prev, ...devopsStatus }));

      // Load notification channels
      const channels = advancedAlerting.getChannels();
      setNotificationChannels(channels);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const testConnections = async () => {
    setIsLoading(true);
    try {
      // Test database connection
      const dbStatus = await advancedDatabase.testConnection();
      setConnectionStatus(prev => ({ ...prev, database: dbStatus }));

      // Test cloud connections
      const cloudStatus = cloudMonitoring.getProviderStatus();
      setConnectionStatus(prev => ({ ...prev, ...cloudStatus }));

      // Test DevOps connections
      const devopsStatus = devopsIntegrations.getIntegrationStatus();
      setConnectionStatus(prev => ({ ...prev, ...devopsStatus }));
    } catch (error) {
      console.error('Failed to test connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseConfigChange = (field: keyof DatabaseConfig, value: any) => {
    setDatabaseConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleCloudCredentialsChange = (provider: keyof CloudCredentials, field: string, value: string) => {
    setCloudCredentials(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const handleDevopsConfigChange = (tool: string, field: string, value: any) => {
    setDevopsConfig(prev => ({
      ...prev,
      [tool]: {
        ...prev[tool as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const saveDatabaseConfig = async () => {
    try {
      setIsLoading(true);
      // Update database configuration
      await advancedDatabase.closeConnection();
      // Reinitialize with new config
      setMessage({ type: 'success', text: 'Database configuration saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save database configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveCloudCredentials = async () => {
    try {
      setIsLoading(true);
      cloudMonitoring.updateCredentials(cloudCredentials);
      setMessage({ type: 'success', text: 'Cloud credentials saved successfully' });
      await testConnections();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save cloud credentials' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveDevopsConfig = async () => {
    try {
      setIsLoading(true);
      // Save DevOps configurations
      if (devopsConfig.kubernetes.enabled) {
        await devopsIntegrations.configureKubernetes(devopsConfig.kubernetes.config as any);
      }
      if (devopsConfig.docker.enabled) {
        await devopsIntegrations.configureDocker(devopsConfig.docker.config as any);
      }
      if (devopsConfig.jenkins.enabled) {
        await devopsIntegrations.configureJenkins(devopsConfig.jenkins.config as any);
      }
      setMessage({ type: 'success', text: 'DevOps configuration saved successfully' });
      await testConnections();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save DevOps configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const addNotificationChannel = () => {
    const newChannel = {
      id: `channel-${Date.now()}`,
      type: 'email',
      name: 'New Channel',
      config: {},
      enabled: false,
      priority: 'medium'
    };
    setNotificationChannels(prev => [...prev, newChannel]);
  };

  const removeNotificationChannel = (channelId: string) => {
    setNotificationChannels(prev => prev.filter(ch => ch.id !== channelId));
  };

  const getConnectionStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getConnectionStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Connected
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
        Disconnected
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Advanced Settings</h2>
          <p className="text-muted-foreground">
            Configure database connections, cloud providers, DevOps tools, and notifications
          </p>
        </div>
        <Button onClick={testConnections} disabled={isLoading}>
          <TestTube className="h-4 w-4 mr-2" />
          Test Connections
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="cloud" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Cloud
          </TabsTrigger>
          <TabsTrigger value="devops" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            DevOps
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Database Configuration */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Configuration
              </CardTitle>
              <CardDescription>
                Configure database connections for storing metrics, alerts, and configuration data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-type">Database Type</Label>
                  <Select value={databaseConfig.type} onValueChange={(value: any) => handleDatabaseConfigChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select database type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indexeddb">IndexedDB (Local)</SelectItem>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                      <SelectItem value="redis">Redis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-status">Connection Status</Label>
                  <div className="flex items-center gap-2">
                    {getConnectionStatusIcon(connectionStatus.database)}
                    {getConnectionStatusBadge(connectionStatus.database)}
                  </div>
                </div>
              </div>

              {databaseConfig.type !== 'indexeddb' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="db-host">Host</Label>
                    <Input
                      id="db-host"
                      value={databaseConfig.host || ''}
                      onChange={(e) => handleDatabaseConfigChange('host', e.target.value)}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-port">Port</Label>
                    <Input
                      id="db-port"
                      type="number"
                      value={databaseConfig.port || ''}
                      onChange={(e) => handleDatabaseConfigChange('port', parseInt(e.target.value))}
                      placeholder="5432"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-username">Username</Label>
                    <Input
                      id="db-username"
                      value={databaseConfig.username || ''}
                      onChange={(e) => handleDatabaseConfigChange('username', e.target.value)}
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-password">Password</Label>
                    <Input
                      id="db-password"
                      type="password"
                      value={databaseConfig.password || ''}
                      onChange={(e) => handleDatabaseConfigChange('password', e.target.value)}
                      placeholder="password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-database">Database Name</Label>
                    <Input
                      id="db-database"
                      value={databaseConfig.database || ''}
                      onChange={(e) => handleDatabaseConfigChange('database', e.target.value)}
                      placeholder="devops_sentinel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="db-ssl">SSL</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="db-ssl"
                        checked={databaseConfig.ssl || false}
                        onCheckedChange={(checked) => handleDatabaseConfigChange('ssl', checked)}
                      />
                      <Label htmlFor="db-ssl">Enable SSL</Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={saveDatabaseConfig} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cloud Configuration */}
        <TabsContent value="cloud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Cloud Provider Configuration
              </CardTitle>
              <CardDescription>
                Configure AWS, Azure, and GCP credentials for cloud monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AWS Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Amazon Web Services (AWS)</h3>
                  <div className="flex items-center gap-2">
                    {getConnectionStatusIcon(connectionStatus.aws)}
                    {getConnectionStatusBadge(connectionStatus.aws)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aws-access-key">Access Key ID</Label>
                    <Input
                      id="aws-access-key"
                      value={cloudCredentials.aws?.accessKeyId || ''}
                      onChange={(e) => handleCloudCredentialsChange('aws', 'accessKeyId', e.target.value)}
                      placeholder="AKIA..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aws-secret-key">Secret Access Key</Label>
                    <Input
                      id="aws-secret-key"
                      type="password"
                      value={cloudCredentials.aws?.secretAccessKey || ''}
                      onChange={(e) => handleCloudCredentialsChange('aws', 'secretAccessKey', e.target.value)}
                      placeholder="Secret key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aws-region">Region</Label>
                    <Select value={cloudCredentials.aws?.region || ''} onValueChange={(value) => handleCloudCredentialsChange('aws', 'region', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Azure Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Microsoft Azure</h3>
                  <div className="flex items-center gap-2">
                    {getConnectionStatusIcon(connectionStatus.azure)}
                    {getConnectionStatusBadge(connectionStatus.azure)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="azure-tenant-id">Tenant ID</Label>
                    <Input
                      id="azure-tenant-id"
                      value={cloudCredentials.azure?.tenantId || ''}
                      onChange={(e) => handleCloudCredentialsChange('azure', 'tenantId', e.target.value)}
                      placeholder="Tenant ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="azure-client-id">Client ID</Label>
                    <Input
                      id="azure-client-id"
                      value={cloudCredentials.azure?.clientId || ''}
                      onChange={(e) => handleCloudCredentialsChange('azure', 'clientId', e.target.value)}
                      placeholder="Client ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="azure-client-secret">Client Secret</Label>
                    <Input
                      id="azure-client-secret"
                      type="password"
                      value={cloudCredentials.azure?.clientSecret || ''}
                      onChange={(e) => handleCloudCredentialsChange('azure', 'clientSecret', e.target.value)}
                      placeholder="Client Secret"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="azure-subscription-id">Subscription ID</Label>
                    <Input
                      id="azure-subscription-id"
                      value={cloudCredentials.azure?.subscriptionId || ''}
                      onChange={(e) => handleCloudCredentialsChange('azure', 'subscriptionId', e.target.value)}
                      placeholder="Subscription ID"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* GCP Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Google Cloud Platform (GCP)</h3>
                  <div className="flex items-center gap-2">
                    {getConnectionStatusIcon(connectionStatus.gcp)}
                    {getConnectionStatusBadge(connectionStatus.gcp)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gcp-project-id">Project ID</Label>
                    <Input
                      id="gcp-project-id"
                      value={cloudCredentials.gcp?.projectId || ''}
                      onChange={(e) => handleCloudCredentialsChange('gcp', 'projectId', e.target.value)}
                      placeholder="Project ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gcp-key-file">Service Account Key File</Label>
                    <Input
                      id="gcp-key-file"
                      value={cloudCredentials.gcp?.keyFilename || ''}
                      onChange={(e) => handleCloudCredentialsChange('gcp', 'keyFilename', e.target.value)}
                      placeholder="Path to key file"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveCloudCredentials} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Cloud Credentials
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DevOps Configuration */}
        <TabsContent value="devops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                DevOps Tools Configuration
              </CardTitle>
              <CardDescription>
                Configure Kubernetes, Docker, Jenkins, and Git integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Kubernetes Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Kubernetes</h3>
                    <Switch
                      checked={devopsConfig.kubernetes.enabled}
                      onCheckedChange={(checked) => handleDevopsConfigChange('kubernetes', 'enabled', checked)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {getConnectionStatusIcon(connectionStatus.kubernetes)}
                    {getConnectionStatusBadge(connectionStatus.kubernetes)}
                  </div>
                </div>
                {devopsConfig.kubernetes.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="k8s-api-server">API Server</Label>
                      <Input
                        id="k8s-api-server"
                        value={devopsConfig.kubernetes.config.apiServer || ''}
                        onChange={(e) => handleDevopsConfigChange('kubernetes', 'config', { ...devopsConfig.kubernetes.config, apiServer: e.target.value })}
                        placeholder="https://kubernetes.default.svc"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="k8s-token">Service Account Token</Label>
                      <Input
                        id="k8s-token"
                        type="password"
                        value={devopsConfig.kubernetes.config.token || ''}
                        onChange={(e) => handleDevopsConfigChange('kubernetes', 'config', { ...devopsConfig.kubernetes.config, token: e.target.value })}
                        placeholder="Service account token"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Docker Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Docker</h3>
                    <Switch
                      checked={devopsConfig.docker.enabled}
                      onCheckedChange={(checked) => handleDevopsConfigChange('docker', 'enabled', checked)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {getConnectionStatusIcon(connectionStatus.docker)}
                    {getConnectionStatusBadge(connectionStatus.docker)}
                  </div>
                </div>
                {devopsConfig.docker.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="docker-host">Host</Label>
                      <Input
                        id="docker-host"
                        value={devopsConfig.docker.config.host || ''}
                        onChange={(e) => handleDevopsConfigChange('docker', 'config', { ...devopsConfig.docker.config, host: e.target.value })}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="docker-port">Port</Label>
                      <Input
                        id="docker-port"
                        type="number"
                        value={devopsConfig.docker.config.port || ''}
                        onChange={(e) => handleDevopsConfigChange('docker', 'config', { ...devopsConfig.docker.config, port: parseInt(e.target.value) })}
                        placeholder="2375"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Jenkins Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Jenkins</h3>
                    <Switch
                      checked={devopsConfig.jenkins.enabled}
                      onCheckedChange={(checked) => handleDevopsConfigChange('jenkins', 'enabled', checked)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {getConnectionStatusIcon(connectionStatus.jenkins)}
                    {getConnectionStatusBadge(connectionStatus.jenkins)}
                  </div>
                </div>
                {devopsConfig.jenkins.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jenkins-url">Jenkins URL</Label>
                      <Input
                        id="jenkins-url"
                        value={devopsConfig.jenkins.config.url || ''}
                        onChange={(e) => handleDevopsConfigChange('jenkins', 'config', { ...devopsConfig.jenkins.config, url: e.target.value })}
                        placeholder="http://localhost:8080"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jenkins-username">Username</Label>
                      <Input
                        id="jenkins-username"
                        value={devopsConfig.jenkins.config.username || ''}
                        onChange={(e) => handleDevopsConfigChange('jenkins', 'config', { ...devopsConfig.jenkins.config, username: e.target.value })}
                        placeholder="Username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jenkins-api-token">API Token</Label>
                      <Input
                        id="jenkins-api-token"
                        type="password"
                        value={devopsConfig.jenkins.config.apiToken || ''}
                        onChange={(e) => handleDevopsConfigChange('jenkins', 'config', { ...devopsConfig.jenkins.config, apiToken: e.target.value })}
                        placeholder="API Token"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={saveDevopsConfig} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save DevOps Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Configuration */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>
                Configure email, Slack, webhook, and other notification channels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Channels</h3>
                <Button onClick={addNotificationChannel} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
              </div>

              <div className="space-y-4">
                {notificationChannels.map((channel, index) => (
                  <div key={channel.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Input
                          value={channel.name}
                          onChange={(e) => {
                            const updatedChannels = [...notificationChannels];
                            updatedChannels[index].name = e.target.value;
                            setNotificationChannels(updatedChannels);
                          }}
                          className="w-48"
                        />
                        <Select value={channel.type} onValueChange={(value) => {
                          const updatedChannels = [...notificationChannels];
                          updatedChannels[index].type = value;
                          setNotificationChannels(updatedChannels);
                        }}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="slack">Slack</SelectItem>
                            <SelectItem value="webhook">Webhook</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="push">Push</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={channel.enabled}
                          onCheckedChange={(checked) => {
                            const updatedChannels = [...notificationChannels];
                            updatedChannels[index].enabled = checked;
                            setNotificationChannels(updatedChannels);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeNotificationChannel(channel.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {channel.type === 'email' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>SMTP Host</Label>
                          <Input placeholder="smtp.gmail.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>SMTP Port</Label>
                          <Input placeholder="587" type="number" />
                        </div>
                        <div className="space-y-2">
                          <Label>Username</Label>
                          <Input placeholder="username@gmail.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input placeholder="Password" type="password" />
                        </div>
                      </div>
                    )}

                    {channel.type === 'slack' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Webhook URL</Label>
                          <Input placeholder="https://hooks.slack.com/..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Channel</Label>
                          <Input placeholder="#alerts" />
                        </div>
                      </div>
                    )}

                    {channel.type === 'webhook' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Webhook URL</Label>
                          <Input placeholder="https://api.example.com/webhook" />
                        </div>
                        <div className="space-y-2">
                          <Label>Method</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="POST">POST</SelectItem>
                              <SelectItem value="PUT">PUT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Configuration */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure authentication, authorization, and security policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground">Enable 2FA for enhanced security</p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Session Timeout</h3>
                    <p className="text-sm text-muted-foreground">Automatically log out inactive users</p>
                  </div>
                  <Select defaultValue="8h">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="4h">4 hours</SelectItem>
                      <SelectItem value="8h">8 hours</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Audit Logging</h3>
                    <p className="text-sm text-muted-foreground">Log all user actions for compliance</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">IP Whitelist</h3>
                    <p className="text-sm text-muted-foreground">Restrict access to specific IP addresses</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Data Encryption</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Encryption Algorithm</Label>
                    <Select defaultValue="aes-256">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aes-128">AES-128</SelectItem>
                        <SelectItem value="aes-256">AES-256</SelectItem>
                        <SelectItem value="chacha20">ChaCha20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Key Rotation</Label>
                    <Select defaultValue="90d">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30d">30 days</SelectItem>
                        <SelectItem value="90d">90 days</SelectItem>
                        <SelectItem value="180d">180 days</SelectItem>
                        <SelectItem value="365d">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 