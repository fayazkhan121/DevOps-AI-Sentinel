import React from 'react';
import UserManagement from '@/components/admin/UserManagement';

const AdminUsers: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <UserManagement />
    </div>
  );
};

export default AdminUsers; 