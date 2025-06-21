'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import DocumentSlider from '@/components/DocumentSlider';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDocumentSliderOpen, setIsDocumentSliderOpen] = useState(false);
  const router = useRouter();

  // Check if already logged in
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      router.push('/admin');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Hardcoded credentials check
    if (username === 'Bizloanindiapvtltd' && password === 'AdminBizloanindia') {
      // Set admin token in localStorage
      localStorage.setItem('adminToken', 'admin-authenticated');
      localStorage.setItem('adminUser', username);
      
      toast.success('Login successful');
      
      // Redirect to admin page
      setTimeout(() => {
        router.push('/admin');
      }, 1000);
    } else {
      setError('Invalid username or password');
      toast.error('Invalid username or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <Toaster position="top-right" />
      <DocumentSlider 
        isOpen={isDocumentSliderOpen} 
        onCloseAction={() => setIsDocumentSliderOpen(false)}
        documents={[]}
      />
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image 
              src="/logo.png" 
              alt="BizLoan Logo" 
              width={180} 
              height={60} 
              priority 
              className="w-auto h-auto"
            />
          </div>
          <div className="bg-[#5a1c9e] text-white px-4 py-2 rounded-md text-sm font-medium tracking-wider mb-4">
            ADMIN CONTROL PANEL
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Secure Login</h1>
          <p className="mt-2 text-gray-600">
            Please enter your admin credentials to continue
          </p>
          <div className="mt-2 text-indigo-700 font-medium">
            Admin Access Only
          </div>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>




            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {isLoading ? 'Logging in...' : 'Sign in'}
              </button>
            </div>
          </form>

        
        <div className="text-center mt-4 space-y-2">
          <button 
            onClick={() => setIsDocumentSliderOpen(true)}
            className="block w-full text-sm text-indigo-600 hover:text-indigo-500 font-medium py-2 hover:bg-indigo-50 rounded-md transition-colors"
          >
            View Documents
          </button>
          <Link href="/" className="block text-sm text-gray-500 hover:text-gray-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 