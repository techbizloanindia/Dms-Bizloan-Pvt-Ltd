'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Document {
  _id: string;
  loanId: string;
  loanNumber?: string;
  fileName: string;
  originalName?: string;
  fileType: string;
  fileSize: number;
  path: string;
  uploadedAt: string;
  description?: string;
  fullName?: string;
}

interface DocumentSliderProps {
  isOpen: boolean;
  onCloseAction: () => void; // This is a client-side function, not a server action
  documents: Document[];
}

export default function DocumentSlider({ isOpen, onCloseAction, documents }: DocumentSliderProps) {
  const [localDocuments, setLocalDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && documents) {
      // Use the documents passed as props
      setLocalDocuments(documents);
      setIsLoading(false);
    }
  }, [isOpen, documents]);

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      // Use the content download endpoint that provides a downloadable file
      const response = await fetch(`/api/documents/download-content/${documentId}`);
      
      if (!response.ok) {
        // Try to parse error if possible
        let errorMessage = 'Failed to download document';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        
        console.error('Download error response:', response.status, errorMessage);
        throw new Error(errorMessage);
      }
      
      // Get the response as blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameFromHeader = contentDisposition
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : null;
        
      a.download = fileNameFromHeader || fileName || 'document.txt';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Document downloaded successfully');
      toast.success('Document downloaded successfully');
    } catch (error: any) {
      console.error('Download error:', error);
      setError('Failed to download document: ' + (error.message || 'Unknown error'));
      toast.error('Failed to download document');
    }
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onCloseAction}
          />
          
          {/* Slider */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full md:w-3/4 lg:w-2/3 xl:w-1/2 bg-white z-50 overflow-y-auto shadow-xl"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Document Viewer</h2>
                <button 
                  onClick={onCloseAction}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{error}</p>
                </div>
              ) : localDocuments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-lg mb-4">No documents available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localDocuments.map((doc) => (
                    <div key={doc._id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{doc.originalName || doc.fileName}</h3>
                            {doc.description && (
                              <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {doc.fileType.split('/').pop()?.toUpperCase() || 'FILE'}
                              </span>
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                {formatFileSize(doc.fileSize)}
                              </span>
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDownload(doc._id, doc.originalName || doc.fileName)}
                              className="flex items-center text-blue-600 hover:text-blue-900 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-md transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </button>
                            <a 
                              href={`/api/documents/view/${doc._id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center text-green-600 hover:text-green-900 font-medium bg-green-50 hover:bg-green-100 px-3 py-2 rounded-md transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
