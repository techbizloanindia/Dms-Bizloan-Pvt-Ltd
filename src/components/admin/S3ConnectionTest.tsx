'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface S3TestResult {
  success: boolean;
  message: string;
  details?: {
    bucketName: string;
    region: string;
    testFileUploaded: boolean;
    testFileRetrieved: boolean;
    contentVerified: boolean;
    testFileDeleted: boolean;
  };
  error?: string;
}

const S3ConnectionTest = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<S3TestResult | null>(null);

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/test-s3');
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        toast.success('S3 connection successful!');
      } else {
        toast.error('S3 connection failed. Check console for details.');
      }
    } catch (error) {
      console.error('Error testing S3 connection:', error);
      setResult({
        success: false,
        message: 'Error occurred while testing connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Error occurred while testing connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <h2 className="text-xl font-semibold mb-2">S3 Connection Test</h2>
      <p className="text-gray-600 mb-4">
        Test the connection to S3 by uploading, retrieving, and deleting a test file.
      </p>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className={`px-4 py-2 rounded font-medium ${
          loading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? 'Testing...' : 'Test S3 Connection'}
      </button>
      
      {result && (
        <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <h3 className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.success ? '✅ Connection Successful' : '❌ Connection Failed'}
          </h3>
          <p className="mt-1">{result.message}</p>
          
          {result.details && (
            <div className="mt-2 text-sm">
              <p><strong>Bucket:</strong> {result.details.bucketName}</p>
              <p><strong>Region:</strong> {result.details.region}</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <p>
                  <span className={result.details.testFileUploaded ? 'text-green-600' : 'text-red-600'}>
                    {result.details.testFileUploaded ? '✓' : '✗'}
                  </span> Upload Test
                </p>
                <p>
                  <span className={result.details.testFileRetrieved ? 'text-green-600' : 'text-red-600'}>
                    {result.details.testFileRetrieved ? '✓' : '✗'}
                  </span> Retrieval Test
                </p>
                <p>
                  <span className={result.details.contentVerified ? 'text-green-600' : 'text-red-600'}>
                    {result.details.contentVerified ? '✓' : '✗'}
                  </span> Content Verification
                </p>
                <p>
                  <span className={result.details.testFileDeleted ? 'text-green-600' : 'text-red-600'}>
                    {result.details.testFileDeleted ? '✓' : '✗'}
                  </span> Deletion Test
                </p>
              </div>
            </div>
          )}
          
          {result.error && (
            <div className="mt-2 text-sm text-red-700">
              <p><strong>Error:</strong> {result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default S3ConnectionTest; 