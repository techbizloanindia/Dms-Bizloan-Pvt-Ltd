'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f0f7ff]">
        <Navbar />
        
        <main className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-[#1a4cde] mb-8">
            Welcome to BizLoan
          </h1>
          
          {user && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">User Information</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Username:</span> {user.username}</p>
                <p><span className="font-medium">Name:</span> {user.name}</p>
                <p><span className="font-medium">Role:</span> {user.role}</p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Loan Documents</h2>
              <p className="text-gray-600 mb-4">
                Access your business loan documents securely.
              </p>
              <a 
                href="/documents" 
                className="inline-block bg-[#1a4cde] text-white px-4 py-2 rounded hover:bg-[#1543c2] transition"
              >
                View Documents
              </a>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
              <p className="text-gray-600 mb-4">
                Manage your account preferences and settings.
              </p>
              <a 
                href="/settings" 
                className="inline-block bg-[#1a4cde] text-white px-4 py-2 rounded hover:bg-[#1543c2] transition"
              >
                Go to Settings
              </a>
            </div>
          </div>
        </main>
        
        <footer className="bg-white py-6 border-t mt-12">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-sm text-gray-600">
              © 2025 BizLoan. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
