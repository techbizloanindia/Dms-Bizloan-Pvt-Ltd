import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Bypass middleware to allow direct access
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Handle API routes
  if (path.startsWith('/api/')) {
    const response = NextResponse.next();

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    return response;
  }

  // For admin routes, ensure they're properly handled
  if (path.startsWith('/admin/')) {
    // Skip auth check for login page
    if (path === '/admin/login') {
      return NextResponse.next();
    }
    
    // Check for admin authentication in the request
    const adminToken = request.cookies.get('adminToken')?.value || 
                      request.headers.get('x-admin-token');
    
    // If no admin token is found, redirect to login
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // Allow access to admin routes with token
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Configure the paths that should trigger this middleware
export const config = {
  matcher: [
    '/admin/:path*',
    // Exclude the specific API route that handles file uploads from the middleware,
    // as the middleware consumes the request body and breaks the upload process.
    '/api/((?!upload-document).*)'
  ],
}; 