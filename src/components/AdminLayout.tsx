'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
  };

  // If not admin, show nothing
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Admin Bar */}
      <div className="bg-[#5a1c9e] text-white px-4 py-2 text-center text-sm font-medium tracking-wider">
        ADMIN CONTROL PANEL • RESTRICTED ACCESS
      </div>
      
      {/* Header */}
      <header className="bg-gradient-to-r from-[#7928ca] to-[#9d50e7] py-4 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-xl p-2 shadow-xl transform transition-transform hover:scale-105">
              <Link href="/">
                <Image
                  src="/logo.png" 
                  alt="BizLoan Logo" 
                  width={160} 
                  height={60} 
                  priority
                  className="w-auto h-auto"
                />
              </Link>
            </div>
            <h1 className="text-white text-2xl font-bold ml-2 hidden md:block">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-white text-sm border border-white/30">
              {user?.username || 'adminbizln'}
            </div>
            <button 
              onClick={handleLogout}
              className="bg-white text-[#7928ca] px-4 py-2 rounded-lg hover:bg-gray-100 transition font-medium shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar and Main Content */}
      <div className="flex flex-grow">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <nav className="py-6">
            <div className="px-6 pb-4 mb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#7928ca]">Administration</h2>
            </div>
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/admin" 
                  className="flex items-center px-6 py-3 text-purple-900 font-medium hover:bg-purple-50 border-l-4 border-purple-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  User Management
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/s3-browser"
                  className="flex items-center px-6 py-3 text-gray-600 font-medium hover:bg-purple-50 border-l-4 border-transparent transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 9h20" />
                  </svg>
                  S3 Browser
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/documents"
                  className="flex items-center px-6 py-3 text-gray-600 font-medium hover:bg-purple-50 border-l-4 border-transparent transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Document Viewer
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="flex items-center px-6 py-3 text-gray-600 font-medium hover:bg-purple-50 border-l-4 border-transparent transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Return to Main Site
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main Content */}
        <main className="flex-grow p-8">
          {children}
        </main>
      </div>
      
      {/* Footer */}
      <footer className="bg-[#7928ca] py-3 text-white text-center text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            Admin Panel • © 2025 <Link href="/" className="text-white hover:underline">BizLoan</Link> • All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
} 