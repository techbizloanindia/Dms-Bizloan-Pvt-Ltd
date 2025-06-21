import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const loanId = url.searchParams.get('loanId');
    
    // Get the current user session
    const response = await fetch(new URL('/api/user', request.url).toString(), {
      headers: request.headers
    });
    
    if (!response.ok) {
      // If user is not authenticated, return unauthorized
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized access', authenticated: false },
          { status: 401 }
        );
      }
      
      throw new Error('Failed to fetch user data');
    }
    
    const userData = await response.json();
    const user = userData.user;
    
    // If no loan ID is provided, just return the user's accessible loans
    if (!loanId) {
      return NextResponse.json({
        authenticated: true,
        loans: user.loanAccess || [],
        role: user.role
      });
    }
    
    // Admins have access to all loans
    if (user.role === 'admin') {
      return NextResponse.json({
        authenticated: true,
        hasAccess: true,
        role: 'admin'
      });
    }
    
    // Check if the user has access to the specified loan
    const hasAccess = (user.loanAccess || []).includes(loanId);
    
    return NextResponse.json({
      authenticated: true,
      hasAccess,
      role: user.role
    });
  } catch (error) {
    console.error('Error checking loan access:', error);
    return NextResponse.json(
      { error: 'Failed to verify loan access', details: error.message },
      { status: 500 }
    );
  }
} 