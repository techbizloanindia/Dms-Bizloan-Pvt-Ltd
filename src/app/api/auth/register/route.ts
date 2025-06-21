import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Clone the request before reading the body to avoid "body disturbed" errors
    const clonedRequest = request.clone();
    const { name, email, password } = await clonedRequest.json();
    
    // Check if user exists
    const userExists = await User.findOne({ email });
    
    if (userExists) {
      return NextResponse.json({ 
        success: false, 
        message: 'User with this email already exists' 
      }, { status: 400 });
    }
    
    // Create new user
    const user = await User.create({
      name,
      email,
      password
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Registration failed' 
    }, { status: 500 });
  }
} 