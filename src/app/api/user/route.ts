import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { connectToDatabase, getCollections } from '@/lib/db';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'bizloan_secret_key_please_change_in_production';

// This route is a fallback that redirects to the Express server route
export async function GET(request: NextRequest) {
  try {
    // Get the auth token from cookies
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'No authentication token found' 
      }, { status: 401 });
    }
    
    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 });
    }
    
    // Connect to database to get fresh user data
    const { db } = await connectToDatabase();
    const { users, loanAccess } = getCollections(db);
    
    // Find user by ID from token
    const user = await users.findOne({ 
      _id: new ObjectId(decoded.id),
      isActive: true
    });
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found or inactive' 
      }, { status: 401 });
    }
    
    // Get user's loan access
    const loanAccessList = await loanAccess.find({
      userId: user._id,
      isActive: true
    }).toArray();

    const userLoanAccess = loanAccessList.map(loan => loan.loanNumber);
    
    // Return user data
    return NextResponse.json({ 
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        loanAccess: userLoanAccess
      }
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('User authentication check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication check failed' 
    }, { status: 500 });
  }
} 