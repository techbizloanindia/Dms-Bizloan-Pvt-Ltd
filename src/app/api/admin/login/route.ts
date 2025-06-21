import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { MongoClient, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcryptjs';
import { safeParseJson } from '@/lib/request-helpers';

// MongoDB connection configuration
const uri = process.env.MONGODB_URI;
const dbName = "bizloan";

export async function POST(request: NextRequest) {
  let client;
  
  try {
    // Get request data using the safe helper to avoid "body disturbed" errors
    const data = await safeParseJson(request);
    const { username, password } = data;
    
    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    // Create a MongoClient
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    
    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);
    
    // Find user in the database
    const user = await db.collection('users').findOne({ 
      username, 
      role: 'admin'  // Only allow admin users to log in
    });
    
    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Create admin session (this would be a JWT token or a session cookie in a real app)
    // For simplicity, we're returning a success response that the client will use to set localStorage
    
    return NextResponse.json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
} 