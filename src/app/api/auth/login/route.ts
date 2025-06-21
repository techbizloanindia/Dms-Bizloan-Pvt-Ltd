import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectToDatabase, getCollections } from '@/lib/db';

const JWT_SECRET = 'your-jwt-secret-key'; // Replace with environment variable in production

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const { username, password } = await request.json();
    
    // Validate input
    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        message: 'Username and password are required' 
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
        message: 'Invalid credentials' 
      }, { status: 401 });
    }
    
    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid credentials' 
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
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        loanAccess: userLoanAccess
      },
      token
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Login failed' 
    }, { status: 500 });
  }
} 