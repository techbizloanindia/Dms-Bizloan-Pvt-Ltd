'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import DocumentSlider from '@/components/DocumentSlider';

interface Document {
  _id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  path: string;
  s3Key: string;
  fileType: string;
  loanId: string;
}

export default function DocumentList() {
  const searchParams = useSearchParams();
  const loanId = searchParams.get('loanId');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSliderOpen, setSliderOpen] = useState(false);

  useEffect(() => {
    if (loanId) {
      fetch(`/api/s3-documents/${loanId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch documents');
          }
          return res.json();
        })
        .then(data => {
          setDocuments(data.documents);
          setIsLoading(false);
        })
        .catch(err => {
          setError('Failed to load documents. Please try again later.');
          setIsLoading(false);
        });
    }
  }, [loanId]);

  const openSlider = () => setSliderOpen(true);
  const closeSlider = () => setSliderOpen(false);

  return (
    <main className="flex-grow container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a4cde]">
          Documents for Loan: {loanId}
        </h1>
        <button
          onClick={openSlider}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          View Documents
        </button>
      </div>
      {isLoading ? (
        <p>Loading documents...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <div key={doc._id} className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold">{doc.fileName}</h2>
              <p className="text-sm text-gray-500">
                Size: {(doc.fileSize / 1024).toFixed(2)} KB
              </p>
              <p className="text-sm text-gray-500">
                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
      <DocumentSlider
        isOpen={isSliderOpen}
        onCloseAction={closeSlider}
        documents={documents}
      />
    </main>
  );
} 