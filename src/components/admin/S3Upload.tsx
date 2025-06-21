'use client';

import { useState } from 'react';

interface S3UploadProps {
  currentPath: string;
  onUploadSuccess: () => void;
}

const S3Upload = ({ currentPath, onUploadSuccess }: S3UploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath);

    const response = await fetch('/api/admin/s3/upload', {
      method: 'POST',
      body: formData,
    });

    setUploading(false);
    if (response.ok) {
      onUploadSuccess();
      setFile(null);
    } else {
      alert('Upload failed');
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold">Upload File</h2>
      <input type="file" onChange={handleFileChange} className="mt-2" />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

export default S3Upload;