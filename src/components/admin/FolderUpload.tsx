'use client';

import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  relativePath?: string;
}

interface FolderUploadProps {
  onUploadComplete?: () => void;
}

interface FileWithPath extends File {
  webkitRelativePath?: string;
}

export default function FolderUpload({ onUploadComplete }: FolderUploadProps) {
  const [loanId, setLoanId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as FileWithPath[];
      setSelectedFiles(prev => [...prev, ...files]);
      setUploadProgress(prev => [
        ...prev,
        ...files.map(file => ({
          fileName: file.name,
          progress: 0,
          status: 'uploading' as const,
          relativePath: file.webkitRelativePath || undefined
        }))
      ]);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as FileWithPath[];
      console.log('Selected folder with files:', files.map(f => ({ name: f.name, path: f.webkitRelativePath })));
      
      setSelectedFiles(files);
      setUploadProgress(
        files.map(file => ({
          fileName: file.name,
          progress: 0,
          status: 'uploading' as const,
          relativePath: file.webkitRelativePath || undefined
        }))
      );
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setUploadProgress([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const updateProgress = (fileName: string, progress: number, status?: 'uploading' | 'completed' | 'error') => {
    setUploadProgress(prev =>
      prev.map(item =>
        item.fileName === fileName
          ? { 
              ...item, 
              progress, 
              status: status || (progress === 100 ? 'completed' : 'uploading')
            }
          : item
      )
    );
  };

  const switchMode = (mode: 'files' | 'folder') => {
    setUploadMode(mode);
    clearAllFiles();
  };

  const organizeFilesByFolder = (files: FileWithPath[]) => {
    const folderStructure: { [key: string]: FileWithPath[] } = {};
    
    files.forEach(file => {
      if (file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/');
        const folderPath = pathParts.slice(0, -1).join('/');
        
        if (!folderStructure[folderPath]) {
          folderStructure[folderPath] = [];
        }
        folderStructure[folderPath].push(file);
      } else {
        // Files without relative path (individual files)
        if (!folderStructure['root']) {
          folderStructure['root'] = [];
        }
        folderStructure['root'].push(file);
      }
    });
    
    return folderStructure;
  };

  const handleUpload = async () => {
    if (!loanId.trim()) {
      toast.error('Please enter a loan ID');
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error('Please select files or a folder to upload');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${selectedFiles.length} files...`);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          const formData = new FormData();
          formData.append('loanNumber', loanId);
          formData.append('files', file);
          formData.append('description', uploadMode === 'folder' ? 'Uploaded from folder' : 'Uploaded from admin panel');
          formData.append('fullName', 'Admin User');
          
          // Add folder path if available
          if (file.webkitRelativePath) {
            formData.append('folderPath', file.webkitRelativePath);
          }

          const xhr = new XMLHttpRequest();
          
          // Track upload progress
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              updateProgress(file.name, progress);
            }
          };

          // Create promise to handle the upload
          await new Promise<void>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                updateProgress(file.name, 100, 'completed');
                successCount++;
                resolve();
              } else {
                updateProgress(file.name, 0, 'error');
                errorCount++;
                reject(new Error(`Upload failed: ${xhr.statusText}`));
              }
            };
            xhr.onerror = () => {
              updateProgress(file.name, 0, 'error');
              errorCount++;
              reject(new Error('Upload failed'));
            };
            
            xhr.open('POST', '/api/admin/upload-document');
            xhr.send(formData);
          });
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          updateProgress(file.name, 0, 'error');
          errorCount++;
        }
      }

      if (successCount > 0 && errorCount === 0) {
        toast.success(`All ${successCount} files uploaded successfully!`, { id: toastId });
      } else if (successCount > 0 && errorCount > 0) {
        toast.success(`${successCount} files uploaded successfully, ${errorCount} failed`, { id: toastId });
      } else {
        toast.error('All uploads failed', { id: toastId });
      }
      
      // Reset form after successful uploads
      if (successCount > 0) {
        setLoanId('');
        clearAllFiles();
        
        // Notify parent component
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const folderStructure = uploadMode === 'folder' ? organizeFilesByFolder(selectedFiles) : null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Upload Documents to S3 Bucket</h2>
      
      {/* Upload Mode Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Mode
        </label>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => switchMode('files')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploadMode === 'files'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📄 Individual Files
          </button>
          <button
            type="button"
            onClick={() => switchMode('folder')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploadMode === 'folder'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📁 Entire Folder
          </button>
        </div>
      </div>
      
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
            {uploadMode === 'files' ? 'Documents *' : 'Folder *'}
          </label>
          
          {uploadMode === 'files' ? (
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
              disabled={isUploading}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            />
          ) : (
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderSelect}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500"
              disabled={isUploading}
            />
          )}
          
          <p className="text-xs text-gray-500 mt-1">
            {uploadMode === 'files' 
              ? 'Select multiple files (PDF, Images, Word, Excel)'
              : 'Select a folder - all files inside will be uploaded with folder structure preserved'
            }
          </p>
        </div>

        {/* Folder Structure Preview */}
        {uploadMode === 'folder' && folderStructure && Object.keys(folderStructure).length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-medium text-gray-700 mb-2">📁 Folder Structure Preview:</h3>
            {Object.entries(folderStructure).map(([folderPath, files]) => (
              <div key={folderPath} className="mb-2">
                <div className="font-medium text-sm text-blue-600">
                  📁 {folderPath || 'Root'}/ ({files.length} files)
                </div>
                <div className="ml-4 text-xs text-gray-600">
                  {files.map((file, idx) => (
                    <div key={idx}>📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">
                Upload Progress ({uploadProgress.filter(f => f.status === 'completed').length}/{uploadProgress.length} completed)
              </h3>
              {!isUploading && (
                <button
                  onClick={clearAllFiles}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {uploadProgress.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div className="flex-1 mr-4">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-700">{file.fileName}</p>
                    {file.relativePath && (
                      <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {file.relativePath}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        file.status === 'completed' 
                          ? 'bg-green-500' 
                          : file.status === 'error' 
                          ? 'bg-red-500' 
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">{file.progress}%</p>
                    <p className={`text-xs font-medium ${
                      file.status === 'completed' ? 'text-green-600' :
                      file.status === 'error' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {file.status === 'completed' ? '✓ Complete' :
                       file.status === 'error' ? '✗ Failed' : '⏳ Uploading...'}
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className={`flex-1 py-3 px-4 rounded font-medium transition-all ${
              isUploading || selectedFiles.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading {selectedFiles.length} files...</span>
              </div>
            ) : (
              `Upload ${selectedFiles.length} ${uploadMode === 'folder' ? 'files from folder' : 'files'} to S3`
            )}
          </button>
          
          {selectedFiles.length > 0 && !isUploading && (
            <button
              onClick={clearAllFiles}
              className="px-4 py-3 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>

        {/* Upload Statistics */}
        {uploadProgress.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Upload Summary:</strong> Total: {uploadProgress.length} | 
              Completed: {uploadProgress.filter(f => f.status === 'completed').length} | 
              Failed: {uploadProgress.filter(f => f.status === 'error').length} | 
              In Progress: {uploadProgress.filter(f => f.status === 'uploading').length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 