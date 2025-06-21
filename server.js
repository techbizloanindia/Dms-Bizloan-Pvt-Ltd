const express = require('express');
const next = require('next');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs').promises;
const fileUpload = require('express-fileupload');
require('dotenv').config();

// MongoDB connection string - properly formatted
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = "bizloan";
const SESSION_SECRET = process.env.SESSION_SECRET || "bizloan_session_secret";

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Create a cached connection variable
let cachedDb = null;

// MongoDB connection options
const MONGODB_OPTIONS = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  dbName: MONGODB_DB,
  connectTimeoutMS: 30000,  // 30 seconds timeout
  socketTimeoutMS: 45000,   // 45 seconds timeout
  maxPoolSize: 10,          // Maintain up to 10 socket connections
  family: 4                 // Use IPv4, skip trying IPv6
};

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// MongoDB User Schema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  name: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  loanAccess: [String]
});

// Function to test direct MongoDB connection
async function testMongoConnection(retryCount = 0) {
  console.log("Testing MongoDB connection...");
  
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    connectTimeoutMS: 30000,  // 30 seconds timeout
    socketTimeoutMS: 45000,   // 45 seconds timeout 
  });

  try {
    console.log("Attempting to connect to MongoDB...");
    await client.connect();
    console.log("MongoDB connection established, testing database access...");
    await client.db(MONGODB_DB).command({ ping: 1 });
    console.log("MongoDB connection successful! Connected to:", MONGODB_DB);
    
    // List available collections
    const collections = await client.db(MONGODB_DB).listCollections().toArray();
    console.log("Available collections:", collections.map(c => c.name));
    
    await client.close();
    return true;
  } catch (error) {
    console.error("MongoDB connection test failed:", error);
    console.error("Error details:", JSON.stringify({
      message: error.message,
      code: error.code,
      name: error.name
    }));
    
    // Try to reconnect if fewer than 3 attempts have been made
    if (retryCount < 2) {
      console.log(`Retrying connection (attempt ${retryCount + 1} of 3)...`);
      // Wait 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      return testMongoConnection(retryCount + 1);
    }
    
    return false;
  } finally {
    try {
      await client.close();
    } catch (err) {
      // Ignore close errors
    }
  }
}

