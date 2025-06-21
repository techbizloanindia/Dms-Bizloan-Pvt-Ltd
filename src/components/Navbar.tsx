'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './AuthProvider';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-[#1a4cde] py-4 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="bg-white p-2 rounded-lg mr-3">
                <Image
                  src="/logo.png"
                  alt="BizLoan Logo"
                  width={120}
                  height={40}
                  className="w-auto h-auto"
                />
              </div>
              <span className="text-white font-bold text-xl">BizLoan</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Link
                  href="/user-dashboard"
                  className="text-white hover:text-blue-200 transition"
                >
                  
                </Link>
                
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-white hover:text-blue-200 transition"
                  >
                    Admin Panel
                  </Link>
                )}
              </>
            )}
            
            {user ? (
              <div className="flex items-center">
                <span className="text-white mr-4">
                  Welcome, {user.name || user.username}
                </span>
                <button
                  onClick={logout}
                  className="bg-white text-[#1a4cde] px-4 py-2 rounded hover:bg-gray-100 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-white text-[#1a4cde] px-4 py-2 rounded hover:bg-gray-100 transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 