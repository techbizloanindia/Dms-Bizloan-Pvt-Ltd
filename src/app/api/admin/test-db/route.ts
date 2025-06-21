import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { MongoClient, ServerApiVersion, MongoServerError } from 'mongodb';
import logger from '@/lib/logger';

// Direct connection to MongoDB for testing
const uri = process.env.MONGODB_URI || '';
const dbName = "bizloan";

// Define MongoDB client options
const clientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
};

export async function GET(req: NextRequest) {
  logger.log('Testing MongoDB connection...');
  
  // Create MongoDB client
  const client = new MongoClient(uri, clientOptions);
  
  try {
    logger.log('Connecting to MongoDB...');
    await client.connect();
    logger.log('Connected to MongoDB server');
    
    // Verify connection with ping
    const adminDb = client.db('admin');
    await adminDb.command({ ping: 1 });
    logger.log('Ping successful');
    
    // Get the target database
    const db = client.db(dbName);
    
    // List collections
    logger.log('Listing collections...');
    const collections = await db.listCollections().toArray();
    logger.log(`Found ${collections.length} collections`);
    
    // Get database stats
    logger.log('Getting database stats...');
    const stats = await db.stats();
    logger.log('Database stats retrieved');
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to MongoDB Atlas',
      database: db.databaseName,
      collections: collections.map(c => c.name),
      stats: {
        collections: stats.collections,
        views: stats.views,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      }
    });
  } catch (error: any) {
    logger.error('MongoDB connection test failed');
    
    // Extract error details safely
    const errorName = error?.name || 'Unknown';
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'No code';
    
    logger.error(`Error name: ${errorName}`);
    logger.error(`Error message: ${errorMessage}`);
    logger.error(`Error code: ${errorCode}`);
    
    // Provide specific guidance based on error type
    let guidance = '';
    if (errorName === 'MongoServerSelectionError') {
      guidance = 'Network issue or IP not in allowlist. Please ensure your IP is whitelisted in MongoDB Atlas.';
    } else if (errorName === 'MongoNetworkError') {
      guidance = 'Network connection issue. Check your internet connection.';
    } else if (errorName === 'MongoError' && errorCode === 18) {
      guidance = 'Authentication failed. Check username and password.';
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType: errorName,
      errorCode: errorCode,
      guidance
    }, { status: 500 });
  } finally {
    await client.close();
    logger.log('MongoDB client closed');
  }
}