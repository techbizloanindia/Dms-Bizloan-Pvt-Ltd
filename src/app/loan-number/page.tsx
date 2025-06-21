'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';



export default function LoanNumberLogin() {
  const router = useRouter();
  const [loanNumber, setLoanNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!loanNumber) {
      setError('Please enter a loan application number');
      return;
    }

    const loanPattern = /^BIZLN-\d+$/;
    if (!loanPattern.test(loanNumber)) {
      setError('Please enter a valid loan number format (BIZLN-XXXX)');
      return;
    }

    setIsLoading(true);
    
    // Navigate to the documents page
    router.push(`/loan-documents/${loanNumber}`);
  };



  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#f0f7ff]">
        <Navbar />

        {/* Main Content */}
        <main className="flex-grow flex flex-col items-center p-4 md:p-8">
          <div className="w-full max-w-md mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a4cde] mb-4">
              Find Your Loan Documents
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Enter your loan application number below to access your documents.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <div className="shadow-lg rounded-lg border-2 border-[#c5d7fa] p-2 bg-white">
                  <input
                    type="text"
                    value={loanNumber}
                    onChange={(e) => setLoanNumber(e.target.value.toUpperCase())}
                    placeholder="BIZLN-XXXX"
                    className={`w-full p-4 border border-transparent rounded text-center text-xl font-semibold ${loanNumber ? 'text-[#1a4cde] bg-[#f0f7ff]' : 'text-gray-800 bg-white'} focus:outline-none focus:ring-2 focus:ring-[#1a4cde] focus:border-[#1a4cde] transition-all duration-200`}
                    disabled={isLoading}
                  />
                </div>
                {loanNumber && (
                  <p className="mt-2 text-sm text-[#1a4cde]">{`Current input: ${loanNumber}`}</p>
                )}
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1a4cde] text-white font-medium py-4 px-4 rounded-lg transition hover:bg-[#1543c2] active:bg-[#1039a7] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg text-lg"
              >
                {isLoading ? "LOADING..." : "VIEW DOCUMENTS"}
              </button>
            </form>
          </div>


        </main>
        
        {/* Footer */}
        <footer className="py-4 border-t border-[#c5d7fa] text-center">
          <p className="text-sm text-gray-600">
            © 2025 <span className="text-[#1a4cde]">BizLoan</span>. All rights reserved.
          </p>
        </footer>
      </div>
    </ProtectedRoute>
  );
} 