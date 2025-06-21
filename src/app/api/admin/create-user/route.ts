import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { MongoClient, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcryptjs';
import { safeParseJson } from '@/lib/request-helpers';

// MongoDB connection configuration
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "bizloan";

export async function POST(request: NextRequest) {
  let client;
  
  try {
    // Get request data using the safe helper to avoid "body disturbed" errors
    const data = await safeParseJson(request);
    const { username, password, name, email, phone, role = 'user' } = data;
    
    // Validate required fields
    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Username, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
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
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ 
      username: username.toLowerCase() 
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user object with all required fields for authentication
    const newUser = {
      username: username.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      email: email?.trim() || '',
      phoneNumber: phone?.trim() || '',
      role: role,
      isActive: true, // This is crucial for login to work
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert user into database
    const result = await db.collection('users').insertOne(newUser);
    
    if (result.insertedId) {
      return NextResponse.json({
        success: true,
        message: 'User created successfully',
        user: {
          id: result.insertedId.toString(),
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          role: newUser.role,
          isActive: newUser.isActive
        }
      }, { status: 201 });
    } else {
      throw new Error('Failed to create user');
    }
    
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
} 