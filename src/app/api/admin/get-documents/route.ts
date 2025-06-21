import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loanId = searchParams.get('loanId');

    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const documentsCollection = db.collection('documents');

    // Build query - if loanId provided, filter by it, otherwise get all documents
    const query = loanId ? { 
      $or: [
        { loanId: loanId },
        { loanNumber: loanId }
      ]
    } : {};

    // Fetch documents from MongoDB
    const documents = await documentsCollection
      .find(query)
      .sort({ uploadedAt: -1 }) // Sort by upload date, newest first
      .toArray();

    // Format documents for the frontend
    const formattedDocuments = documents.map(doc => ({
      _id: doc._id.toString(),
      fileName: doc.fileName || doc.originalName,
      originalName: doc.originalName || doc.fileName,
      fullName: doc.fullName || '',
      loanId: doc.loanId || doc.loanNumber,
      loanNumber: doc.loanNumber || doc.loanId,
      description: doc.description || '',
      fileType: doc.fileType || 'application/octet-stream',
      fileSize: doc.fileSize || 0,
      path: doc.path || doc.s3Location || '',
      uploadedAt: doc.uploadedAt || new Date(),
      status: doc.status || 'active'
    }));

    return NextResponse.json({ 
      success: true,
      documents: formattedDocuments,
      count: formattedDocuments.length
    });

  } catch (error: any) {
    console.error('Failed to fetch documents from MongoDB:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch documents',
      message: error.message 
    }, { status: 500 });
  }
}