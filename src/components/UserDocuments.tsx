'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  userId: string;
};

type LoanAccess = {
  loanId: string;
  documentCount: number;
};


export default function UserDocuments({ userId }: Props) {
  const [loans, setLoans] = useState<LoanAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserLoans = async () => {
      try {
        setIsLoading(true);
        // Fetch user data including loan access information
        const response = await fetch('/api/user');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user loan data');
        }
        
        const data = await response.json();
        const userLoanAccess = data.user.loanAccess || [];
        
        if (userLoanAccess.length === 0) {
          setLoans([]);
          setIsLoading(false);
          return;
        }
        
        // Fetch document counts for each loan
        const loanAccessWithCounts = await Promise.all(
          userLoanAccess.map(async (loanId: string) => {
            try {
              // Get document count for this loan
              const countResponse = await fetch(`/api/s3-documents/${loanId}`);
              if (countResponse.ok) {
                const countData = await countResponse.json();
                return {
                  loanId,
                  documentCount: countData.count || 0
                };
              }
              
              return {
                loanId,
                documentCount: 0
              };
            } catch (error) {
              console.error(`Error getting document count for loan ${loanId}:`, error);
              return {
                loanId,
                documentCount: 0
              };
            }
          })
        );
        
        setLoans(loanAccessWithCounts);
      } catch (err) {
        console.error('Error fetching user loans:', err);
        setError('Failed to load your loan data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserLoans();
  }, [userId]);

  const viewLoanDocuments = (loanId: string) => {
    // Open in a new tab instead of navigating in the current tab
    window.open(`/documents?loan=${encodeURIComponent(loanId)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Your Loan Documents</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Your Loan Documents</h2>
        <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Your Loan Documents</h2>
        <div className="bg-yellow-50 p-4 rounded-lg text-yellow-700">
          You currently don't have access to any loan documents.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-6">Your Loan Documents</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loans.map((loan) => (
          <div 
            key={loan.loanId}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-medium text-blue-700">{loan.loanId}</h3>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                loan.documentCount > 0 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {loan.documentCount} {loan.documentCount === 1 ? 'Document' : 'Documents'}
              </span>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              {loan.documentCount > 0 
                ? `Access ${loan.documentCount} document${loan.documentCount === 1 ? '' : 's'} related to this loan.`
                : 'No documents are currently available for this loan.'}
            </p>
            
            <button
              onClick={() => viewLoanDocuments(loan.loanId)}
              className={`w-full font-medium py-2 px-4 rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                loan.documentCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 text-gray-700 cursor-default'
              }`}
              disabled={loan.documentCount === 0}
            >
              {loan.documentCount > 0 ? 'View Documents' : 'No Documents Available'}
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-2">Need to access another loan?</h3>
        <p className="text-gray-600 mb-4">
          If you need to view documents for a different loan, please contact your loan officer to request access.
        </p>
        <Link 
          href="/dashboard" 
          className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          
        </Link>
      </div>
    </div>
  );
} 