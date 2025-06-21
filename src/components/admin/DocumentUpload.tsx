'use client';

import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface DocumentUploadProps {
  onUploadComplete?: () => void;
}

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [loanId, setLoanId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      setUploadProgress(prev => [
        ...prev,
        ...files.map(file => ({
          fileName: file.name,
          progress: 0,
          status: 'uploading' as const
        }))
      ]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  const updateProgress = (fileName: string, progress: number) => {
    setUploadProgress(prev =>
      prev.map(item =>
        item.fileName === fileName
          ? { ...item, progress, status: progress === 100 ? 'completed' : 'uploading' }
          : item
      )
    );
  };

  const handleUpload = async () => {
    if (!loanId.trim()) {
      toast.error('Please enter a loan ID');
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Uploading documents...');

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('loanNumber', loanId);
        formData.append('files', file);
        formData.append('description', 'Uploaded from admin panel');
        formData.append('fullName', 'Admin User');

        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateProgress(file.name, progress);
          }
        };

        // Create promise to handle the upload
        await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          
          // Use the correct API endpoint for document upload
          xhr.open('POST', '/api/admin/upload-document');
          xhr.send(formData);
        });
      }

      toast.success('All documents uploaded successfully', { id: toastId });
      
      // Reset form
      setLoanId('');
      setSelectedFiles([]);
      setUploadProgress([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload some documents', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Upload Loan Documents to S3</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loan ID *
          </label>
          <input
            type="text"
            value={loanId}
            onChange={(e) => setLoanId(e.target.value)}
            placeholder="Enter loan ID (e.g., BIZLN-4189)"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
            disabled={isUploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Documents *
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
            disabled={isUploading}
          />
        </div>

        {/* Selected Files List with Progress */}
        {uploadProgress.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploadProgress.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium text-gray-700">{file.fileName}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        file.status === 'completed' 
                          ? 'bg-green-500' 
                          : file.status === 'error' 
                          ? 'bg-red-500' 
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{file.progress}% {file.status}</p>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0}
          className={`w-full py-2 px-4 rounded font-medium ${
            isUploading || selectedFiles.length === 0
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Documents to S3'}
        </button>
      </div>
    </div>
  );
} 