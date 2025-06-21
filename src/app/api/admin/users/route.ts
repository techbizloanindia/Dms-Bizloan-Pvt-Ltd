import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getCollections, verifyConnection, sanitizeDbError } from '@/lib/db';
import { hash } from 'bcryptjs';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    let db;
    try {
      const connection = await connectToDatabase();
      db = connection.db;
      logger.log('Connected to database for user creation');
    } catch (error) {
      logger.error('Failed to connect to database for user creation:', sanitizeDbError(error));
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      }, { status: 500 });
    }
    
    const { users } = getCollections(db);
    
    // Get all users, excluding password field
    const userList = await users
      .find({})
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Transform ObjectId to string
    const transformedUsers = userList.map(user => ({
      ...user,
      _id: user._id.toString()
    }));
    
    return NextResponse.json({
      success: true,
      users: transformedUsers
    });
    
  } catch (error: any) {
    logger.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to fetch users'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  logger.log('Starting user creation process');
  try {
    // Verify MongoDB connection before proceeding
    const isConnected = await verifyConnection();
    if (!isConnected) {
      logger.error('MongoDB connection failed before creating user');
      return NextResponse.json({
        success: false,
        message: 'Database connection error. Please try again later.'
      }, { status: 500 });
    }
    
    // Check admin authentication - temporarily disabled for testing
    // const adminToken = request.headers.get('x-admin-token');
    // if (!adminToken || adminToken !== 'admin-authenticated') {
    //   return NextResponse.json({
    //     success: false,
    //     message: 'Unauthorized: Admin access required'
    //   }, { status: 401 });
    // }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      logger.error('Error parsing request body:', error);
      return NextResponse.json({
        success: false,
        message: 'Invalid request format. Please provide valid JSON.'
      }, { status: 400 });
    }
    
    const { username, password, name, email, role, loanAccess = [] } = body;
    
    // Validate required fields
    if (!username || !password || !name) {
      return NextResponse.json({
        success: false,
        message: 'Username, password, and name are required'
      }, { status: 400 });
    }
    
    // Validate role
    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json({
        success: false,
        message: 'Role must be either "admin" or "user"'
      }, { status: 400 });
    }
    
    // Connect to database
    let db;
    try {
      const connection = await connectToDatabase();
      db = connection.db;
      logger.log('Connected to database for user creation');
    } catch (error) {
      logger.error('Failed to connect to database for user creation:', sanitizeDbError(error));
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      }, { status: 500 });
    }
    
    const { users } = getCollections(db);
    
    // Check if username already exists
    let existingUser;
    try {
      existingUser = await users.findOne({ username: username.toLowerCase() });
    } catch (error) {
      logger.error('Error checking for existing user:', sanitizeDbError(error));
      return NextResponse.json({
        success: false,
        message: 'Error checking for existing user'
      }, { status: 500 });
    }
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Username already exists'
      }, { status: 409 });
    }
    
    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await hash(password, 10);
      logger.log('Password hashed successfully');
    } catch (error) {
      logger.error('Error hashing password:', error);
      return NextResponse.json({
        success: false,
        message: 'Error processing user credentials'
      }, { status: 500 });
    }
    
    // Create user document
    const newUser = {
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
      email: email || '',
      role: role || 'user',
      loanAccess: Array.isArray(loanAccess) ? loanAccess : [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    
    logger.log('Prepared user document for creation:', { ...newUser, password: '[REDACTED]' });
    
    // Insert user into database
    let result;
    try {
      result = await users.insertOne(newUser);
      logger.log(`User created successfully with ID: ${result.insertedId}`);
    } catch (error) {
      logger.error('Error creating user in database:', sanitizeDbError(error));
      return NextResponse.json({
        success: false,
        message: 'Error creating user in database'
      }, { status: 500 });
    }
    
    // Return success response with user data (excluding password)
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        ...userWithoutPassword,
        _id: result.insertedId.toString()
      }
    }, { status: 201 });
    
  } catch (error: any) {
    logger.error('Error creating user:', sanitizeDbError(error));
    return NextResponse.json({
      success: false,
      message: error?.message || 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? sanitizeDbError(error) : undefined
    }, { status: 500 });
  }
}