'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function AdminHeader() {
  const [username, setUsername] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Get username from localStorage
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      setUsername(adminUser);
    }
  }, []);

  const handleLogout = () => {
    // Clear admin authentication
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    
    // Show success message
    toast.success('Logged out successfully');
    
    // Redirect to login page
    setTimeout(() => {
      router.push('/admin/login');
    }, 1000);
  };

  return (
    <div className="flex justify-between items-center py-4 px-6 bg-white border-b border-gray-200">
      <div className="flex items-center">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
          B
        </div>
        <h2 className="text-xl font-semibold text-gray-800">BizLoan Admin</h2>
      </div>
      
      <div className="flex items-center">
        {username && (
          <div className="mr-4 text-sm text-gray-600">
            Logged in as: <span className="font-medium text-gray-800">{username}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
