'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface UploadResult {
  success: boolean;
  message: string;
  results?: {
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  };
  processingTimeMs?: number;
}

export default function UploadFolder() {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loanNumber, setLoanNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [description, setDescription] = useState('');
  const [preserveFolderStructure, setPreserveFolderStructure] = useState(true);
  const [s3Status, setS3Status] = useState<'checking' | 'connected' | 'error' | null>(null);
  const [s3Error, setS3Error] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Check S3 connectivity on component mount
  useEffect(() => {
    const checkS3Connection = async () => {
      setS3Status('checking');
      try {
        const response = await fetch('/api/admin/test-s3-connection');
        const result = await response.json();
        
        if (result.success) {
          setS3Status('connected');
          setS3Error('');
        } else {
          setS3Status('error');
          setS3Error(result.error || 'S3 connection failed');
        }
      } catch (error) {
        setS3Status('error');
        setS3Error('Failed to test S3 connection');
      }
    };

    checkS3Connection();
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  }, []);

  // Handle folder selection
  const handleFolderSelect = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get total size of selected files
  const getTotalSize = (): string => {
    if (!selectedFiles) return '0 Bytes';
    let total = 0;
    for (let i = 0; i < selectedFiles.length; i++) {
      total += selectedFiles[i].size;
    }
    return formatFileSize(total);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select files or folders to upload');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('loanNumber', loanNumber.trim() || ''); // Send empty if not provided, backend will auto-generate
      formData.append('fullName', fullName.trim() || ''); // Send empty if not provided, backend will auto-extract
      formData.append('description', description.trim() || 'Folder upload from admin panel');
      formData.append('preserveFolderStructure', preserveFolderStructure.toString());

      // Add all files with their folder paths
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        formData.append('files', file);
        
        // Add folder path for each file (webkitRelativePath for folder uploads)
        const folderPath = (file as any).webkitRelativePath || file.name;
        formData.append('folderPath', folderPath);
      }

      const response = await fetch('/api/admin/upload-folder', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResult = await response.json();

      if (result.success) {
        toast.success(result.message);
        
        // Reset form
        setLoanNumber('');
        setFullName('');
        setDescription('');
        setSelectedFiles(null);
        setPreserveFolderStructure(true);
        
        // Reset file inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
        
        // Show detailed results if available
        if (result.results) {
          console.log('Upload Results:', result.results);
          if (result.results.errors.length > 0) {
            console.log('Upload Errors:', result.results.errors);
          }
        }
      } else {
        toast.error(result.message || 'Upload failed');
        
        // Show detailed error information
        if (result.results?.errors.length) {
          console.error('Upload errors:', result.results.errors);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setLoanNumber('');
    setFullName('');
    setDescription('');
    setSelectedFiles(null);
    setPreserveFolderStructure(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              Upload Folders & Files
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Simply drag & drop folders - Loan ID and names are auto-generated from folder structure
            </p>
          </div>
          
          {/* S3 Status Indicator */}
          <div className="flex items-center space-x-2">
            {s3Status === 'checking' && (
              <div className="flex items-center text-blue-100">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                <span className="text-sm">Checking S3...</span>
              </div>
            )}
            {s3Status === 'connected' && (
              <div className="flex items-center text-green-200">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-sm">S3 Connected</span>
              </div>
            )}
            {s3Status === 'error' && (
              <div className="flex items-center text-red-200" title={s3Error}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-sm">S3 Error</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Optional Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Loan Number - Optional */}
          <div>
            <label htmlFor="loanNumber" className="block text-sm font-semibold text-gray-700 mb-2">
              Loan ID <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              id="loanNumber"
              type="text"
              value={loanNumber}
              onChange={(e) => setLoanNumber(e.target.value)}
              placeholder="BIZLN-1234 (auto-generated if empty)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from folder name</p>
            {selectedFiles && selectedFiles.length > 0 && !loanNumber.trim() && (
              <div className="text-xs text-blue-600 mt-1">
                📁 Will auto-generate from folder: "{((Array.from(selectedFiles)[0] as any)?.webkitRelativePath?.split('/')[0] || 'uploaded files')}"
              </div>
            )}
          </div>

          {/* Full Name - Optional */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Leave empty to auto-extract from folder"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">Will be extracted from folder name if not provided</p>
            {selectedFiles && selectedFiles.length > 0 && !fullName.trim() && (
              <div className="text-xs text-blue-600 mt-1">
                📁 Will auto-extract from folder: "{((Array.from(selectedFiles)[0] as any)?.webkitRelativePath?.split('/')[0] || 'uploaded files')}"
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this upload..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            disabled={isUploading}
          />
        </div>

        {/* Folder Structure Option */}
        <div className="flex items-center space-x-3">
          <input
            id="preserveStructure"
            type="checkbox"
            checked={preserveFolderStructure}
            onChange={(e) => setPreserveFolderStructure(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            disabled={isUploading}
          />
          <label htmlFor="preserveStructure" className="text-sm font-medium text-gray-700">
            Preserve original folder structure in S3
          </label>
        </div>

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Folders & Files <span className="text-red-500">*</span>
          </label>
          
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFiles && selectedFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="text-center">
                  <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </p>
                  <p className="text-sm text-gray-500">Total size: {getTotalSize()}</p>
                </div>
                
                {/* File List Preview */}
                <div className="max-h-32 overflow-y-auto">
                  <div className="text-left space-y-1">
                    {Array.from(selectedFiles).slice(0, 10).map((file, index) => (
                      <div key={index} className="text-xs text-gray-600 truncate">
                        📄 {(file as any).webkitRelativePath || file.name} ({formatFileSize(file.size)})
                      </div>
                    ))}
                    {selectedFiles.length > 10 && (
                      <div className="text-xs text-gray-500 italic">
                        ... and {selectedFiles.length - 10} more files
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Choose folders or files to upload
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop here or click to browse
                  </p>
                </div>
              </div>
            )}

            {/* Upload Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                type="button"
                onClick={handleFolderSelect}
                disabled={isUploading}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
                Select Folder
              </button>
              
              <button
                type="button"
                onClick={handleFileSelect}
                disabled={isUploading}
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Select Files
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              or drag and drop folders/files here
            </p>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: "" } as any)}
            {...({ directory: "" } as any)}
            onChange={handleFolderChange}
            className="hidden"
            disabled={isUploading}
          />
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </div>

        {/* Accepted Formats */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-800">Accepted formats:</p>
              <p className="text-sm text-blue-700 mt-1">
                PDF, Word, Excel, JPEG, PNG, GIF, WebP, Text, CSV (Max 100MB per file)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={isUploading}
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Reset
          </button>
          
          <button
            type="submit"
            disabled={isUploading || !selectedFiles || selectedFiles.length === 0}
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Upload to S3
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 