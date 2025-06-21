import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const loanId = params.loanId;
    
    if (!loanId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Loan ID is required' 
      }, { status: 400 });
    }
    
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    const documentsCollection = db.collection('documents');
    
    // Build query - search for both loanId and loanNumber fields
    const query = { 
      $or: [
        { loanId: loanId },
        { loanNumber: loanId }
      ]
    };
    
    // Fetch documents from MongoDB
    const documents = await documentsCollection
      .find(query)
      .sort({ uploadedAt: -1 }) // Sort by upload date, newest first
      .toArray();
    
    return NextResponse.json({ 
      success: true,
      documents,
      count: documents.length
    });
    
  } catch (error: any) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch documents',
      message: error.message 
    }, { status: 500 });
  }
} 