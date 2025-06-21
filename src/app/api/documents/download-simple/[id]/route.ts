import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { connectToDatabase, getCollections } from '@/lib/db';
import { ObjectId, GridFSBucket } from 'mongodb';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Invalid document ID'
      }, { status: 400 });
    }

    logger.log('Document download requested for ID:', documentId);

    // Connect to database
    const { db } = await connectToDatabase();
    const { documents } = getCollections(db);
    
    // Create GridFS bucket reference
    const gridFSBucket = new GridFSBucket(db, {
      bucketName: 'documentFiles'
    });

    // Find the document
    let document;
    try {
      document = await documents.findOne({ 
        _id: new ObjectId(documentId) 
      });
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

    // Check if document has a fileId to retrieve metadata from GridFS
    if (!document.fileId) {
      logger.error('Document record found but no fileId present');
      return NextResponse.json({
        success: false,
        message: 'Document file not found in storage'
      }, { status: 404 });
    }
    
    let fileId;
    try {
      fileId = new ObjectId(document.fileId);
    } catch (error) {
      logger.error('Invalid fileId format:', error);
      return NextResponse.json({
        success: false,
        message: 'Invalid file reference format'
      }, { status: 400 });
    }
    
    try {
      // Get file info from GridFS
      const gridFSFile = await db.collection('documentFiles.files').findOne({ _id: fileId });
      
      if (!gridFSFile) {
        logger.error('File not found in GridFS');
        return NextResponse.json({
          success: false,
          message: 'File not found in storage'
        }, { status: 404 });
      }
      
      // Return document metadata with GridFS file info
      return NextResponse.json({
        success: true,
        message: 'Document found',
        document: {
          id: document._id.toString(),
          fileName: document.fileName,
          originalName: document.originalName || document.fileName,
          fileType: document.fileType || 'application/octet-stream',
          fileSize: gridFSFile.length || document.fileSize || 0,
          uploadedAt: gridFSFile.uploadDate || document.uploadedAt || new Date().toISOString(),
          fileId: document.fileId.toString(),
          // URL to download the actual file content
          downloadUrl: `/api/documents/download-content/${document._id}`
        }
      });
    } catch (error) {
      logger.error('Error retrieving GridFS file metadata:', error);
      return NextResponse.json({
        success: false,
        message: 'Error retrieving file metadata'
      }, { status: 500 });
    }

  } catch (error: any) {
    logger.error('Error in document download API:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to process document request',
      error: error.stack
    }, { status: 500 });
  }
}
