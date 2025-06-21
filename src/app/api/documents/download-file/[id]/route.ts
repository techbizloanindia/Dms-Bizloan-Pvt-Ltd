import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { connectToDatabase, getCollections } from '@/lib/db';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

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

    // Connect to database
    const { db } = await connectToDatabase();
    const { documents } = getCollections(db);

    // Find the document
    let document;
    try {
      document = await documents.findOne({ 
        _id: new ObjectId(documentId) 
      });
    } catch (error) {
      console.error('Error finding document:', error);
      return NextResponse.json({
        success: false,
        message: 'Invalid document ID format'
      }, { status: 400 });
    }

    if (!document) {
      return NextResponse.json({
        success: false,
        message: 'Document not found'
      }, { status: 404 });
    }

    // Get file path (assuming files are stored locally)
    // You may need to adjust this based on your actual storage solution
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, document.fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Try alternative path if the file doesn't exist at the expected location
      const alternativePath = document.path || path.join(uploadDir, document._id.toString());
      
      if (!fs.existsSync(alternativePath)) {
        console.error('File not found at path:', filePath);
        console.error('Alternative path also not found:', alternativePath);
        
        // Return a sample PDF as fallback for testing
        const samplePdfPath = path.join(process.cwd(), 'public', 'sample-document.pdf');
        
        if (fs.existsSync(samplePdfPath)) {
          const file = fs.readFileSync(samplePdfPath);
          return new NextResponse(file, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="sample-document.pdf"`,
            }
          });
        }
        
        return NextResponse.json({
          success: false,
          message: 'File not found in storage'
        }, { status: 404 });
      }
    }

    // Read file
    const file = fs.readFileSync(filePath);
    
    // Determine content type
    const contentType = document.fileType || 'application/octet-stream';
    const fileName = document.originalName || document.fileName || 'download';

    // Create response with proper headers
    const response = new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': file.length.toString()
      }
    });

    return response;

  } catch (error: any) {
    console.error('Error downloading document:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to download document',
      error: error.stack
    }, { status: 500 });
  }
}
