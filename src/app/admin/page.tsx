'use client';

import { useState, useEffect } from 'react';
import UserManagement from '@/components/UserManagement';
import UploadFolder from '@/components/UploadFolder';
import AdminHeader from '@/components/admin/AdminHeader';
import { Toaster } from 'react-hot-toast';

interface DatabaseInfo {
  database: string;
  collections: string[];
  stats: {
    collections: number;
    views: number;
    objects: number;
    avgObjSize: number;
    dataSize: number;
    storageSize: number;
    indexes: number;
    indexSize: number;
  };
}

export default function AdminPage() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState('');
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'upload-folder'>('users');
  const [showIPHelp, setShowIPHelp] = useState(false);

  // Check authentication and test MongoDB connection on page load
  useEffect(() => {
    // Check if user is authenticated
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      // Redirect to login page if not authenticated
      window.location.href = '/admin/login';
      return;
    }
    
    // Test MongoDB connection
    testMongoConnection();
  }, []);

  async function testMongoConnection() {
    try {
      setDbStatus('loading');
      const response = await fetch('/api/admin/test-db', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setDbStatus('connected');
        setDbInfo({
          database: data.database,
          collections: data.collections,
          stats: data.stats
        });
      } else {
        setDbStatus('error');
        setErrorMessage(data.error || 'Failed to connect to database');
        setErrorType(data.errorType || '');
      }
    } catch (error) {
      setDbStatus('error');
      setErrorMessage('Failed to connect to database');
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <AdminHeader />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8">
        {/* Main Content Area */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6">
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-[#7928ca] text-[#7928ca] font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } py-4 px-8 border-b-2 text-center text-sm sm:text-base transition-colors duration-200 ease-in-out`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('upload-folder')}
                className={`${
                  activeTab === 'upload-folder'
                    ? 'border-[#7928ca] text-[#7928ca] font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } py-4 px-8 border-b-2 text-center text-sm sm:text-base transition-colors duration-200 ease-in-out`}
              >
                Upload Folder
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {dbStatus === 'connected' ? (
              <div>
                {activeTab === 'users' ? (
                  <UserManagement />
                ) : (
                  <UploadFolder />
                )}
              </div>
            ) : dbStatus === 'loading' ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7928ca]"></div>
                <span className="ml-3 text-gray-600">Loading data...</span>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-300 rounded-md p-4 my-4">
                <h3 className="text-red-800 font-medium">Connection Error</h3>
                <p className="text-red-700 mt-1">{errorMessage || 'Failed to connect to database. Please check your connection settings.'}</p>
                <div className="mt-3 flex space-x-3">
                  <button
                    onClick={testMongoConnection}
                    className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 