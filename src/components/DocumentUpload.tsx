'use client';

import { useState, useRef, useEffect } from 'react';

type UploadedDocument = {
  id: string;
  name: string;
  path: string;
  fullName?: string;
  loanNumber?: string;
  description?: string;
  uploadDate?: string;
  fileSize?: number;
  fileType?: string;
};

export default function DocumentUpload() {
  const [loanNumber, setLoanNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [allDocuments, setAllDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all documents on component mount
  useEffect(() => {
    fetchAllDocuments();
  }, []);

  const fetchAllDocuments = async () => {
    setIsLoadingDocs(true);
    setError('');
    try {
      const response = await fetch('/api/admin/get-documents');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAllDocuments(data.documents.map((doc: any) => ({
          id: doc._id,
          name: doc.fileName || doc.originalName,
          path: doc.path,
          fullName: doc.fullName,
          loanNumber: doc.loanId || doc.loanNumber,
          description: doc.description,
          uploadDate: new Date(doc.uploadedAt).toLocaleString(),
          fileSize: doc.fileSize,
          fileType: doc.fileType
        })));
      } else {
        throw new Error(data.message || 'Failed to fetch documents');
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setError(`Error loading documents: ${error.message || 'Unknown error'}`);
      setAllDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError('');
    setSuccess('');
    setIsUploading(true);
    setUploadProgress(0);
    
    // Validate loan number (should be in format BIZLN-XXXX)
    const loanPattern = /^BIZLN-\d+$/;
    if (!loanPattern.test(loanNumber)) {
      setError('Please enter a valid loan number format (BIZLN-XXXX)');
      setIsUploading(false);
      return;
    }

    // Validate full name is provided
    if (!fullName.trim()) {
      setError('Please enter the full name');
      setIsUploading(false);
      return;
    }
    
    // Check if files are selected
    if (!fileInputRef.current?.files || fileInputRef.current.files.length === 0) {
      setError('Please select at least one file to upload');
      setIsUploading(false);
      return;
    }
    
    try {
      // Create form data with all required fields
      const formData = new FormData();
      formData.append('loanNumber', loanNumber);
      formData.append('fullName', fullName);
      
      // Add all selected files
      Array.from(fileInputRef.current.files).forEach(file => {
        formData.append('files', file);
      });
      
      // Use XMLHttpRequest instead of fetch to track upload progress
      const xhr = new XMLHttpRequest();
      
      // Setup the progress event
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });
      
      // Create a promise to use async/await with XMLHttpRequest
      const response = await new Promise<{
        ok: boolean;
        json: () => Promise<any>;
        status?: number;
      }>((resolve, reject) => {
        xhr.open('POST', '/api/upload-document');
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              ok: true,
              json: () => JSON.parse(xhr.responseText)
            });
          } else {
            reject({
              status: xhr.status,
              statusText: xhr.statusText,
              json: () => JSON.parse(xhr.responseText)
            });
          }
        };
        
        xhr.onerror = function() {
          reject({
            status: xhr.status,
            statusText: xhr.statusText,
            json: () => ({ error: 'Network error occurred' })
          });
        };
        
        xhr.send(formData);
      });
      
      // Handle response
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to upload documents');
      }
      
      // Success
      setSuccess(`${data.message}`);
      setUploadedDocs(data.documents || []);
      
      // Reset form
      setLoanNumber('');
      setFullName('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh the document list
      fetchAllDocuments();
    } catch (err: any) {
      console.error('Error uploading documents:', err);
      setError(err.message || 'An error occurred while uploading documents');
    } finally {
      setIsUploading(false);
      // Reset progress after a slight delay to show 100% completion
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const formatFileName = (name: string): string => {
    if (name.length <= 25) return name;
    const ext = name.split('.').pop();
    const baseName = name.substring(0, name.lastIndexOf('.'));
    return `${baseName.substring(0, 20)}...${ext}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Document Management</h2>
        <button 
          onClick={fetchAllDocuments}
          className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors duration-200 flex items-center shadow-sm"
          disabled={isLoadingDocs}
        >
          {isLoadingDocs ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>
      
      {/* Upload Form Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-[#7928ca] to-[#9d50e7] px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Upload New Documents</h3>
        </div>
      
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="loanNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Loan ID <span className="text-red-500">*</span>
              </label>
              <input
                id="loanNumber"
                type="text"
                value={loanNumber}
                onChange={(e) => setLoanNumber(e.target.value.toUpperCase())}
                placeholder="BIZLN-1234"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                disabled={isUploading}
              />
              <p className="mt-1 text-xs text-gray-500">Format: BIZLN-XXXX</p>
            </div>
            
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                disabled={isUploading}
              />
            </div>
          </div>
          
          {/* File Upload Area */}
          <div className="mb-6">
            <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-1">
              Select Files <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-purple-500 transition-colors duration-200 bg-gray-50">
              <div className="space-y-1 text-center">
                <svg 
                  className="mx-auto h-12 w-12 text-gray-400" 
                  stroke="currentColor" 
                  fill="none" 
                  viewBox="0 0 48 48" 
                  aria-hidden="true"
                >
                  <path 
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H8m36-12h-4m4 0H20" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                </svg>
                <div className="flex flex-col text-sm text-gray-600">
                  <label 
                    htmlFor="files" 
                    className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none px-4 py-2 mx-auto mb-2 shadow-sm border border-gray-200"
                  >
                    <span>Select files</span>
                    <input 
                      ref={fileInputRef}
                      id="files"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      required
                      disabled={isUploading}
                      className="sr-only"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setSelectedFiles(Array.from(e.target.files));
                        } else {
                          setSelectedFiles([]);
                        }
                      }}
                    />
                  </label>
                  <p className="text-gray-500">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Accepted formats: PDF, Word, Excel, JPEG, PNG (Max 50MB per file)
                </p>
              </div>
            </div>
            
            {/* Display selected files */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({selectedFiles.length}):</h4>
                <ul className="bg-white rounded-md border border-gray-200 divide-y divide-gray-200 max-h-48 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {file.type.includes('pdf') ? (
                            <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          ) : file.type.includes('image') ? (
                            <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-3 truncate">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="ml-2 text-gray-400 hover:text-red-500"
                        onClick={() => {
                          setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                          if (fileInputRef.current) {
                            // This clears the file input, but we need to manage our selected files separately
                            fileInputRef.current.value = '';
                          }
                        }}
                        disabled={isUploading}
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Error or success messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Upload Successful!</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>{success}</p>
                    {uploadedDocs.length > 0 && (
                      <ul className="mt-1 list-disc list-inside">
                        {uploadedDocs.map((doc, index) => (
                          <li key={index} className="text-sm">{doc.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-gradient-to-r from-[#7928ca] to-[#9d50e7] text-white font-medium py-2 px-6 rounded-md transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="flex flex-col items-center space-y-1">
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading... {uploadProgress}%
                  </span>
                  {/* Progress bar */}
                  <div className="w-full bg-purple-300 bg-opacity-50 rounded-full h-1.5">
                    <div 
                      className="bg-white h-1.5 rounded-full transition-all duration-300 ease-in-out" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : 'Upload Documents'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Recently uploaded documents */}
      {uploadedDocs.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-green-50 px-6 py-4 border-b border-green-100">
            <h3 className="text-lg font-semibold text-green-800 flex items-center">
              <svg className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Recent Uploads
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {uploadedDocs.map(doc => (
              <li key={doc.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <svg className="h-8 w-8 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium">{formatFileName(doc.name)}</span>
                  </div>
                  <a
                    href={`/api/admin/download-document?id=${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center"
                  >
                    <span>View</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* All Documents Table Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Document Library</h3>
        </div>
        
        <div className="p-6">
          {isLoadingDocs ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading documents...</span>
            </div>
          ) : allDocuments.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">{formatFileName(doc.name)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {doc.fullName || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {doc.loanNumber || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {doc.fileType?.split('/').pop()?.toUpperCase() || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {doc.fileSize ? formatFileSize(doc.fileSize) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {doc.uploadDate || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <a
                          href={`/api/admin/download-document?id=${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 font-medium inline-flex items-center"
                        >
                          <span>View</span>
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2h-12a2 2 0 01-2-2z"></path>
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
              <p className="mt-1 text-sm text-gray-500">Upload your first document to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 