'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  loanAccess?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface UserDisplayProps {
  refreshTrigger?: number;
}

const UserDisplay = ({ refreshTrigger }: UserDisplayProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus('testing');
    
    try {
      console.log('🔄 Fetching users from MongoDB...');
      
      const response = await fetch('/api/admin/fetch-users', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();
      console.log('📊 User fetch response:', data);

      if (response.ok && data.success) {
        setUsers(data.users || []);
        setConnectionStatus('connected');
        toast.success(`Successfully loaded ${data.count || 0} users from MongoDB`);
        console.log(`✅ Successfully fetched ${data.count} users`);
      } else {
        throw new Error(data.message || data.error || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
      setError(error.message || 'Failed to connect to MongoDB');
      setConnectionStatus('error');
      toast.error(`MongoDB connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  const getStatusBadge = (isActive: boolean) => (
    <span className={`px-2 py-1 text-xs rounded-full ${
      isActive 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  const getRoleBadge = (role: string) => (
    <span className={`px-2 py-1 text-xs rounded-full ${
      role === 'admin' 
        ? 'bg-purple-100 text-purple-800' 
        : 'bg-blue-100 text-blue-800'
    }`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">👥 Users from MongoDB</h2>
            <p className="text-blue-100">
              Connection: 
              <span className={`ml-1 font-medium ${
                connectionStatus === 'connected' ? 'text-green-200' :
                connectionStatus === 'error' ? 'text-red-200' : 'text-yellow-200'
              }`}>
                {connectionStatus === 'connected' ? '✅ Connected' :
                 connectionStatus === 'error' ? '❌ Error' : '🔄 Testing...'}
              </span>
            </p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-800 text-white rounded transition-colors"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Connecting to MongoDB...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-red-800 font-medium">MongoDB Connection Error</h3>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No users found in MongoDB database</p>
            <p className="text-sm mt-1">Create some users to see them here</p>
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Found {users.length} users
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role & Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user.username}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.email && (
                            <div>📧 {user.email}</div>
                          )}
                          {user.phone && (
                            <div>📱 {user.phone}</div>
                          )}
                          {!user.email && !user.phone && (
                            <span className="text-gray-400">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getRoleBadge(user.role)}
                          {getStatusBadge(user.isActive)}
                        </div>
                        {user.loanAccess && user.loanAccess.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Access: {user.loanAccess.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDisplay; 