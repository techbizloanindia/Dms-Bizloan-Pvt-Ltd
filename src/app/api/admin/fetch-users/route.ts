import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getCollections } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching users from MongoDB...');
    
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    console.log('✅ MongoDB connection established');
    
    const { users } = getCollections(db);
    
    // Fetch all users, excluding sensitive fields
    const userList = await users
      .find({})
      .project({ 
        password: 0 // Exclude password field
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`📊 Found ${userList.length} users in database`);
    
    // Transform ObjectId to string for JSON serialization
    const transformedUsers = userList.map(user => ({
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      loanAccess: user.loanAccess || [],
      isActive: user.isActive !== false, // Default to true if not set
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    return NextResponse.json({
      success: true,
      message: `Successfully fetched ${transformedUsers.length} users`,
      count: transformedUsers.length,
      users: transformedUsers
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching users from MongoDB:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch users from MongoDB',
      error: error.message || 'Unknown database error',
      details: {
        type: error.name || 'DatabaseError',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
} 