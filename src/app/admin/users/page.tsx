'use client';

import { useState } from 'react';
import CreateUser from '@/components/admin/CreateUser';
import UserList from '@/components/admin/UserList';
import { Toaster } from 'react-hot-toast';

export default function AdminUsersPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUserCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
        }} 
      />
      
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create and manage user accounts in the bizloan database
          </p>
        </div>

        <div className="grid gap-8">
          <div className="bg-white rounded-lg shadow">
            <CreateUser onUserCreated={handleUserCreated} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <UserList key={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
} 