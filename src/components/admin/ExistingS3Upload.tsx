'use client';

import { useState } from 'react';

interface UploadedDocument {
  fileName: string;
  s3Key: string;
  size: number;
  type: string;
  customerFolder: string;
  s3Location: string;
  uploadedAt: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  loanNumber?: string;
  customerId?: string;
  customerName?: string;
  customerFolder?: string;
  uploadedFiles?: number;
  documents?: UploadedDocument[];
  s3Structure?: {
    bucket: string;
    folderPath: string;
    storageType: string;
  };
  error?: string;
}

export default function ExistingS3Upload() {
  const [loanNumber, setLoanNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState<UploadResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loanNumber || !customerName || files.length === 0) {
      setResponse({
        success: false,
        message: 'Please provide loan number, customer name, and at least one file'
      });
      return;
    }

    setUploading(true);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append('loanNumber', loanNumber);
      formData.append('customerName', customerName);
      formData.append('description', description);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      const uploadResponse = await fetch('/api/admin/upload-existing-structure', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await uploadResponse.json();
      setResponse(result);

      if (result.success) {
        // Clear form on success
        setLoanNumber('');
        setCustomerName('');
        setDescription('');
        setFiles([]);
        
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }

    } catch (error) {
      setResponse({
        success: false,
        message: 'Network error: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 border border-blue-200">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <span className="text-lg">☁️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1a4cde]">
              ops-loan-data Upload
            </h2>
            <p className="text-gray-600">
              Upload documents directly to the ops-loan-data S3 bucket
            </p>
          </div>
        </div>
        
        <div className="bg-blue-600 text-white p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span>🎯</span>
            <span className="font-semibold">Target Bucket:</span>
            <span className="font-mono bg-blue-700 px-2 py-1 rounded">ops-loan-data</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-2">
            <span>📁</span>
            <span className="font-semibold">Folder Structure:</span>
            <span className="font-mono bg-blue-700 px-2 py-1 rounded">CUSTOMER_ID_CUSTOMER_NAME/</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="loanNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Loan Number *
            </label>
            <input
              type="text"
              id="loanNumber"
              value={loanNumber}
              onChange={(e) => setLoanNumber(e.target.value)}
              placeholder="e.g., BIZLN-3878 or 3878"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1a4cde] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., GEETA SINGH"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1a4cde] focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for the upload"
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1a4cde] focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-1">
            Files *
          </label>
          <input
            type="file"
            id="file-input"
            multiple
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1a4cde] focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Supported: PDF, Images (JPG, PNG, GIF), Word, Excel, Text files. Max 50MB per file.
          </p>
        </div>

        {files.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Selected Files ({files.length})
            </h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getFileIcon(file.type)}</span>
                    <div>
                      <div className="font-medium text-sm">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatBytes(file.size)} • {file.type}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !loanNumber || !customerName || files.length === 0}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            uploading || !loanNumber || !customerName || files.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#1a4cde] text-white hover:bg-[#1543c2] shadow-lg'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Uploading to ops-loan-data...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>📤</span>
              Upload to ops-loan-data
            </div>
          )}
        </button>
      </form>

      {response && (
        <div className={`mt-6 p-4 rounded-md ${
          response.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`font-medium ${
            response.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {response.success ? '✅' : '❌'} {response.message}
          </div>
          
          {response.success && response.documents && (
            <div className="mt-3 space-y-2">
              <div className="text-sm text-green-700">
                <strong>📍 Uploaded to bucket:</strong> 
                <span className="font-mono bg-green-100 px-2 py-1 rounded ml-1">
                  {response.s3Structure?.bucket}
                </span>
              </div>
              <div className="text-sm text-green-700">
                <strong>📁 Folder path:</strong> 
                <span className="font-mono bg-green-100 px-2 py-1 rounded ml-1">
                  {response.customerFolder}/
                </span>
              </div>
              <div className="text-sm text-green-700">
                <strong>📊 Files uploaded:</strong> {response.uploadedFiles}
              </div>
              
              <div className="mt-2">
                <details>
                  <summary className="text-sm text-green-700 cursor-pointer hover:text-green-800">
                    View uploaded files
                  </summary>
                  <div className="mt-2 space-y-1">
                    {response.documents.map((doc, index) => (
                      <div key={index} className="text-xs text-green-600 font-mono bg-green-100 p-2 rounded">
                        📄 {doc.fileName} ({formatBytes(doc.size)})
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          )}
          
          {!response.success && response.error && (
            <div className="mt-2 text-sm text-red-600">
              Error: {response.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
 