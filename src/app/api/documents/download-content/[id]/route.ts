import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import dbConnect from '@/lib/mongoose';
import Document from '@/models/Document';
import { ObjectId } from 'mongodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';

const s3Client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

// This endpoint generates a downloadable file with document content
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const documentId = params.id;
    
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Invalid document ID'
      }, { status: 400 });
    }

    logger.log('Document content download requested for ID:', documentId);

    // Find the document
    let document;
    try {
      document = await Document.findById(documentId);
    } catch (error) {
      logger.error('Error finding document:', error);
      return NextResponse.json({
        success: false,
        message: 'Invalid document ID format'
      }, { status: 400 });
    }

    if (!document) {
      logger.log('Document not found in database');
      return NextResponse.json({
        success: false,
        message: 'Document not found'
      }, { status: 404 });
    }

    logger.log('Document found:', document.fileName);

    // Check if document has a s3Key to retrieve from S3
    if (!document.s3Key) {
      logger.error('Document record found but no s3Key present');
      return NextResponse.json({
        success: false,
        message: 'Document file not found in storage'
      }, { status: 404 });
    }
    
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: document.s3Key,
      });

      const { Body, ContentType } = await s3Client.send(command);

      if (!Body) {
        throw new Error('S3 object body is empty');
      }

      // Set appropriate headers for file download based on the original file type
      const headers = new Headers();
      headers.set('Content-Type', document.fileType || ContentType || 'application/octet-stream');
      headers.set('Content-Disposition', `attachment; filename="${document.originalName || document.fileName || 'document'}"`);
      
      // @ts-ignore
      return new NextResponse(Body, {
        status: 200,
        headers,
      });
    
    } catch (streamError: unknown) {
      logger.error('Error streaming file from S3:', streamError);
      return NextResponse.json({
        success: false,
        message: 'Error retrieving file from storage'
      }, { status: 500 });
    }

  } catch (error: any) {
    logger.error('Error in document content download API:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to process document request',
      error: error.stack
    }, { status: 500 });
  }
}
