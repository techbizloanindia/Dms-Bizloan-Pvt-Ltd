import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getCollections } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    if (!loanId) {
      return NextResponse.json({
        success: false,
        message: 'Loan ID is required'
      }, { status: 400 });
    }

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

    // Check if user has access to this loan
    if (user.role !== 'admin' && !user.loanAccess.includes(loanId)) {
      return NextResponse.json({
        success: false,
        message: 'Access denied'
      }, { status: 403 });
    }

    // Search for documents
    const query = { 
      loanId,
      isActive: true 
    };

    const foundDocuments = await documents
      .find(query)
      .sort({ uploadDate: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      documents: foundDocuments
    });

  } catch (error: any) {
    console.error('Error searching documents:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to search documents'
    }, { status: 500 });
  }
} 