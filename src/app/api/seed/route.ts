import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Check if the user already exists
    const existingUser = await User.findOne({ username: 'nitishkumar' });
    
    if (existingUser) {
      return NextResponse.json({ 
        success: true, 
        message: 'Seed user already exists',
        user: {
          id: existingUser._id,
          username: existingUser.username,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role
        }
      });
    }
    
    // Create new user with all required fields
    const user = await User.create({
      username: 'nitishkumar',
      password: 'admin123', // This will be hashed by the pre-save hook
      name: 'Nitish Kumar',
      email: 'nitish.kumar@bizloanindia.com',
      role: 'admin',
      loanAccess: []
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Seed user created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to seed the database' 
    }, { status: 500 });
  }
} 