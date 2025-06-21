import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'ops-loan-data';

export async function GET(
  request: NextRequest,
  { params }: { params: { loanNumber: string } }
) {
  try {
    const { loanNumber } = params;
    
    console.log(`🔍 Searching existing S3 structure for: ${loanNumber}`);
    
    // Extract customer ID from loan number
    let customerId = loanNumber;
    if (loanNumber.startsWith('BIZLN-')) {
      customerId = loanNumber.replace('BIZLN-', '');
    }
    
    // List all objects in the S3 bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1000
    });
    
    const response = await s3Client.send(listCommand);
    
    if (!response.Contents) {
      return NextResponse.json({ 
        success: false, 
        message: 'No files found in S3 bucket',
        documents: []
      });
    }
    
    // Search for matching folders (customer_id_name format)
    const matchingFiles = response.Contents.filter(obj => {
      const folder = obj.Key.split('/')[0];
      return folder.toLowerCase().startsWith(customerId.toLowerCase());
    });
    
    if (matchingFiles.length === 0) {
      // Try alternative search patterns
      const alternativeMatches = response.Contents.filter(obj => {
        const key = obj.Key.toLowerCase();
        return (
          key.includes(customerId.toLowerCase()) ||
          key.includes(loanNumber.toLowerCase())
        );
      });
      
      if (alternativeMatches.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: `No documents found for ${loanNumber}`,
          documents: [],
          suggestions: getSuggestions(response.Contents, customerId)
        });
      }
      
      matchingFiles.push(...alternativeMatches);
    }
    
    // Process files and generate signed URLs
    const documents = [];
    
    for (const file of matchingFiles) {
      try {
        // Generate signed URL for secure access
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: file.Key
        });
        
        const signedUrl = await getSignedUrl(s3Client, getCommand, { 
          expiresIn: 3600 // 1 hour
        });
        
        const folder = file.Key.split('/')[0];
        const fileName = file.Key.split('/').pop() || file.Key;
        
        documents.push({
          id: file.Key.replace(/[^a-zA-Z0-9]/g, '_'),
          filename: fileName,
          s3Key: file.Key,
          customerFolder: folder,
          size: file.Size,
          lastModified: file.LastModified,
          downloadUrl: signedUrl,
          isS3: true,
          storageLocation: 'S3 (ops-loan-data)',
          uploadDate: file.LastModified
        });
        
      } catch (error) {
        console.error(`Error processing file ${file.Key}:`, error);
      }
    }
    
    // Group documents by customer folder
    const groupedDocs = documents.reduce((groups, doc) => {
      const folder = doc.customerFolder;
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(doc);
      return groups;
    }, {} as Record<string, typeof documents>);
    
    return NextResponse.json({
      success: true,
      message: `Found ${documents.length} documents for ${loanNumber}`,
      loanNumber,
      customerId,
      documents,
      groupedDocuments: groupedDocs,
      totalFiles: documents.length,
      totalFolders: Object.keys(groupedDocs).length,
      bucketInfo: {
        bucket: BUCKET_NAME,
        region: process.env.AWS_DEFAULT_REGION,
        storageType: 'existing-structure'
      }
    });
    
  } catch (error) {
    console.error('Error fetching existing S3 documents:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching documents from S3',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getSuggestions(allFiles: any[], searchId: string): string[] {
  const folders = [...new Set(allFiles.map(obj => obj.Key.split('/')[0]))];
  
  return folders
    .filter(folder => {
      const id = folder.split('_')[0];
      const numericId = parseInt(id);
      const searchNumeric = parseInt(searchId);
      
      if (isNaN(numericId) || isNaN(searchNumeric)) return false;
      
      return Math.abs(numericId - searchNumeric) <= 100;
    })
    .slice(0, 5);
} 