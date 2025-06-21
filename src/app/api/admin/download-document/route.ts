import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { connectToDatabase } from '@/lib/db';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');
    const s3Key = searchParams.get('s3Key');

    if (!documentId && !s3Key) {
      return NextResponse.json(
        { success: false, error: 'Document ID or S3 key is required' },
        { status: 400 }
      );
    }

    let finalS3Key = s3Key;

    // If only document ID provided, get S3 key from database
    if (!s3Key && documentId) {
      const { db } = await connectToDatabase();
      const documentsCollection = db.collection('documents');
      
      const document = await documentsCollection.findOne({ 
        _id: new (require('mongodb')).ObjectId(documentId) 
      });

      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }

      finalS3Key = document.s3Key;
      
      if (!finalS3Key) {
        return NextResponse.json(
          { success: false, error: 'Document does not have S3 key (local file)' },
          { status: 400 }
        );
      }
    }

    // Generate signed URL for S3 access
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: finalS3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn: 3600,
      s3Key: finalS3Key,
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate download URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 