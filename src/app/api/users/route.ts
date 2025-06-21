// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { getDbConnection, sanitizeDbError } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

// Input validation schema
const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]{10,15}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  role: z.enum(['user', 'admin']).default('user'),
  loanAccess: z.array(z.string()).default([])
});

// GET handler to retrieve all users
export async function GET(req: NextRequest) {
  try {
    // Connect to database using the improved connection utility
    const mongoose = await getDbConnection();
    if (!mongoose?.connection?.db) {
      throw new Error('Database connection not available');
    }
    
    const users = mongoose.connection.db.collection('users');
    
    // Fetch all users with proper error handling and indexing
    const usersList = await users
      .find({}, { 
        projection: { 
          password: 0, // Exclude passwords for security
          __v: 0 // Exclude mongoose version key
        } 
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .toArray();
    
    // Transform MongoDB _id to string id for proper JSON serialization
    const transformedUsers = usersList.map((user: any) => ({
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      email: user.email || null,
      phone: user.phone || null,
      role: user.role,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    return NextResponse.json({ 
      success: true,
      users: transformedUsers,
      count: transformedUsers.length
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch users',
        details: sanitizeDbError(error)
      },
      { status: 500 }
    );
  }
}

// POST handler to create a new user with improved validation and connectivity
export async function POST(req: NextRequest) {
  console.log('POST /api/users - Creating new user');
  
  try {
    // Parse and validate request body
    const body = await req.json();
    console.log('Request body received:', { 
      ...body, 
      password: body.password ? '******' : undefined 
    });
    
    // Validate input using Zod schema
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          details: errors
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Connect to database with retry logic
    console.log('Establishing MongoDB connection...');
    let mongoose;
    let users;
    let retries = 3;
    
    while (retries > 0) {
      try {
        mongoose = await getDbConnection();
        if (!mongoose?.connection?.db) {
          throw new Error('Database connection not established');
        }
        users = mongoose.connection.db.collection('users');
        
        // Test the connection with a ping
        await mongoose.connection.db.admin().ping();
        console.log('MongoDB connection verified successfully');
        break;
      } catch (connectionError: any) {
        retries--;
        console.warn(`Database connection attempt failed (${3 - retries}/3):`, connectionError.message);
        
        if (retries === 0) {
          console.error('All database connection attempts failed');
          return NextResponse.json(
            { 
              success: false,
              error: 'Database connection failed after multiple attempts', 
              details: sanitizeDbError(connectionError)
            },
            { status: 503 }
          );
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
      }
    }

    // Check for duplicate username (case-insensitive)
    const normalizedUsername = validatedData.username.toLowerCase().trim();
    const existingUser = await users!.findOne({ 
      username: normalizedUsername 
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Username already exists',
          details: 'Please choose a different username'
        },
        { status: 409 }
      );
    }

    // Check for duplicate email if provided
    if (validatedData.email) {
      const normalizedEmail = validatedData.email.toLowerCase().trim();
      const existingEmail = await users!.findOne({ 
        email: normalizedEmail 
      });

      if (existingEmail) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Email already exists',
            details: 'Please use a different email address'
          },
          { status: 409 }
        );
      }
    }

    // Hash password with improved security
    console.log('Hashing password...');
    const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
    
    // Create optimized user document
    const timestamp = new Date();
    const newUser = {
      _id: new ObjectId(),
      username: normalizedUsername,
      password: hashedPassword,
      name: validatedData.name.trim(),
      email: validatedData.email ? validatedData.email.toLowerCase().trim() : null,
      phone: validatedData.phone ? validatedData.phone.trim() : null,
      role: validatedData.role,
      loanAccess: validatedData.loanAccess || [],
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      // Add metadata for audit trail
      createdBy: 'admin-panel',
      lastLogin: null,
      loginCount: 0
    };
    
    console.log('User document prepared:', { 
      ...newUser, 
      _id: newUser._id.toString(),
      password: '******' 
    });

    // Insert user with write concern for data consistency
    const insertResult = await users!.insertOne(newUser, {
      writeConcern: { 
        w: 'majority', 
        j: true, // Wait for journal write
        wtimeout: 10000 // 10 second timeout
      }
    });

    if (!insertResult.acknowledged) {
      throw new Error('User creation was not acknowledged by database');
    }

    // Verify the insertion
    const createdUser = await users!.findOne(
      { _id: insertResult.insertedId },
      { projection: { password: 0 } }
    );

    if (!createdUser) {
      throw new Error('User creation verification failed');
    }

    console.log('User created successfully with ID:', insertResult.insertedId.toString());
    
    // Create optimized success response
    const successResponse = {
      success: true,
      message: 'User created successfully',
      user: {
        id: createdUser._id.toString(),
        _id: createdUser._id.toString(),
        username: createdUser.username,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role,
        loanAccess: createdUser.loanAccess,
        isActive: createdUser.isActive,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt
      }
    };
    
    return NextResponse.json(
      successResponse,
      { 
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );

  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Categorize and handle different types of errors
    let statusCode = 500;
    let errorMessage = 'Failed to create user';
    
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Invalid user data';
    } else if (error.code === 11000) {
      statusCode = 409;
      errorMessage = 'Duplicate user data';
    } else if (error.name === 'MongoNetworkError') {
      statusCode = 503;
      errorMessage = 'Database connection error';
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: sanitizeDbError(error),
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// DELETE handler to delete a user with improved validation
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User ID is required' 
        },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid user ID format' 
        },
        { status: 400 }
      );
    }

    // Connect to database
    const mongoose = await getDbConnection();
    if (!mongoose?.connection?.db) {
      throw new Error('Database connection not available');
    }
    
    const users = mongoose.connection.db.collection('users');
    
    // Check if user exists
    const user = await users.findOne({
      _id: new ObjectId(userId)
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found' 
        },
        { status: 404 }
      );
    }

    // Prevent deletion of admin user
    if (user.username === 'adminbizln') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cannot delete default admin user' 
        },
        { status: 403 }
      );
    }

    // Delete the user with write concern
    const deleteResult = await users.deleteOne(
      { _id: new ObjectId(userId) },
      { 
        writeConcern: { 
          w: 'majority', 
          j: true,
          wtimeout: 10000 
        } 
      }
    );

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to delete user' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedUserId: userId
    });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete user',
        details: sanitizeDbError(error)
      },
      { status: 500 }
    );
  }
}