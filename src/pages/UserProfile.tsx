import React from 'react';
import UserProfileComponent from '@/components/user/UserProfile';

const UserProfilePage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <UserProfileComponent />
    </div>
  );
};

export default UserProfilePage; 