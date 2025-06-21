'use client';

import AdvancedUpload from '@/components/admin/AdvancedUpload';

export default function UploadTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">S3 Folder Upload Test</h1>
          <p className="text-gray-600">Test the enhanced document upload functionality with folder support.</p>
        </div>
        
        <AdvancedUpload />
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">🧪 Testing Guide</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Individual Files:</strong> Select multiple files and upload them individually with progress tracking.</p>
            <p><strong>Folder Upload:</strong> Choose a folder from your computer and upload all files while preserving the folder structure.</p>
            <p><strong>S3 Structure:</strong> Check your S3 bucket to see how files are organized with the preserved folder hierarchy.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 