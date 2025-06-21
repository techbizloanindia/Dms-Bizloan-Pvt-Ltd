import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { connectToDatabase, getCollections } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    const { documents, users } = getCollections(db);

    // Get user details
    const user = await users.findOne({ 
      username: session.user.username 
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Find the document
    const document = await documents.findOne({ 
      _id: new ObjectId(documentId) 
    });

    if (!document) {
      return NextResponse.json({
        success: false,
        message: 'Document not found'
      }, { status: 404 });
    }

    // Check if user has access to this document
    if (user.role !== 'admin' && !user.loanAccess.includes(document.loanId)) {
      return NextResponse.json({
        success: false,
        message: 'Access denied'
      }, { status: 403 });
    }

    // Get the file from storage (you'll need to implement this based on your storage solution)
    const file = await getFileFromStorage(document.storageKey);

    // Create response with proper headers
    const response = new NextResponse(file, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.fileSize.toString()
      }
    });

    return response;

  } catch (error: any) {
    console.error('Error downloading document:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to download document'
    }, { status: 500 });
  }
}

// Helper function to get file from storage
async function getFileFromStorage(storageKey: string): Promise<Buffer> {
  // Implement this based on your storage solution (e.g., local filesystem, S3, etc.)
  // For now, returning a dummy buffer
  return Buffer.from('Dummy file content');
} 