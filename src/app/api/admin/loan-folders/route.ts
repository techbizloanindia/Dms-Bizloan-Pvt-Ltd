import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import dbConnect from '@/lib/mongoose';
import Document from '@/models/Document';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const loanFolders = await Document.distinct('loanNumber');
    
    return NextResponse.json({
      success: true,
      folders: loanFolders,
    });
  } catch (error) {
    logger.error('Error fetching loan folders:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch loan folders',
    }, { status: 500 });
  }
}