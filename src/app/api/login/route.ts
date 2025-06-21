import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectToDatabase, getCollections } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'bizloan_secret_key_please_change_in_production';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const { username, password } = await request.json();
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username and password are required' 
      }, { status: 400 });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    const { users, loanAccess } = getCollections(db);
    
    // Find user by username (case insensitive)
    const user = await users.findOne({ 
      username: username.toLowerCase(),
      isActive: true
    });
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }
    
    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid credentials' 
      }, { status: 401 });
    }

    // Get user's loan access
    const loanAccessList = await loanAccess.find({
      userId: user._id,
      isActive: true
    }).toArray();

    const userLoanAccess = loanAccessList.map(loan => loan.loanNumber);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        loanAccess: userLoanAccess
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Set the token as an HTTP-only cookie
    const response = NextResponse.json({ 
      success: true, 
      message: 'Login successful',
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
    
    // Set JWT token as HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });
    
    return response;
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Login failed' 
    }, { status: 500 });
  }
} 