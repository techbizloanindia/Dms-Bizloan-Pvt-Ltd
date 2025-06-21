'use client';

import { useState, useEffect } from 'react';

const LoanFolders = () => {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await fetch('/api/admin/loan-folders');
        if (!res.ok) {
          throw new Error('Failed to fetch loan folders');
        }
        const data = await res.json();
        setFolders(data.folders);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFolders();
  }, []);

  if (loading) {
    return <p>Loading folders...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Loan Folders</h2>
      <ul className="space-y-2">
        {folders.map((folder) => (
          <li key={folder} className="p-2 border rounded-md">
            {folder}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LoanFolders;