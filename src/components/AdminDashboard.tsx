
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserManagement from '@/components/UserManagement';
import DocumentUpload from '@/components/DocumentUpload';

export default function AdminDashboard() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'documents'>('users');
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
      const username = localStorage.getItem('adminUsername');
      
      if (!isAuthenticated) {
        // Redirect to login if not authenticated
        router.push('/admin');
        return;
      }
      
      setAdminUsername(username);
      setIsLoading(false);
    };
    
    checkAuth();
  }, [router]);
  
  // Check MongoDB connection
  useEffect(() => {
    async function testMongoConnection() {
      try {
        const response = await fetch('/api/admin/test-db', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setDbStatus('connected');
        } else {
          setDbStatus('error');
          setErrorMessage(data.error || 'Failed to connect to database');
        }
      } catch (error) {
        setDbStatus('error');
        setErrorMessage('Error testing database connection');
        console.error('DB connection test error:', error);
      }
    }
    
    if (!isLoading) {
      testMongoConnection();
    }
  }, [isLoading]);
  
  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminUsername');
    router.push('/admin');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f2ff]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7928ca] mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-[#f8f2ff]">
      <div className="bg-[#5a1c9e] text-white px-4 py-3 flex justify-between items-center">
        <div className="font-medium">ADMIN CONTROL PANEL</div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, {adminUsername}</span>
          <button 
            onClick={handleLogout}
            className="text-sm bg-[#4a168c] px-3 py-1 rounded hover:bg-[#40147a] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="flex-grow p-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-[#7928ca]">Admin Dashboard</h1>
            <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
              dbStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : dbStatus === 'error' 
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                dbStatus === 'connected' 
                  ? 'bg-green-500' 
                  : dbStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}></span>
              {dbStatus === 'connected' 
                ? 'MongoDB Connected' 
                : dbStatus === 'error'
                  ? 'Connection Error'
                  : 'Connecting...'}
            </div>
          </div>
          
          {dbStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-6">
              <p className="font-bold">MongoDB Connection Error</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}
          
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users' 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents' 
                    ? 'border-purple-500 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Document Management
              </button>
            </nav>
          </div>
          
          {dbStatus === 'connected' ? (
            <>
              {activeTab === 'users' && <UserManagement />}
              {activeTab === 'documents' && <DocumentUpload />}
            </>
          ) : dbStatus === 'loading' ? (
            <div className="py-10 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#7928ca] mb-4"></div>
              <p>Connecting to MongoDB...</p>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p>Cannot load admin panel due to database connection error.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 