// Add user programmatically
async function addUser(username, password, name, role) {
  if (!username || !password || !name) {
    console.error('Cannot create user: Missing required fields (username, password, or name)');
    return false;
  }

  try {
    // Ensure User model is registered only once
    let User;
    try {
      User = mongoose.model('User');
    } catch (e) {
      User = mongoose.model('User', UserSchema);
    }
    
    // Trim input values
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    
    // Check if username is valid
    if (trimmedUsername.length < 3) {
      console.error('Cannot create user: Username must be at least 3 characters long');
      return false;
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      console.log(`User ${trimmedUsername} already exists`);
      return true; // Consider this a success since user exists
    }
    
    // Hash password with lower cost factor for reliability
    const hashedPassword = await bcrypt.hash(password, 8);
    
    // Create user
    const user = new User({
      username: trimmedUsername,
      password: hashedPassword,
      name: trimmedName,
      role: role || 'user',
      createdAt: new Date(),
      loanAccess: []
    });
    
    await user.save();
    console.log(`User ${trimmedUsername} created successfully`);
    return true;
  } catch (error) {
    console.error('Error adding user:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    return false;
  }
}

// Ensure collections, indexes, and default admin user exist
async function ensureCollections() {
  try {
    const db = mongoose.connection.db;
    
    // Check if users collection exists
    const collections = await db.listCollections({name: 'users'}).toArray();
    
    if (collections.length === 0) {
      console.log('Creating users collection...');
      await db.createCollection('users');
      console.log('Users collection created successfully');
    } else {
      console.log('Users collection already exists');
    }
    
    // Create indexes
    console.log('Creating indexes on users collection...');
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    console.log('Indexes created successfully');
    
    // Ensure default admin user exists
    console.log('Ensuring default admin user exists...');
    
    
    if (!defaultAdminPassword) {
      console.warn('WARNING: DEFAULT_ADMIN_PASSWORD not set in environment variables. Using fallback password is not recommended for production.');
    }
    
    const adminCreated = await addUser(
      defaultAdminUsername, 
      defaultAdminPassword || 'admin123', 
      'Admin User', 
      'admin'
    );
    if (adminCreated) {
      console.log('Default admin user is ready');
    } else {
      console.error('Failed to ensure default admin user');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring collections exist:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    return false;
  }
}

// Function to create a new user in the database
async function createUser(userData) {
  try {
    console.log('Starting user creation with data:', {
      username: userData.username,
      name: userData.name,
      role: userData.role,
      hasEmail: Boolean(userData.email),
      hasPhone: Boolean(userData.phone),
      hasLoanAccess: Boolean(userData.loanAccess)
    });
    
    // Ensure MongoDB connection is active
    const db = await getMongoConnection();
    if (!db) {
      throw new Error('Failed to connect to MongoDB');
    }
    
    // Extract user data
    const { username, password, name, email, phone, role, loanAccess } = userData;
    
    // Validate required fields
    if (!username) {
      throw new Error('Username is required');
    }
    if (!password) {
      throw new Error('Password is required');
    }
    if (!name) {
      throw new Error('Name is required');
    }
    
    // Trim text fields
    const trimmedUsername = String(username).trim();
    const trimmedName = String(name).trim();
    const trimmedEmail = email ? String(email).trim() : undefined;
    const trimmedPhone = phone ? String(phone).trim() : undefined;
    
    console.log('Validating user fields...');
    
    // Additional validation
    if (trimmedUsername.length === 0) {
      throw new Error('Username cannot be empty');
    }
    if (trimmedName.length === 0) {
      throw new Error('Name cannot be empty');
    }
    if (trimmedEmail && !trimmedEmail.includes('@')) {
      throw new Error('Invalid email format');
    }
    
    // Get User model - handle case where it might not be registered
    let User;
    try {
      User = mongoose.model('User');
      console.log('User model accessed successfully');
    } catch (modelError) {
      console.error('Error accessing User model:', modelError);
      // If model isn't registered, use the schema to register it
      User = mongoose.model('User', UserSchema);
      console.log('User model registered with schema');
    }
    
    // Check if username already exists
    console.log('Checking if username exists:', trimmedUsername);
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Check if email already exists (if provided)
    if (trimmedEmail) {
      console.log('Checking if email exists:', trimmedEmail);
      const existingEmail = await User.findOne({ email: trimmedEmail });
      if (existingEmail) {
        throw new Error('Email already exists');
      }
    }
    
    // Hash the password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 8);
    console.log('Password hashed successfully');
    
    // Create the user document
    console.log('Creating user document...');
    const newUser = new User({
      username: trimmedUsername,
      password: hashedPassword,
      name: trimmedName,
      role: role || 'user',
      loanAccess: Array.isArray(loanAccess) ? loanAccess : [],
      createdAt: new Date()
    });
    
    // Add optional fields if provided
    if (trimmedEmail) newUser.email = trimmedEmail;
    if (trimmedPhone) newUser.phone = trimmedPhone;
    
    // Save to database
    console.log('Saving user to database...');
    const savedUser = await newUser.save();
    console.log('User saved successfully:', trimmedUsername);
    
    // Return user object without password
    return {
      id: savedUser._id.toString(),
      username: savedUser.username,
      name: savedUser.name,
      email: savedUser.email,
      phone: savedUser.phone,
      role: savedUser.role,
      loanAccess: savedUser.loanAccess,
      createdAt: savedUser.createdAt
    };
  } catch (error) {
    console.error('Error in createUser function:', error);
    // Enhance the error with more details if it's a Mongoose error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      throw new Error(`Validation error: ${messages.join(', ')}`);
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      // Duplicate key error
      throw new Error(`Duplicate value: ${JSON.stringify(error.keyValue)}`);
    }
    throw error;
  }
}

// Function to get MongoDB connection with enhanced reliability
async function getMongoConnection() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedDb;
  }
  
  try {
    console.log('Creating new MongoDB connection');
    
    // Force close any existing connection if it's not in DISCONNECTED state
    if (mongoose.connection.readyState !== 0) {
      console.log('Closing existing mongoose connection');
      await mongoose.connection.close();
      // Give it a moment to fully close
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Connect with retry logic
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        // Debug connection URI without showing credentials
        const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log('Connecting to MongoDB with URI:', maskedUri);
        
        await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
        cachedDb = mongoose.connection;
        console.log('MongoDB connection established successfully');
        
        // Set up error handling for the connection
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
          cachedDb = null;
        });
        
        mongoose.connection.on('disconnected', () => {
          console.log('MongoDB disconnected');
          cachedDb = null;
        });
        
        mongoose.connection.on('reconnected', () => {
          console.log('MongoDB reconnected');
          cachedDb = mongoose.connection;
        });
        
        mongoose.connection.on('close', () => {
          console.log('MongoDB connection closed');
          cachedDb = null;
        });
        
        // Verify the connection with a ping
        await mongoose.connection.db.admin().ping();
        console.log('Successfully pinged MongoDB server');
        
        // Initialize database indexes for better performance
        try {
          const { initializeDatabase } = require('./src/lib/db');
          await initializeDatabase();
          console.log('Database indexes initialized');
        } catch (error) {
          console.warn('Failed to initialize database indexes:', error.message);
          // Don't fail startup for index creation issues
        }
        
        return cachedDb;
      } catch (error) {
        lastError = error;
        console.error(`MongoDB connection attempt failed (${retries} retries left):`, error.message);
        if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
          console.error('MongoDB connection error details:', {
            message: error.message,
            reason: error.reason,
            code: error.code
          });
        }
        retries--;
        
        if (retries > 0) {
          // Wait before retrying
          console.log('Waiting 2 seconds before retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // If we get here, all retries failed
    console.error('All MongoDB connection attempts failed');
    throw lastError || new Error('Failed to connect to MongoDB after multiple attempts');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Function to create a default admin user
async function ensureDefaultAdmin() {
  try {
    console.log('Ensuring default admin user exists...');
    
    // Get MongoDB connection
    await getMongoConnection();
    
    // Get User model
    let User;
    try {
      User = mongoose.model('User');
    } catch (error) {
      User = mongoose.model('User', UserSchema);
    }
    
    // Check if admin exists
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (adminExists) {
      console.log('Default admin user already exists');
      return true;
    }
    
    // Create admin user
    console.log('Creating default admin user...');
    const adminUser = new User({
      username: 'admin',
      password: await bcrypt.hash('admin123', 8),
      name: 'System Admin',
      role: 'admin',
      createdAt: new Date(),
      loanAccess: []
    });
    
    await adminUser.save();
    console.log('Default admin user created successfully');
    return true;
  } catch (error) {
    console.error('Error creating default admin user:', error);
    return false;
  }
}

app.prepare().then(async () => {
  const server = express();
  
  // First test the MongoDB connection
  const connectionSuccessful = await testMongoConnection();
  if (!connectionSuccessful) {
    console.error("Unable to proceed due to MongoDB connection failure");
    process.exit(1);
  }
  
  // Configure mongoose with Stable API version
  await getMongoConnection();
  
  // Create default admin user
  await ensureDefaultAdmin();
  
  // Parse request body
  server.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        console.error('JSON parsing error:', e.message);
        res.status(400).json({
          success: false,
          message: 'Invalid JSON format in request body'
        });
        return;
      }
    }
  }));
  
  server.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));
  
  // Configure file upload middleware (to be used only on specific routes)
  const fileUploadConfig = fileUpload({
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max file size (increased from 50MB)
    useTempFiles: true,
    tempFileDir: path.join(process.cwd(), 'tmp'),
    createParentPath: true,
    abortOnLimit: true,
    safeFileNames: true,
    preserveExtension: true,
    debug: process.env.NODE_ENV !== 'production'
  });
  
  // Serve uploaded files statically
  server.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Set up sessions
  server.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      dbName: MONGODB_DB,
      ttl: 60 * 60 * 24 // 1 day
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  }));
  
  // Authentication middleware
  const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  };
  
  // Login API
  server.post('/api/login', async (req, res) => {
    try {
      console.log('Login attempt:', { username: req.body.username });
      const { username, password } = req.body;
      
      if (!username || !password) {
        console.log('Login failed: Missing username or password');
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      const User = mongoose.model('User', UserSchema);
      console.log('Searching for user in database...');
      const user = await User.findOne({ username });
      
      if (!user) {
        console.log(`Login failed: User not found - ${username}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      console.log('User found, comparing passwords...');
      console.log('Stored password hash:', user.password.substring(0, 10) + '...');
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        console.log('Login failed: Password mismatch');
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      console.log('Password match successful');
      
      // Create session with loan access information
      req.session.user = {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        loanAccess: user.loanAccess || []
      };
      
      console.log('Login successful for user:', user.username);
      res.json({ 
        success: true, 
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          role: user.role,
          loanAccess: user.loanAccess || []
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  // Logout API
  server.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ success: true });
    });
  });
  
  // Get current user API - Added proper error handling
  server.get('/api/user', (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ user: req.session.user });
  });
  
  // Protected API example
  server.get('/api/protected', isAuthenticated, (req, res) => {
    res.json({ data: 'This is protected data' });
  });
  
  // Add dedicated user creation API endpoint
  server.post('/api/create-user', async (req, res) => {
    try {
      // Add JSON parsing validation
      if (!req.body || Object.keys(req.body).length === 0) {
        console.error('Empty or invalid request body received');
        return res.status(400).json({
          success: false,
          message: 'Request body is empty or invalid'
        });
      }

      console.log('Received user creation request with data:', {
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone || req.body.phoneNumber, // Handle both fields
        role: req.body.role,
        hasPassword: Boolean(req.body.password)
      });
      
      // Log deprecation warning
      console.warn('⚠️  WARNING: /api/create-user is deprecated. Use /api/admin/create-user instead');
      
      // Log all request headers for debugging
      console.log('Request headers:', req.headers);
      
      // Enhanced request validation
      if (!req.body) {
        console.error('Empty request body received');
        return res.status(400).json({
          error: 'Request body is empty'
        });
      }
      
      if (!req.body.username || !req.body.password || !req.body.name) {
        console.error('Missing required fields in request:', {
          hasUsername: Boolean(req.body.username),
          hasPassword: Boolean(req.body.password),
          hasName: Boolean(req.body.name)
        });
        return res.status(400).json({
          error: 'Username, password and name are required'
        });
      }
      
      // Ensure MongoDB connection is active
      console.log('Ensuring MongoDB connection is active...');
      try {
        await getMongoConnection();
        console.log('MongoDB connection is active');
      } catch (connError) {
        console.error('Failed to connect to MongoDB:', connError);
        return res.status(500).json({
          error: 'Database connection failed',
          details: connError.message
        });
      }
      
      // Direct database approach for more reliability
      try {
        // Setup User model if needed
        let User;
        try {
          User = mongoose.model('User');
          console.log('Accessed User model');
        } catch (modelError) {
          console.log('Registering User model with schema...');
          User = mongoose.model('User', UserSchema);
        }
        
        // Check for existing user
        const existingUser = await User.findOne({ username: req.body.username.toLowerCase() });
        if (existingUser) {
          console.log('Username already exists:', req.body.username);
          return res.status(409).json({
            error: 'Username already exists'
          });
        }
        
        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Create user document
        console.log('Creating user document...');
        const newUser = new User({
          username: req.body.username.toLowerCase(),
          password: hashedPassword,
          name: req.body.name.trim(),
          email: req.body.email?.toLowerCase().trim(),
          phone: req.body.phone?.trim(),
          role: req.body.role || 'user',
          loanAccess: Array.isArray(req.body.loanAccess) ? req.body.loanAccess : [],
          createdAt: new Date()
        });
        
        // Save to database and verify result
        console.log('Saving user to database...');
        const savedUser = await newUser.save();
        console.log('User saved with ID:', savedUser._id);
        
        if (!savedUser || !savedUser._id) {
          throw new Error('User was not saved properly');
        }
        
        // Return success response
        return res.status(201).json({
          success: true,
          message: 'User created successfully',
          user: {
            id: savedUser._id.toString(),
            username: savedUser.username,
            name: savedUser.name,
            email: savedUser.email,
            phone: savedUser.phone,
            role: savedUser.role,
            loanAccess: savedUser.loanAccess,
            createdAt: savedUser.createdAt
          }
        });
      } catch (dbError) {
        console.error('Database error during user creation:', dbError);
        return res.status(500).json({
          error: 'Failed to create user in database',
          details: dbError.message
        });
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('Unexpected error in user creation endpoint:', error);
      return res.status(500).json({
        error: 'Server error',
        details: error.message
      });
    }
  });
  
  // Add dedicated user creation API endpoint
  server.post('/api/direct-create-user', async (req, res) => {
    try {
      console.log('Received direct user creation request with data:', {
        username: req.body.username,
        name: req.body.name,
        role: req.body.role,
        hasPassword: Boolean(req.body.password)
      });
      
      // Enhanced request validation
      if (!req.body) {
        console.error('Empty request body received');
        return res.status(400).json({
          error: 'Request body is empty'
        });
      }
      
      if (!req.body.username || !req.body.password || !req.body.name) {
        console.error('Missing required fields in request:', {
          hasUsername: Boolean(req.body.username),
          hasPassword: Boolean(req.body.password),
          hasName: Boolean(req.body.name)
        });
        return res.status(400).json({
          error: 'Username, password and name are required'
        });
      }
      
      try {
        // Check DB connection first
        if (!cachedDb) {
          console.log('No active MongoDB connection, creating new one...');
          await getMongoConnection();
        }
        
        // Verify connection is active
        await mongoose.connection.db.command({ ping: 1 });
        console.log('MongoDB connection confirmed active');
        
        // Check for existing user
        const usersCollection = mongoose.connection.db.collection('users');
        const existingUser = await usersCollection.findOne({ 
          username: req.body.username.toLowerCase() 
        });
        
        if (existingUser) {
          console.log('Username already exists:', req.body.username);
          return res.status(409).json({
            error: 'Username already exists'
          });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Create new user document
        const newUser = {
          _id: new ObjectId(),
          username: req.body.username.toLowerCase(),
          password: hashedPassword,
          name: req.body.name.trim(),
          email: req.body.email?.toLowerCase().trim(),
          phone: req.body.phone?.trim(),
          role: req.body.role || 'user',
          loanAccess: Array.isArray(req.body.loanAccess) ? req.body.loanAccess : [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        };
        
        console.log('Attempting to insert user into database...');
        const result = await usersCollection.insertOne(newUser);
        console.log('Insert result:', result);
        
        if (!result.acknowledged) {
          throw new Error('MongoDB did not acknowledge the insert operation');
        }
        
        // Return success without password
        const { password, ...userWithoutPassword } = newUser;
        console.log('User created successfully via direct API');
        
        return res.status(201).json({
          success: true,
          message: 'User created successfully',
          user: userWithoutPassword
        });
      
      } catch (dbError) {
        console.error('Database error during user creation:', dbError);
        
        // Try to reconnect if it might be a connection issue
        if (dbError.name === 'MongoNetworkError' || 
            dbError.name === 'MongoServerSelectionError' ||
            dbError.message.includes('topology')) {
          
          console.log('Attempting to reconnect to MongoDB...');
          try {
            // Close existing if present
            if (cachedDb) {
              await mongoose.connection.close();
              cachedDb = null;
            }
            await getMongoConnection();
            console.log('Reconnected to MongoDB successfully');
          } catch (reconnectError) {
            console.error('Failed to reconnect to MongoDB:', reconnectError);
          }
        }
        
        return res.status(500).json({
          error: 'Database error when creating user',
          details: dbError.message
        });
      }
    } catch (error) {
      console.error('Unexpected error in direct-create-user endpoint:', error);
      return res.status(500).json({
        error: 'Server error when processing user creation request',
        message: error.message
      });
    }
  });
  
  // Add the admin create-user route that the frontend expects
  server.post('/api/admin/create-user', async (req, res) => {
    try {
      // Add JSON parsing validation
      if (!req.body || Object.keys(req.body).length === 0) {
        console.error('Empty or invalid request body received');
        return res.status(400).json({
          success: false,
          message: 'Request body is empty or invalid'
        });
      }

      console.log('Admin create-user API called with data:', {
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        role: req.body.role,
        hasPassword: Boolean(req.body.password)
      });
      
      // Validate required fields
      if (!req.body.username || !req.body.password || !req.body.name) {
        console.error('Missing required fields:', {
          hasUsername: Boolean(req.body.username),
          hasPassword: Boolean(req.body.password),
          hasName: Boolean(req.body.name)
        });
        return res.status(400).json({
          success: false,
          message: 'Username, password, and name are required'
        });
      }
      
      // Ensure MongoDB connection
      console.log('Ensuring MongoDB connection...');
      await getMongoConnection();
      
      // Setup User model
      let User;
      try {
        User = mongoose.model('User');
      } catch (e) {
        User = mongoose.model('User', UserSchema);
      }
      
      // Check if username already exists
      const existingUser = await User.findOne({ 
        username: req.body.username.toLowerCase() 
      });
      
      if (existingUser) {
        console.log('Username already exists:', req.body.username);
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }
      
      // Check if email already exists (if provided)
      if (req.body.email) {
        const existingEmail = await User.findOne({ 
          email: req.body.email.toLowerCase() 
        });
        
        if (existingEmail) {
          console.log('Email already exists:', req.body.email);
          return res.status(409).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }
      
      // Hash password
      console.log('Hashing password...');
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      
      // Create new user
      const newUser = new User({
        username: req.body.username.toLowerCase().trim(),
        password: hashedPassword,
        name: req.body.name.trim(),
        email: req.body.email?.toLowerCase().trim(),
        phone: req.body.phone?.trim(),
        role: req.body.role || 'user',
        loanAccess: Array.isArray(req.body.loanAccess) ? req.body.loanAccess : [],
        createdAt: new Date()
      });
      
      // Save user
      console.log('Saving user to database...');
      const savedUser = await newUser.save();
      console.log('User created successfully with ID:', savedUser._id);
      
      // Return success response without password
      const userResponse = {
        id: savedUser._id.toString(),
        username: savedUser.username,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
        loanAccess: savedUser.loanAccess,
        createdAt: savedUser.createdAt
      };
      
      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: userResponse
      });
      
    } catch (error) {
      console.error('Error in admin create-user endpoint:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: validationErrors.join(', ')
        });
      }
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return res.status(409).json({
          success: false,
          message: `${field} already exists`
        });
      }
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create user'
      });
    }
  });
  
  // IMPORTANT: Define all Express routes BEFORE the Next.js handler
  
  // Add a test endpoint to check MongoDB connection and user creation
  server.get('/api/test-connection', async (req, res) => {
    try {
      // Test MongoDB connection
      await getMongoConnection();
      
      // Return success
      res.json({
        success: true,
        message: 'MongoDB connection successful',
        database: MONGODB_DB
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Diagnostic endpoint to list all users (for development/testing only)
  server.get('/api/list-users', async (req, res) => {
    try {
      console.log('Diagnostic: Listing all users');
      const User = mongoose.model('User', UserSchema);
      const users = await User.find({}, { username: 1, name: 1, role: 1, _id: 1, createdAt: 1 });
      
      console.log(`Found ${users.length} users in database`);
      
      res.json({
        success: true,
        count: users.length,
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        }))
      });
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Add a test user creation endpoint (for debugging)
  server.get('/api/test-create-user', async (req, res) => {
    try {
      // Generate a random test user
      const timestamp = Date.now();
      const testUser = {
        username: `test_user_${timestamp}`,
        password: 'test123',
        name: 'Test User',
        email: `test${timestamp}@example.com`,
        role: 'user'
      };
      
      // Create the test user
      const user = await createUser(testUser);
      
      res.json({
        success: true,
        message: 'Test user created successfully',
        user
      });
    } catch (error) {
      console.error('Test user creation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Add dedicated document upload API endpoint
  server.post('/api/upload-document', fileUploadConfig, async (req, res) => {
    try {
      console.log('Document upload API called with body fields:', Object.keys(req.body));
      
      // Validate request
      if (!req.body || !req.body.loanNumber) {
        console.error('Missing loanNumber in request body');
        return res.status(400).json({
          success: false,
          error: 'Loan number is required'
        });
      }
      
      // Check if files are present
      if (!req.files || Object.keys(req.files).length === 0) {
        console.error('No files were uploaded');
        return res.status(400).json({
          success: false,
          error: 'No files were uploaded'
        });
      }
      
      console.log('Files received:', Object.keys(req.files));
      
      const { loanNumber, description, fullName } = req.body;
      console.log(`Processing upload for loan: ${loanNumber}, user: ${fullName || 'unknown'}`);
      
      // Handle different file upload formats
      let uploadedFiles = [];
      if (req.files.files) {
        // Handle normal form upload (files field)
        uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
      } else {
        // Handle multiple files with different field names
        uploadedFiles = Object.values(req.files).flat();
      }
      
      console.log(`Processing ${uploadedFiles.length} files for upload`);
      
      // Ensure MongoDB connection is active
      console.log('Connecting to MongoDB...');
      const db = await getMongoConnection();
      if (!db) {
        console.error('Failed to connect to MongoDB for document upload');
        throw new Error('Failed to connect to MongoDB');
      }
      
      // Create document records in MongoDB
      const documentsCollection = db.collection('documents');
      const uploadResults = [];
      const errors = [];
      
      // Process each file
      for (const file of uploadedFiles) {
        try {
          console.log(`Processing file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
          
          // Generate unique filename with UUID
          const originalName = file.name;
          const fileExtension = originalName.split('.').pop().toLowerCase();
          const fileName = `${uuidv4()}-${originalName.replace(/\s+/g, '-')}`;
          
          // Set S3 key for file storage
          const s3Key = `documents/${loanNumber}/${fileName}`;
          
          console.log(`Uploading file to S3: ${s3Key}`);
          
          // Upload to S3
          const upload = new Upload({
            client: s3Client,
            params: {
              Bucket: S3_BUCKET_NAME,
              Key: s3Key,
              Body: file.data,
              ContentType: file.mimetype,
              Metadata: {
                loanNumber: loanNumber,
                fullName: fullName || '',
                originalName: originalName,
              },
            },
          });

          upload.on("httpUploadProgress", (progress) => {
            console.log(`Upload progress for ${fileName}: ${progress.loaded} of ${progress.total}`);
          });

          const uploadResult = await upload.done();
          const s3Location = uploadResult.Location;
          console.log(`File uploaded successfully to S3: ${s3Location}`);
          
          // Create document record
          const documentRecord = {
            loanId: loanNumber,
            loanNumber: loanNumber, // For backward compatibility
            fileName: fileName,
            originalName: originalName,
            fullName: fullName || '',
            description: description || '',
            fileType: file.mimetype || `application/${fileExtension}`,
            fileSize: file.size,
            s3Key: s3Key,
            s3Location: s3Location,
            path: s3Location, // For backward compatibility
            uploadedAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
            metadata: {
              uploadSource: 'admin-server-upload',
              uploader: 'admin', // TODO: Replace with actual user ID from session
              mimeType: file.mimetype || 'application/octet-stream'
            },
            // Add searchable fields for better querying
            searchTerms: [
              loanNumber.toLowerCase(),
              (fullName || '').toLowerCase(),
              ...(description ? description.toLowerCase().split(/\s+/) : []),
              ...originalName.toLowerCase().split(/[\s.-]+/)
            ].filter(term => term.length > 2) // Only include terms longer than 2 chars
          };
          
          // Insert into MongoDB
          console.log('Inserting document record into MongoDB');
          const result = await documentsCollection.insertOne(documentRecord);
          console.log(`Document record created with ID: ${result.insertedId}`);
          
          if (!result.acknowledged) {
            throw new Error('MongoDB did not acknowledge the document insert operation');
          }
          
          uploadResults.push({
            id: result.insertedId.toString(),
            name: originalName,
            fileName: fileName,
            s3Location: s3Location,
            s3Key: s3Key,
            path: s3Location, // For backward compatibility
            size: file.size,
            type: file.mimetype,
            uploadedAt: new Date().toISOString(),
            status: 'uploaded'
          });
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          errors.push({
            fileName: file.name,
            error: fileError.message
          });
        }
      }
      
      // Return appropriate response based on results
      if (uploadResults.length === 0 && errors.length > 0) {
        // All files failed
        console.error('All file uploads failed');
        return res.status(500).json({
          success: false,
          message: 'Failed to upload documents',
          errors: errors
        });
      } else if (errors.length > 0) {
        // Some files failed, some succeeded
        console.log(`${uploadResults.length} files uploaded successfully, ${errors.length} failed`);
        return res.status(207).json({
          success: true,
          message: `${uploadResults.length} document(s) uploaded successfully, ${errors.length} failed`,
          documents: uploadResults,
          errors: errors
        });
      } else {
        // All succeeded
        console.log(`${uploadResults.length} files uploaded successfully`);
        return res.status(200).json({
          success: true,
          message: `${uploadResults.length} document(s) uploaded successfully`,
          documents: uploadResults
        });
      }
    } catch (error) {
      console.error('Document upload error:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload documents',
        details: error.message
      });
    }
  });
  
  // Add API to fetch documents by loan number
  server.get('/api/documents/:loanNumber', async (req, res) => {
    try {
      const { loanNumber } = req.params;
      
      // Ensure MongoDB connection is active
      const db = await getMongoConnection();
      if (!db) {
        throw new Error('Failed to connect to MongoDB');
      }
      
      // Find documents
      const documentsCollection = db.collection('documents');
      const documents = await documentsCollection.find({ loanNumber }).toArray();
      
      res.status(200).json({
        success: true,
        count: documents.length,
        documents
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({
        error: 'Failed to fetch documents',
        details: error.message
      });
    }
  });

  // Helper functions for S3 document processing
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getFileTypeFromExtension(extension) {
    const typeMap = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain'
    };
    return typeMap[extension] || 'application/octet-stream';
  }

  function getDocumentTypeFromFileName(fileName) {
    const name = fileName.toLowerCase();
    
    if (name.includes('aadhar') || name.includes('aadhaar')) return 'Aadhar Card';
    if (name.includes('pan')) return 'PAN Card';
    if (name.includes('bank') || name.includes('statement')) return 'Bank Statement';
    if (name.includes('salary') || name.includes('payslip')) return 'Salary Slip';
    if (name.includes('income')) return 'Income Certificate';
    if (name.includes('property') || name.includes('deed')) return 'Property Document';
    if (name.includes('photo') || name.includes('picture')) return 'Photograph';
    if (name.includes('signature')) return 'Signature';
    if (name.includes('form') || name.includes('application')) return 'Application Form';
    if (name.includes('agreement')) return 'Agreement';
    if (name.includes('insurance')) return 'Insurance Document';
    if (name.includes('gst')) return 'GST Document';
    if (name.includes('itr')) return 'ITR Document';
    
    return 'General Document';
  }

  // Add API to fetch S3 documents by loan number
  server.get('/api/s3-documents/:loanId', async (req, res) => {
    try {
      const { loanId } = req.params;
      
      if (!loanId) {
        return res.status(400).json({
          success: false,
          message: 'Loan ID is required'
        });
      }
      
      console.log(`🔍 Express API: Searching for loan number: ${loanId}`);
      
      // Extract numeric ID from loan number (BIZLN-4006 → 4006)
      let numericId = '';
      if (loanId.startsWith('BIZLN-')) {
        numericId = loanId.replace('BIZLN-', '');
      } else {
        numericId = loanId;
      }
      
      console.log(`📊 Express API: Extracted numeric ID: ${numericId}`);
      
      const s3Client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      
      // First, find all folders that start with this numeric ID (folders are in bucket root)
      const listFoldersCommand = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: '',  // Search from root
        Delimiter: '/',
      });
      
      const foldersResponse = await s3Client.send(listFoldersCommand);
      const commonPrefixes = foldersResponse.CommonPrefixes || [];
      
      // Look for folders that match the pattern: XXXX_NAME/
      const matchingFolder = commonPrefixes.find(prefix => {
        const folderPath = prefix.Prefix || '';
        // Extract folder name: 4006_JATIN/ → 4006_JATIN
        const folderName = folderPath.replace('/', '');
        return folderName.startsWith(`${numericId}_`);
      });
      
      if (!matchingFolder) {
        console.log(`❌ Express API: No folder found for loan ID: ${numericId}`);
        return res.status(200).json({
          success: true,
          loanId,
          count: 0,
          documents: [],
          message: `No documents found for loan number ${loanId}`
        });
      }
      
      const folderPrefix = matchingFolder.Prefix;
      const folderName = folderPrefix?.replace('/', '') || '';
      
      console.log(`✅ Express API: Found matching folder: ${folderName}`);
      
      // Now get all documents from this folder
      const documentsCommand = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: folderPrefix,
      });
  
      const { Contents } = await s3Client.send(documentsCommand);
      
      // Filter out the folder itself and only get actual files
      const files = Contents?.filter(obj => {
        const key = obj.Key || '';
        return key !== folderPrefix && !key.endsWith('/');
      }) || [];
      
      console.log(`📄 Express API: Found ${files.length} documents in folder ${folderName}`);
  
      const documents = files.map(item => {
        const fileName = item.Key?.split('/').pop() || '';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        
        return {
          loanId: loanId,
          fileName: fileName,
          originalName: fileName,
          fileType: getFileTypeFromExtension(fileExtension),
          fileSize: item.Size || 0,
          fileSizeFormatted: formatFileSize(item.Size || 0),
          path: item.Key,
          s3Key: item.Key,
          uploadedAt: item.LastModified,
          description: getDocumentTypeFromFileName(fileName),
          fullName: folderName.split('_').slice(1).join(' '), // Extract name from folder
          folderName: folderName
        };
      });
      
      res.status(200).json({
        success: true,
        loanId,
        folderName,
        count: documents.length,
        documents: documents,
        message: `Found ${documents.length} documents for loan ${loanId} in folder ${folderName}`
      });
      
    } catch (error) {
      console.error('Express API: Error fetching S3 documents:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch S3 documents'
      });
    }
  });

  // Add API to view S3 document by key
  server.get('/api/s3/view/*', async (req, res) => {
    try {
      const s3Key = req.params[0];
      const s3Client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
      });
      const { Body, ContentType } = await s3Client.send(command);
      res.setHeader('Content-Type', ContentType);
      Body.pipe(res);
    } catch (error) {
      console.error('Error viewing S3 document:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to view S3 document'
      });
    }
  });

  // Add API to download S3 document by key
  server.get('/api/s3/download/*', async (req, res) => {
    try {
      const s3Key = req.params[0];
      const s3Client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
      });
      const { Body, ContentType } = await s3Client.send(command);
      res.setHeader('Content-Type', ContentType);
      res.setHeader('Content-Disposition', `attachment; filename="${s3Key.split('/').pop()}"`);
      Body.pipe(res);
    } catch (error) {
      console.error('Error downloading S3 document:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download S3 document'
      });
    }
  });

  // Add API to view document by ID
  server.get('/api/documents/view/:documentId', async (req, res) => {
    try {
      const { documentId } = req.params;
      
      if (!documentId || !ObjectId.isValid(documentId)) {
        return res.status(400).json({
          error: 'Invalid document ID'
        });
      }
      
      // Ensure MongoDB connection is active
      const db = await getMongoConnection();
      if (!db) {
        throw new Error('Failed to connect to MongoDB');
      }
      
      // Find document
      const documentsCollection = db.collection('documents');
      const document = await documentsCollection.findOne({ _id: new ObjectId(documentId) });
      
      if (!document) {
        return res.status(404).json({
          error: 'Document not found'
        });
      }
      
      // Get file path
      const filePath = path.join(process.cwd(), document.path.replace(/^\//, ''));
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        console.error('File not found:', filePath);
        return res.status(404).json({
          error: 'File not found on server'
        });
      }
      
      // Determine content type
      const contentType = document.fileType || 'application/octet-stream';
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${document.originalName || document.fileName}"`);
      
      // Stream file to response
      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error viewing document:', error);
      res.status(500).json({
        error: 'Failed to view document',
        details: error.message
      });
    }
  });
  
  // Add API to download document by ID
  server.get('/api/documents/download-content/:documentId', async (req, res) => {
    try {
      const { documentId } = req.params;
      
      if (!documentId || !ObjectId.isValid(documentId)) {
        return res.status(400).json({
          error: 'Invalid document ID'
        });
      }
      
      // Ensure MongoDB connection is active
      const db = await getMongoConnection();
      if (!db) {
        throw new Error('Failed to connect to MongoDB');
      }
      
      // Find document
      const documentsCollection = db.collection('documents');
      const document = await documentsCollection.findOne({ _id: new ObjectId(documentId) });
      
      if (!document) {
        return res.status(404).json({
          error: 'Document not found'
        });
      }
      
      // Get file path
      const filePath = path.join(process.cwd(), document.path.replace(/^\//, ''));
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        console.error('File not found:', filePath);
        return res.status(404).json({
          error: 'File not found on server'
        });
      }
      
      // Determine content type
      const contentType = document.fileType || 'application/octet-stream';
      
      // Set headers for download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName || document.fileName}"`);
      
      // Stream file to response
      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({
        error: 'Failed to download document',
        details: error.message
      });
    }
  });
  
  // IMPORTANT: Handle all other routes with Next.js AFTER defining all Express routes
  server.all('*', (req, res) => {
    return handle(req, res);
  });
  
  // Start server with fallback and error handling
  const PORT = parseInt(process.env.PORT) || 3000;
  let currentPort = PORT;
  
  const startServer = (port) => {
    const numericPort = parseInt(port);
    console.log(`Attempting to start server on port ${numericPort}...`);
    
    const serverInstance = server.listen(numericPort, (err) => {
      if (err) {
        console.error('Failed to start server:', err);
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${numericPort} is already in use, trying port ${numericPort + 1}...`);
          serverInstance.close();
          startServer(numericPort + 1);
        }
        return;
      }
      console.log(`✅ Server successfully running on port ${numericPort}`);
      console.log(`🌐 Frontend: http://localhost:${numericPort}`);
      console.log(`🔗 Admin Panel: http://localhost:${numericPort}/admin/documents`);
      console.log(`📝 API Base: http://localhost:${numericPort}/api`);
    });
    
    // Error handling for the server
    serverInstance.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${numericPort} is already in use, trying port ${numericPort + 1}...`);
        serverInstance.close();
        startServer(numericPort + 1);
      } else {
        console.error('Server error:', error);
      }
    });
  };
  
  startServer(currentPort);

  // Graceful shutdown handling
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    try {
      if (cachedDb) {
        console.log('Closing MongoDB connection...');
        await mongoose.connection.close();
        console.log('MongoDB connection closed successfully');
      }
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };
  
  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon
  
  return server;
}); 