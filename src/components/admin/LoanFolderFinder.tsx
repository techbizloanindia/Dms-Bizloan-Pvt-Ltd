'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface LoanFolderResult {
  found: boolean;
  folders: string[];
  documents: string[];
  path?: string;
  message?: string;
}

const LoanFolderFinder = () => {
  const [loanNumber, setLoanNumber] = useState('3878');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoanFolderResult | null>(null);

  const searchLoanFolder = async () => {
    setLoading(true);
    try {
      // First try searching for the exact loan number
      const response = await fetch(`/api/admin/get-documents?loanId=${loanNumber}`);
      const data = await response.json();
      
      if (response.ok && data.files && data.files.length > 0) {
        setResult({
          found: true,
          folders: [],
          documents: data.files.map((file: any) => file.key),
          path: `documents/${loanNumber}/`,
          message: `Found ${data.files.length} documents in loan folder ${loanNumber}`
        });
        toast.success(`Found loan folder ${loanNumber} with ${data.files.length} documents!`);
      } else {
        // Try searching with different formats
        const formats = [`BIZLN-${loanNumber}`, loanNumber, `documents/${loanNumber}/`];
        let found = false;
        
        for (const format of formats) {
          try {
            const formatResponse = await fetch(`/api/admin/get-documents?loanId=${format}`);
            const formatData = await formatResponse.json();
            
            if (formatResponse.ok && formatData.files && formatData.files.length > 0) {
              setResult({
                found: true,
                folders: [],
                documents: formatData.files.map((file: any) => file.key),
                path: `documents/${format}/`,
                message: `Found ${formatData.files.length} documents in loan folder ${format}`
              });
              toast.success(`Found loan folder ${format} with ${formatData.files.length} documents!`);
              found = true;
              break;
            }
          } catch (error) {
            console.log(`Format ${format} not found`);
          }
        }
        
        if (!found) {
          setResult({
            found: false,
            folders: [],
            documents: [],
            message: `No documents found for loan number ${loanNumber}. The folder may not exist or may be empty.`
          });
          toast.error(`Loan folder ${loanNumber} not found or empty`);
        }
      }
    } catch (error) {
      console.error('Error searching for loan folder:', error);
      setResult({
        found: false,
        folders: [],
        documents: [],
        message: `Error occurred while searching for loan ${loanNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      toast.error('Error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  const openDocument = (documentKey: string) => {
    // Extract just the filename from the key
    const fileName = documentKey.split('/').pop();
    // You can add logic here to open/download the document
    console.log('Opening document:', documentKey);
    toast.info(`Opening document: ${fileName}`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-blue-800">🔍 Loan Folder Finder</h2>
      <p className="text-gray-600 mb-4">
        Search for specific loan folders in S3 buckets and view their documents.
      </p>
      
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={loanNumber}
          onChange={(e) => setLoanNumber(e.target.value)}
          placeholder="Enter loan number (e.g., 3878)"
          className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={searchLoanFolder}
          disabled={loading || !loanNumber.trim()}
          className={`px-6 py-2 rounded font-medium ${
            loading || !loanNumber.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? 'Searching...' : 'Find Folder'}
        </button>
      </div>
      
      {/* Quick Access for 3878 */}
      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">🎯 Quick Access</h3>
        <button
          onClick={() => {
            setLoanNumber('3878');
            setTimeout(searchLoanFolder, 100);
          }}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          🔍 Find Loan 3878 Folder
        </button>
      </div>
      
      {result && (
        <div className={`mt-4 p-4 rounded border ${
          result.found 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <h3 className={`font-medium mb-2 ${
            result.found ? 'text-green-800' : 'text-yellow-800'
          }`}>
            {result.found ? '✅ Loan Folder Found!' : '⚠️ Search Results'}
          </h3>
          
          <p className="mb-3">{result.message}</p>
          
          {result.found && result.path && (
            <div className="mb-3">
              <p className="text-sm text-gray-600">
                <strong>S3 Path:</strong> {result.path}
              </p>
            </div>
          )}
          
          {result.documents.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-gray-800">
                📄 Documents ({result.documents.length}):
              </h4>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {result.documents.map((doc, index) => {
                  const fileName = doc.split('/').pop() || doc;
                  return (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-700 truncate flex-1">
                        📄 {fileName}
                      </span>
                      <button
                        onClick={() => openDocument(doc)}
                        className="ml-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoanFolderFinder; 