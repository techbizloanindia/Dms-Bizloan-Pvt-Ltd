'use client';

import { useState, useCallback } from 'react';

interface S3File {
  key: string;
  url: string;
}

const DocumentSearch = () => {
  const [loanId, setLoanId] = useState('');
  const [files, setFiles] = useState<S3File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!loanId) {
      setError('Please enter a Loan ID.');
      return;
    }
    setLoading(true);
    setError(null);
    setFiles([]);

    try {
      const match = loanId.match(/\d{4}$/);
      const extractedId = match ? match[0] : loanId;
      const response = await fetch(`/api/admin/get-documents?loanId=${extractedId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents.');
      }
      const data = await response.json();
      setFiles(data.files);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
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
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div>
        <h2 className="text-xl font-semibold mt-4">Documents</h2>
        <ul className="list-disc ml-5">
          {files.map((file) => (
            <li key={file.key}>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                {file.key.split('/').pop()}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DocumentSearch;