'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Document {
  _id: string;
  loanId?: string;
  loanNumber?: string;
  fileName: string;
  originalName: string;
  documentType?: string;
  description?: string;
  fileType?: string;
  fileSize?: number;
  fileSizeFormatted?: string;
  path?: string;
  s3Key?: string;
  uploadedAt?: Date;
  url?: string;
  folderName?: string;
  fullName?: string;
  error?: string;
  storageType?: string;
}

export default function LoanDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const loanNumber = params.loanNumber as string;
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [totalSize, setTotalSize] = useState('');
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [s3Status, setS3Status] = useState<{ total: number; s3Count: number; localCount: number; folderPath: string }>({ total: 0, s3Count: 0, localCount: 0, folderPath: '' });

  useEffect(() => {
    if (loanNumber) {
      fetchDocuments();
    }
  }, [loanNumber]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      let allDocuments: Document[] = [];
      let foundExisting = false;
      let foundNew = false;
      
      // First try existing S3 structure (customer_id_name format)
      const existingS3Response = await fetch(`/api/existing-s3-documents/${loanNumber}`);
      
      if (existingS3Response.ok) {
        const existingData = await existingS3Response.json();
        
        if (existingData.success && existingData.documents && existingData.documents.length > 0) {
          foundExisting = true;
          
          // Transform existing S3 data to match Document interface
          const transformedDocs = existingData.documents.map((doc: any) => ({
            _id: doc.id,
            fileName: doc.filename,
            originalName: doc.filename,
            fileSize: doc.size,
            uploadedAt: doc.lastModified,
            s3Key: doc.s3Key,
            path: doc.downloadUrl,
            folderName: doc.customerFolder,
            fullName: doc.customerFolder.split('_').slice(1).join(' '), // Extract customer name
            storageType: 'existing-structure'
          }));
          
          allDocuments = [...allDocuments, ...transformedDocs];
          
          // Extract customer name from folder
          if (existingData.documents.length > 0) {
            const customerFolder = existingData.documents[0].customerFolder;
            const customerName = customerFolder.split('_').slice(1).join(' ');
            setCustomerName(customerName);
          }
        }
      }
      
      // Then try admin API (new structure + MongoDB)
      const response = await fetch(`/api/admin/get-documents?loanId=${loanNumber}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.documents && data.documents.length > 0) {
          foundNew = true;
          
          // Add new structure documents
          const newStructureDocs = data.documents.map((doc: any) => ({
            ...doc,
            storageType: 'new-structure'
          }));
          
          allDocuments = [...allDocuments, ...newStructureDocs];
          
          // Extract customer name from first document if not already set
          if (!customerName && data.documents[0].fullName) {
            setCustomerName(data.documents[0].fullName);
          }
        }
      }
      
      if (allDocuments.length > 0) {
        setDocuments(allDocuments);
        
        // Calculate total size and S3 status
        const total = allDocuments.reduce((sum: number, doc: Document) => sum + (doc.fileSize || 0), 0);
        setTotalSize(formatBytes(total));
        
        // Count documents by storage type
        const existingStructureDocs = allDocuments.filter((doc: any) => doc.storageType === 'existing-structure');
        const newStructureDocs = allDocuments.filter((doc: any) => doc.storageType === 'new-structure');
        
        setS3Status({
          total: allDocuments.length,
          s3Count: allDocuments.length, // All are S3 documents
          localCount: 0,
          folderPath: foundExisting ? 
            `${existingStructureDocs[0]?.folderName}/` : 
            `documents/${loanNumber}/`
        });
        
      } else {
        setError('No documents found for this loan number.');
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png': return '🖼️';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      default: return '📎';
    }
  };

  const getDocumentType = (doc: Document) => {
    return doc.documentType || doc.description || 'General Document';
  };

  const getFormattedDate = (doc: Document) => {
    const date = doc.uploadedAt;
    if (!date) return 'Unknown date';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const viewDocument = (doc: Document) => {
    // Check if this is an existing S3 document with direct URL
    if (doc.path && doc.path.startsWith('https://')) {
      window.open(doc.path, '_blank');
      showNotification(`Opening document: ${doc.originalName || doc.fileName}`, 'success');
    } else if (doc._id) {
      const viewUrl = `/api/admin/download-document?id=${doc._id}`;
      window.open(viewUrl, '_blank');
      showNotification(`Opening document: ${doc.originalName || doc.fileName}`, 'success');
    } else {
      console.error('No document ID or URL found for document:', doc);
      showNotification('Error: Document file not found. Please try again.', 'error');
    }
  };

  const downloadDocument = (doc: Document, fileName: string) => {
    // Check if this is an existing S3 document with direct URL
    if (doc.path && doc.path.startsWith('https://')) {
      // Show download feedback
      setDownloadingFile(doc.fileName);
      
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = doc.path;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clear download feedback after a short delay
      setTimeout(() => {
        setDownloadingFile(null);
        showNotification(`Download started: ${fileName}`, 'success');
      }, 1000);
    } else if (doc._id) {
      const downloadUrl = `/api/admin/download-document?id=${doc._id}`;
      
      // Show download feedback
      setDownloadingFile(doc.fileName);
      
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clear download feedback after a short delay
      setTimeout(() => {
        setDownloadingFile(null);
        showNotification(`Download started: ${fileName}`, 'success');
      }, 1000);
    } else {
      console.error('No document ID or URL found for document:', doc);
      showNotification('Error: Document file not found. Please try again.', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const goBack = () => {
    router.push('/loan-number');
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#f0f7ff]">
        <Navbar />

        {/* Notification */}
        {notification && (
          <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            notification.type === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? '✅' : '❌'}
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white shadow-sm border-b border-[#c5d7fa]">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={goBack}
                  className="flex items-center text-[#1a4cde] hover:text-[#1543c2] mb-2 transition"
                >
                  ← Back to Search
                </button>
                <h1 className="text-3xl font-bold text-[#1a4cde]">
                  Documents for {loanNumber}
                </h1>
                {customerName && (
                  <p className="text-lg text-gray-600 mt-1">Customer: {customerName}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Documents</div>
                <div className="text-2xl font-bold text-[#1a4cde]">{documents.length}</div>
                {totalSize && (
                  <div className="text-sm text-gray-600">{totalSize}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-grow p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a4cde]"></div>
                <span className="ml-3 text-gray-600">Loading documents...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-red-600 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-red-800 mb-2">No Documents Found</h3>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={goBack}
                  className="mt-4 px-4 py-2 bg-[#1a4cde] text-white rounded hover:bg-[#1543c2] transition"
                >
                  Try Another Loan Number
                </button>
              </div>
            )}

            {!isLoading && !error && documents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {documents.map((doc, index) => (
                  <div
                    key={doc._id || index}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="text-3xl">
                            {getDocumentIcon(doc.fileName)}
                          </div>
                          {/* Storage Type Indicator */}
                          {doc.storageType === 'existing-structure' ? (
                            <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                              <span>☁️</span>
                              <span>Existing</span>
                            </div>
                          ) : doc.storageType === 'new-structure' ? (
                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                              <span>☁️</span>
                              <span>New</span>
                            </div>
                          ) : doc.path && doc.path.includes('s3.ap-south-1.amazonaws.com') ? (
                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                              <span>☁️</span>
                              <span>S3</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                              <span>💾</span>
                              <span>Local</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {doc.fileSizeFormatted || (doc.fileSize ? formatBytes(doc.fileSize) : 'Unknown size')}
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-[#1a4cde] mb-2 line-clamp-2">
                        {doc.originalName || doc.fileName}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {getDocumentType(doc)}
                      </p>
                      
                      <p className="text-xs text-gray-500 mb-4">
                        Uploaded: {getFormattedDate(doc)}
                      </p>
                      
                      {doc.error ? (
                        <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                          Error: {doc.error}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewDocument(doc)}
                            className="flex-1 bg-[#1a4cde] text-white py-2 px-3 rounded hover:bg-[#1543c2] transition text-sm font-medium flex items-center justify-center gap-1"
                            title="Open document in new tab"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => downloadDocument(doc, doc.originalName || doc.fileName)}
                            disabled={downloadingFile === doc.fileName}
                            className={`flex-1 text-white py-2 px-3 rounded transition text-sm font-medium flex items-center justify-center gap-1 ${
                              downloadingFile === doc.fileName 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                            title="Download document to your device"
                          >
                            {downloadingFile === doc.fileName ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                                Downloading...
                              </>
                            ) : (
                              <>📥 Download</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !error && documents.length > 0 && (
              <div className="mt-8 text-center">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 inline-block">
                  <h3 className="font-semibold text-gray-800 mb-2">Document Summary</h3>
                  <div className="text-sm text-gray-600">
                    <p>Total Files: <span className="font-medium">{documents.length}</span></p>
                    <p>Total Size: <span className="font-medium">{totalSize}</span></p>
                    <p>Loan Number: <span className="font-medium">{loanNumber}</span></p>
                    {customerName && <p>Customer: <span className="font-medium">{customerName}</span></p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-[#c5d7fa] text-center bg-white">
          <p className="text-sm text-gray-600">
            © 2025 <span className="text-[#1a4cde]">BizLoan</span>. All rights reserved.
          </p>
        </footer>
      </div>
    </ProtectedRoute>
  );
} 