import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getCollections } from '@/lib/db';

// Add dynamic config for Next.js
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
        message: 'Loan ID is required'
      }, { status: 400 });
    }
    
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
    
  } catch (error: any) {
    console.error('Error fetching loan documents:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch loan documents'
    }, { status: 500 });
  }
} 