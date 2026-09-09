import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Plus, 
  TestTube, 
  Settings, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Server,
  HardDrive,
  Cloud
} from "lucide-react";
import { databaseManager, DatabaseConnection, DatabaseResult } from "@/services/databaseManager";

const DatabaseSettings = () => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [defaultConnection, setDefaultConnection] = useState<string>('local');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("connections");
  const [testResults, setTestResults] = useState<Record<string, DatabaseResult>>({});
  const [backups, setBackups] = useState<any[]>([]);

  // New connection form state
  const [newConnection, setNewConnection] = useState<Partial<DatabaseConnection>>({
    type: 'postgresql',
    isActive: false
  });

  useEffect(() => {
    loadConnections();
    loadBackups();
  }, []);

  const loadConnections = async () => {
    try {
      const conns = await databaseManager.getAllConnections();
      setConnections(conns);
      setDefaultConnection(databaseManager.getDefaultConnection());
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  const loadBackups = async () => {
    try {
      const storedBackups = await databaseManager.listBackups();
      setBackups(storedBackups);
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  };

  const handleAddConnection = async () => {
    if (!newConnection.name || !newConnection.type) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const connection: DatabaseConnection = {
        id: `conn-${Date.now()}`,
        name: newConnection.name!,
        type: newConnection.type!,
        host: newConnection.host,
        port: newConnection.port,
        database: newConnection.database,
        username: newConnection.username,
        password: newConnection.password,
        connectionString: newConnection.connectionString,
        ssl: newConnection.ssl,
        poolSize: newConnection.poolSize,
        timeout: newConnection.timeout,
        isActive: false,
        metadata: newConnection.metadata
      };

      const success = await databaseManager.addConnection(connection);
      if (success) {
        await loadConnections();
        setNewConnection({ type: 'postgresql', isActive: false });
        alert('Connection added successfully!');
      } else {
        alert('Failed to add connection');
      }
    } catch (error) {
      console.error('Failed to add connection:', error);
      alert('Failed to add connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    setIsLoading(true);
    try {
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) return;

      const result = await databaseManager.testConnection(connection);
      setTestResults(prev => ({ ...prev, [connectionId]: result }));
    } catch (error) {
      console.error('Failed to test connection:', error);
      setTestResults(prev => ({ 
        ...prev, 
        [connectionId]: { success: false, error: 'Test failed' } 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (connectionId === 'local' || connectionId === 'indexeddb') {
      alert('Cannot remove default local connections');
      return;
    }

    if (confirm('Are you sure you want to remove this connection?')) {
      try {
        const success = await databaseManager.removeConnection(connectionId);
        if (success) {
          await loadConnections();
          alert('Connection removed successfully!');
        } else {
          alert('Failed to remove connection');
        }
      } catch (error) {
        console.error('Failed to remove connection:', error);
        alert('Failed to remove connection');
      }
    }
  };

  const handleSetDefaultConnection = async (connectionId: string) => {
    try {
      const success = await databaseManager.setDefaultConnection(connectionId);
      if (success) {
        setDefaultConnection(connectionId);
        alert('Default connection updated successfully!');
      } else {
        alert('Failed to update default connection');
      }
    } catch (error) {
      console.error('Failed to update default connection:', error);
      alert('Failed to update default connection');
    }
  };

  const handleBackupDatabase = async (connectionId: string) => {
    setIsLoading(true);
    try {
      const result = await databaseManager.backupDatabase(connectionId);
      if (result.success) {
        loadBackups();
        alert('Database backup completed successfully!');
      } else {
        alert(`Backup failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Backup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDatabase = async (connectionId: string, backupId: string) => {
    if (confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      setIsLoading(true);
      try {
        const result = await databaseManager.restoreDatabase(connectionId, backupId);
        if (result.success) {
          alert('Database restored successfully!');
        } else {
          alert(`Restore failed: ${result.error}`);
        }
      } catch (error) {
        console.error('Restore failed:', error);
        alert('Restore failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'postgresql':
      case 'mysql':
        return <Database className="h-4 w-4" />;
      case 'mongodb':
        return <Server className="h-4 w-4" />;
      case 'redis':
        return <HardDrive className="h-4 w-4" />;
      case 'sqlite':
        return <HardDrive className="h-4 w-4" />;
      case 'indexeddb':
      case 'localStorage':
        return <Cloud className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getConnectionStatusBadge = (connection: DatabaseConnection) => {
    if (connection.isActive) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    } else if (connection.error) {
      return <Badge variant="destructive">Error</Badge>;
    } else {
      return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  const getTestResultIcon = (connectionId: string) => {
    const result = testResults[connectionId];
    if (!result) return <TestTube className="h-4 w-4 text-gray-400" />;
    
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Management</h1>
          <p className="text-muted-foreground">
            Manage database connections, test connectivity, and configure external databases
          </p>
        </div>
        <Button onClick={() => setActiveTab("add")} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Connection
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="add">Add Connection</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Connections</CardTitle>
              <CardDescription>
                Manage your database connections and set the default database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connections.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getConnectionIcon(connection.type)}
                      <div>
                        <div className="font-semibold">{connection.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {connection.type.toUpperCase()}
                          {connection.host && ` • ${connection.host}:${connection.port}`}
                          {connection.database && ` • ${connection.database}`}
                        </div>
                        {connection.error && (
                          <div className="text-sm text-red-500 mt-1">
                            Error: {connection.error}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getConnectionStatusBadge(connection)}
                      
                      {connection.id !== 'local' && connection.id !== 'indexeddb' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(connection.id)}
                          disabled={isLoading}
                        >
                          {getTestResultIcon(connection.id)}
                          Test
                        </Button>
                      )}
                      
                      {defaultConnection === connection.id ? (
                        <Badge variant="outline">Default</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefaultConnection(connection.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      
                      {connection.id !== 'local' && connection.id !== 'indexeddb' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveConnection(connection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Database Connection</CardTitle>
              <CardDescription>
                Configure a new external database connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Connection Name</Label>
                  <Input
                    id="name"
                    value={newConnection.name || ''}
                    onChange={(e) => setNewConnection({...newConnection, name: e.target.value})}
                    placeholder="My PostgreSQL DB"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Database Type</Label>
                  <select
                    id="type"
                    value={newConnection.type || 'postgresql'}
                    onChange={(e) => setNewConnection({...newConnection, type: e.target.value as any})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mongodb">MongoDB</option>
                    <option value="redis">Redis</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={newConnection.host || ''}
                    onChange={(e) => setNewConnection({...newConnection, host: e.target.value})}
                    placeholder="localhost"
                  />
                </div>

                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={newConnection.port || ''}
                    onChange={(e) => setNewConnection({...newConnection, port: parseInt(e.target.value) || undefined})}
                    placeholder="5432"
                  />
                </div>

                <div>
                  <Label htmlFor="database">Database Name</Label>
                  <Input
                    id="database"
                    value={newConnection.database || ''}
                    onChange={(e) => setNewConnection({...newConnection, database: e.target.value})}
                    placeholder="mydb"
                  />
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newConnection.username || ''}
                    onChange={(e) => setNewConnection({...newConnection, username: e.target.value})}
                    placeholder="user"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newConnection.password || ''}
                    onChange={(e) => setNewConnection({...newConnection, password: e.target.value})}
                    placeholder="password"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="connectionString">Connection String (Optional)</Label>
                  <Input
                    id="connectionString"
                    value={newConnection.connectionString || ''}
                    onChange={(e) => setNewConnection({...newConnection, connectionString: e.target.value})}
                    placeholder="mongodb://user:pass@host:port/db"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ssl"
                      checked={newConnection.ssl || false}
                      onChange={(e) => setNewConnection({...newConnection, ssl: e.target.checked})}
                    />
                    <Label htmlFor="ssl">Use SSL</Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="poolSize">Pool Size</Label>
                    <Input
                      id="poolSize"
                      type="number"
                      value={newConnection.poolSize || ''}
                      onChange={(e) => setNewConnection({...newConnection, poolSize: parseInt(e.target.value) || undefined})}
                      placeholder="10"
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button onClick={handleAddConnection} disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Connection"}
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("connections")}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Backups</CardTitle>
              <CardDescription>
                Manage database backups and restore operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connections.filter(c => c.id !== 'local' && c.id !== 'indexeddb').map((connection) => (
                  <div key={connection.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{connection.name}</h3>
                      <Button
                        onClick={() => handleBackupDatabase(connection.id)}
                        disabled={isLoading}
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Create Backup
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {backups
                        .filter(b => b.connectionId === connection.id)
                        .map((backup, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="text-sm">
                              <div>Backup {index + 1}</div>
                              <div className="text-muted-foreground">
                                {new Date(backup.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreDatabase(connection.id, backup.id || index.toString())}
                              disabled={isLoading}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Performance Metrics</CardTitle>
              <CardDescription>
                Monitor database performance and connection health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => (
                  <div key={connection.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      {getConnectionIcon(connection.type)}
                      <h3 className="font-semibold">{connection.name}</h3>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        {getConnectionStatusBadge(connection)}
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="text-muted-foreground">{connection.type}</span>
                      </div>
                      {connection.lastConnected && (
                        <div className="flex justify-between">
                          <span>Last Connected:</span>
                          <span className="text-muted-foreground">
                            {new Date(connection.lastConnected).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {connection.host && (
                        <div className="flex justify-between">
                          <span>Host:</span>
                          <span className="text-muted-foreground">{connection.host}:{connection.port}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseSettings;
