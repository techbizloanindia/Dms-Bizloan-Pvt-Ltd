import dbConnect from './mongoose';
import s3 from './s3';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

export async function getDbConnection(): Promise<any> {
  return dbConnect();
}

export function getS3Client() {
  return s3;
}

export async function connectToDatabase() {
  const client = await dbConnect();
  const db = mongoose.connection.db;
  return { client, db };
}

export function getCollections(db: any) {
  return {
    users: db.collection('users'),
    documents: db.collection('documents'),
    sessions: db.collection('sessions'),
    loanAccess: db.collection('loanAccess')
  };
}

export async function verifyConnection(): Promise<boolean> {
  try {
    await dbConnect();
    return mongoose.connection.readyState === 1;
  } catch (error) {
    console.error('MongoDB connection verification failed:', error);
    return false;
  }
}

// Initialize database indexes for optimal performance
export async function initializeDatabase(): Promise<void> {
  try {
    const mongoose = await dbConnect();
    const db = mongoose.connection.db;
    
    // Create indexes for users collection
    const usersCollection = db.collection('users');
    
    // Ensure unique indexes
    await usersCollection.createIndex(
      { username: 1 }, 
      { 
        unique: true, 
        name: 'username_unique',
        background: true 
      }
    );
    
    await usersCollection.createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        sparse: true, // Allow multiple null values
        name: 'email_unique',
        background: true 
      }
    );
    
    // Performance indexes
    await usersCollection.createIndex(
      { createdAt: -1 }, 
      { 
        name: 'createdAt_desc',
        background: true 
      }
    );
    
    await usersCollection.createIndex(
      { role: 1, isActive: 1 }, 
      { 
        name: 'role_isActive',
        background: true 
      }
    );
    
    // Create indexes for documents collection
    const documentsCollection = db.collection('documents');
    
    await documentsCollection.createIndex(
      { loanNumber: 1 }, 
      { 
        name: 'loanNumber_index',
        background: true 
      }
    );
    
    await documentsCollection.createIndex(
      { uploadedAt: -1 }, 
      { 
        name: 'uploadedAt_desc',
        background: true 
      }
    );
    
    await documentsCollection.createIndex(
      { userId: 1, loanNumber: 1 }, 
      { 
        name: 'userId_loanNumber',
        background: true 
      }
    );
    
    // Create indexes for sessions collection
    const sessionsCollection = db.collection('sessions');
    
    await sessionsCollection.createIndex(
      { sessionId: 1 }, 
      { 
        unique: true,
        name: 'sessionId_unique',
        background: true 
      }
    );
    
    await sessionsCollection.createIndex(
      { expiresAt: 1 }, 
      { 
        expireAfterSeconds: 0, // TTL index
        name: 'expiresAt_ttl',
        background: true 
      }
    );
    
    console.log('Database indexes initialized successfully');
    
  } catch (error) {
    console.error('Error initializing database indexes:', error);
    // Don't throw error to prevent app startup failure
  }
}

// Optimize database performance
export async function optimizeDatabase(): Promise<void> {
  try {
    const mongoose = await dbConnect();
    const db = mongoose.connection.db;
    
    // Get database statistics
    const stats = await db.stats();
    console.log('Database statistics:', {
      collections: stats.collections,
      objects: stats.objects,
      dataSize: formatBytes(stats.dataSize),
      indexSize: formatBytes(stats.indexSize),
      storageSize: formatBytes(stats.storageSize)
    });
    
    // List all indexes
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).listIndexes().toArray();
      console.log(`${collection.name} indexes:`, indexes.map(idx => idx.name));
    }
    
  } catch (error) {
    console.error('Error optimizing database:', error);
  }
}

// Format bytes for readable output
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function sanitizeDbError(error: any): string {
  if (!error) return 'Unknown database error';
  
  // Handle mongoose validation errors
  if (error.name === 'ValidationError') {
    return Object.values(error.errors)
      .map((err: any) => err.message)
      .join(', ');
  }
  
  // Handle duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }
  
  // Handle connection errors
  if (error.name === 'MongoNetworkError') {
    return 'Database connection error - please check your internet connection';
  }
  
  // Handle timeout errors
  if (error.name === 'MongoServerSelectionError') {
    return 'Database server selection timeout - please try again';
  }
  
  // Handle authentication errors
  if (error.name === 'MongoServerError' && error.code === 18) {
    return 'Database authentication failed';
  }
  
  // Handle authorization errors
  if (error.name === 'MongoServerError' && error.code === 13) {
    return 'Database authorization failed - insufficient permissions';
  }
  
  // Handle write concern errors
  if (error.name === 'WriteConcernError') {
    return 'Database write operation failed - please try again';
  }
  
  // Handle index errors
  if (error.code === 85) {
    return 'Database index creation failed';
  }
  
  // Return a safe error message for other cases
  return error.message || 'An error occurred while accessing the database';
}