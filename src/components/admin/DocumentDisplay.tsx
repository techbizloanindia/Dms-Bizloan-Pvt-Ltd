'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Document {
  id: string;
  key: string;
  fileName: string;
  originalName: string;
  folderPath: string;
  loanId: string;
  fileSize: number;
  lastModified: string;
  url: string;
  fileType: string;
  etag: string;
}

interface DocumentDisplayProps {
  refreshTrigger?: number;
}

const DocumentDisplay = ({ refreshTrigger }: DocumentDisplayProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [searchLoanId, setSearchLoanId] = useState('');
  const [totalFound, setTotalFound] = useState(0);

  const fetchDocuments = async (loanId?: string) => {
    setLoading(true);
    setError(null);
    setConnectionStatus('testing');
    
    try {
      console.log('🔄 Fetching documents from S3...');
      
      const url = new URL('/api/admin/fetch-documents', window.location.origin);
      if (loanId) {
        url.searchParams.set('loanId', loanId);
      }
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();
      console.log('📊 Document fetch response:', data);

      if (response.ok && data.success) {
        setDocuments(data.documents || []);
        setTotalFound(data.totalFound || 0);
        setConnectionStatus('connected');
        toast.success(`Successfully loaded ${data.successfullyProcessed || 0} documents from S3`);
        console.log(`✅ Successfully fetched ${data.successfullyProcessed} documents`);
      } else {
        throw new Error(data.message || data.error || 'Failed to fetch documents');
      }
    } catch (error: any) {
      console.error('❌ Error fetching documents:', error);
      setError(error.message || 'Failed to connect to S3');
      setConnectionStatus('error');
      toast.error(`S3 connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const handleSearch = () => {
    fetchDocuments(searchLoanId.trim() || undefined);
  };

  const handleViewDocument = (doc: Document) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
      toast.success(`Opening ${doc.fileName}`);
    } else {
      toast.error('Document URL not available');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      default: return '📁';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-green-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">📁 Documents from S3</h2>
            <p className="text-green-100">
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
            onClick={() => fetchDocuments(searchLoanId.trim() || undefined)}
            disabled={loading}
            className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white rounded transition-colors"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Search Section */}
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            value={searchLoanId}
            onChange={(e) => setSearchLoanId(e.target.value)}
            placeholder="Enter loan ID (e.g., 3878 or BIZLN-3878) or leave empty for all documents"
            className="flex-1 p-2 border rounded focus:ring-2 focus:ring-green-500"
            disabled={loading}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? '🔍 Searching...' : '🔍 Search'}
          </button>
          <button
            onClick={() => {
              setSearchLoanId('3878');
              fetchDocuments('3878');
            }}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
          >
            📂 Find 3878
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2 text-gray-600">Connecting to S3...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-red-800 font-medium">S3 Connection Error</h3>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={() => fetchDocuments()}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No documents found in S3 bucket</p>
            <p className="text-sm mt-1">
              {searchLoanId ? `No documents for loan "${searchLoanId}"` : 'Upload some documents to see them here'}
            </p>
          </div>
        )}

        {!loading && !error && documents.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Found {documents.length} documents
                {totalFound !== documents.length && (
                  <span className="text-sm text-gray-500 ml-1">
                    (showing {documents.length} of {totalFound} total)
                  </span>
                )}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{getFileIcon(doc.fileType)}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {doc.fileName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          Loan: {doc.loanId}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600 mb-3">
                    <div>📊 Size: {formatFileSize(doc.fileSize)}</div>
                    <div>📅 Modified: {formatDate(doc.lastModified)}</div>
                    <div>🗂️ Type: {doc.fileType.toUpperCase()}</div>
                    <div className="truncate">📁 Path: {doc.folderPath}</div>
                  </div>
                  
                  <button
                    onClick={() => handleViewDocument(doc)}
                    className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    👁️ View Document
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentDisplay; 