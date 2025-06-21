'use client';

import { useState, useEffect, useCallback } from 'react';
import S3Upload from './S3Upload';

interface S3Object {
  folders: string[];
  files: string[];
}

const S3Browser = () => {
  const [data, setData] = useState<S3Object>({ folders: [], files: [] });
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [loanId, setLoanId] = useState('');

  const fetchData = useCallback(async (path: string) => {
    setLoading(true);
    const response = await fetch(`/api/admin/s3/list-folders?prefix=${path}`);
    const result = await response.json();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentPath) {
      fetchData(currentPath);
    }
  }, [currentPath, fetchData]);

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const handleSearch = () => {
    if (loanId) {
      const match = loanId.match(/\d{4}$/);
      const extractedId = match ? match[0] : loanId;
      setCurrentPath(`documents/${extractedId}/`);
    }
  };

  const handleBackClick = () => {
    const newPath = currentPath.split('/').slice(0, -2).join('/') + '/';
    setCurrentPath(newPath === '/' ? '' : newPath);
  };

  const handleUploadSuccess = () => {
    if (currentPath) {
      fetchData(currentPath);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">S3 Bucket Browser</h1>
      
      <div className="mb-4">
        <input
          type="text"
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
          placeholder="Enter Loan ID (e.g., BIZLN-3878)"
          className="border p-2 rounded"
        />
        <button onClick={handleSearch} className="ml-2 px-4 py-2 bg-blue-500 text-white rounded">
          Search
        </button>
      </div>

      {currentPath && (
        <button onClick={handleBackClick} className="mb-4 px-4 py-2 bg-gray-200 rounded">
          Back
        </button>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <h2 className="text-xl font-semibold">Folders</h2>
          <ul className="list-disc ml-5">
            {data.folders.map((folder) => (
              <li key={folder} onClick={() => handleFolderClick(folder)} className="cursor-pointer text-blue-500">
                {folder.replace(currentPath, '').replace('/', '')}
              </li>
            ))}
          </ul>
          <h2 className="text-xl font-semibold mt-4">Files</h2>
          <ul className="list-disc ml-5">
            {data.files.map((file) => (
              <li key={file}>{file.replace(currentPath, '')}</li>
            ))}
          </ul>
        </div>
      )}
      <S3Upload currentPath={currentPath} onUploadSuccess={handleUploadSuccess} />
    </div>
  );
};

export default S3Browser;