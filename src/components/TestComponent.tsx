import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { authService } from '@/services/authService';

export const TestComponent: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allUsers = await authService.getAllUsers();
      const allLogs = await authService.getAllActivityLogs();
      setUsers(allUsers);
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const createTestUser = async () => {
    try {
      const userId = await authService.createUser({
        username: `testuser-${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        fullName: `Test User ${Date.now()}`,
        role: 'user' as const,
        permissions: ['monitoring:read'],
        isActive: true
      });
      setMessage(`User created with ID: ${userId}`);
      await loadData();
    } catch (error) {
      setMessage(`Failed to create user: ${error}`);
      console.error('Failed to create user:', error);
    }
  };

  const clearMessage = () => setMessage('');

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Test Component</h2>
      
      <div className="space-y-4">
        <Button onClick={createTestUser}>Create Test User</Button>
        <Button onClick={loadData} variant="outline">Refresh Data</Button>
        <Button onClick={clearMessage} variant="ghost">Clear Message</Button>
      </div>

      {message && (
        <div className="p-4 bg-blue-100 border border-blue-300 rounded-md">
          <p className="text-blue-800">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Users ({users.length})</h3>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="p-3 border rounded-md">
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Activity Logs ({logs.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="p-3 border rounded-md text-sm">
                <p><strong>Action:</strong> {log.action}</p>
                <p><strong>Description:</strong> {log.description}</p>
                <p><strong>User ID:</strong> {log.userId}</p>
                <p><strong>Time:</strong> {new Date(log.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
