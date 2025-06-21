import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getCollections } from '@/lib/db';

// Add dynamic config for Next.js
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path || [];
    
    // If the first segment is a loan ID
    if (path.length > 0) {
      const loanId = path[0];
      
      // Connect to database
      const { db } = await connectToDatabase();
      const { documents } = getCollections(db);
      
      // Fetch documents for this loan, newest first
      const loanDocuments = await documents
        .find({ 
          $or: [
            { loanId: loanId },
            { loanNumber: loanId }
          ]
        })
        .sort({ uploadedAt: -1 })
        .toArray();
      
      console.log(`Found ${loanDocuments.length} documents for loan ${loanId}`);
      
      return NextResponse.json({
        success: true,
        loanId,
        count: loanDocuments.length,
        documents: loanDocuments
      });
    }
    
    // If no specific path, return error
    return NextResponse.json({
      success: false,
      message: 'Invalid document path'
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Error handling document path:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Error processing document request'
    }, { status: 500 });
  }
} 