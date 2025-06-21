'use client';

import React, { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import FolderUpload from './FolderUpload';

export default function AdvancedUpload() {
  const [activeTab, setActiveTab] = useState<'documents' | 'folder'>('documents');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Document Upload Center</h1>
        <p className="text-gray-600 mb-6">Upload individual files or entire folders to your S3 bucket with preserved folder structure.</p>
        
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'documents'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📄 Individual Files
          </button>
          <button
            onClick={() => setActiveTab('folder')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'folder'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📁 Folder Upload
          </button>
        </div>

        {/* Feature Comparison */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-lg border-2 transition-all ${
            activeTab === 'documents' 
              ? 'border-blue-200 bg-blue-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <h3 className="font-semibold text-blue-600 mb-2">📄 Individual Files</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Select multiple files at once</li>
              <li>• Upload progress for each file</li>
              <li>• Automatic file validation</li>
              <li>• Files stored with unique names</li>
            </ul>
          </div>
          
          <div className={`p-4 rounded-lg border-2 transition-all ${
            activeTab === 'folder' 
              ? 'border-purple-200 bg-purple-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <h3 className="font-semibold text-purple-600 mb-2">📁 Folder Upload</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Upload entire folder structures</li>
              <li>• Preserve folder hierarchy in S3</li>
              <li>• Folder structure preview</li>
              <li>• Batch processing with detailed progress</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Components */}
      {activeTab === 'documents' && (
        <DocumentUpload onUploadComplete={() => {
          console.log('Documents uploaded successfully');
        }} />
      )}

      {activeTab === 'folder' && (
        <FolderUpload onUploadComplete={() => {
          console.log('Folder uploaded successfully');
        }} />
      )}

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-gray-800 mb-3">📋 Upload Instructions</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-600 mb-2">Individual Files</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Enter the loan ID (e.g., BIZLN-4189)</li>
              <li>Click "Choose Files" and select multiple files</li>
              <li>Watch upload progress for each file</li>
              <li>Files are automatically validated and uploaded to S3</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium text-purple-600 mb-2">Folder Upload</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Enter the loan ID (e.g., BIZLN-4189)</li>
              <li>Click "Choose Folder" and select a folder</li>
              <li>Review the folder structure preview</li>
              <li>Upload preserves the original folder hierarchy</li>
            </ol>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>📁 S3 Structure:</strong> Files are stored as <code>documents/LOAN-ID/filename</code> for individual uploads, 
            or <code>documents/LOAN-ID/folder-path/filename</code> for folder uploads.
          </p>
        </div>
      </div>

      {/* Supported File Types */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-gray-800 mb-3">📎 Supported File Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-red-600 mb-1">Documents</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• PDF (.pdf)</li>
              <li>• Word (.doc, .docx)</li>
              <li>• Excel (.xls, .xlsx)</li>
              <li>• Text (.txt, .csv)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-green-600 mb-1">Images</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• JPEG (.jpg, .jpeg)</li>
              <li>• PNG (.png)</li>
              <li>• GIF (.gif)</li>
              <li>• WebP (.webp)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-600 mb-1">Limits</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Max file size: 100MB</li>
              <li>• No limit on file count</li>
              <li>• Folder depth: Unlimited</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-purple-600 mb-1">Features</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Progress tracking</li>
              <li>• Error handling</li>
              <li>• Automatic validation</li>
              <li>• MongoDB metadata</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 