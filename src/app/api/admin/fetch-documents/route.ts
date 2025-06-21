import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';

// Initialize S3 client with explicit configuration
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  maxAttempts: 3,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const prefix = searchParams.get('prefix') || 'documents/';
    
    console.log(`📁 Fetching documents from S3...`);
    console.log(`🏷️  Loan ID: ${loanId || 'All'}`);
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🗂️  Prefix: ${prefix}`);
    
    // Build the search prefix
    let searchPrefix = prefix;
    if (loanId) {
      // Handle different loan ID formats
      const cleanLoanId = loanId.replace('BIZLN-', '');
      searchPrefix = `${prefix}${cleanLoanId}/`;
    }
    
    console.log(`🔍 Search prefix: ${searchPrefix}`);
    
    // List objects in S3
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: searchPrefix,
      MaxKeys: 1000, // Limit to prevent large responses
    });

    const { Contents = [], IsTruncated } = await s3Client.send(listCommand);
    console.log(`📄 Found ${Contents.length} objects in S3`);
    
    if (IsTruncated) {
      console.log('⚠️  Results truncated - there are more objects available');
    }

    // Process files and generate signed URLs
    const documents = await Promise.all(
      Contents
        .filter(item => item.Key && item.Size && item.Size > 0) // Filter out folders and empty files
        .map(async (item, index) => {
          try {
            console.log(`🔗 Generating signed URL for: ${item.Key}`);
            
            const signedUrl = await getSignedUrl(
              s3Client,
              new GetObjectCommand({ 
                Bucket: BUCKET_NAME, 
                Key: item.Key! 
              }),
              { expiresIn: 3600 } // 1 hour expiration
            );

            // Extract metadata from key path
            const keyParts = item.Key!.split('/');
            const fileName = keyParts[keyParts.length - 1];
            const folderPath = keyParts.slice(0, -1).join('/');
            const extractedLoanId = keyParts[1] || 'unknown';

            return {
              id: `${index}_${Date.now()}`,
              key: item.Key!,
              fileName: fileName,
              originalName: fileName,
              folderPath: folderPath,
              loanId: extractedLoanId,
              fileSize: item.Size || 0,
              lastModified: item.LastModified || new Date(),
              url: signedUrl,
              fileType: fileName.split('.').pop()?.toLowerCase() || 'unknown',
              etag: item.ETag?.replace(/"/g, '') || 'unknown'
            };
          } catch (urlError) {
            console.error(`❌ Error generating URL for ${item.Key}:`, urlError);
            return {
              id: `error_${index}`,
              key: item.Key!,
              fileName: item.Key!.split('/').pop() || 'unknown',
              error: 'Failed to generate download URL',
              url: null
            };
          }
        })
    );

    const successfulDocuments = documents.filter(doc => !doc.error);
    const failedDocuments = documents.filter(doc => doc.error);

    console.log(`✅ Successfully processed ${successfulDocuments.length} documents`);
    if (failedDocuments.length > 0) {
      console.log(`⚠️  ${failedDocuments.length} documents failed URL generation`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully fetched ${successfulDocuments.length} documents from S3`,
      bucket: BUCKET_NAME,
      prefix: searchPrefix,
      loanId: loanId,
      totalFound: Contents.length,
      successfullyProcessed: successfulDocuments.length,
      failed: failedDocuments.length,
      isTruncated: IsTruncated,
      documents: successfulDocuments,
      failedDocuments: failedDocuments.length > 0 ? failedDocuments : undefined
    });

  } catch (error: any) {
    console.error('❌ Error fetching documents from S3:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch documents from S3',
      error: error.message || 'Unknown S3 error',
      details: {
        type: error.name || 'S3Error',
        code: error.Code || 'UnknownError',
        bucket: BUCKET_NAME,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
} 