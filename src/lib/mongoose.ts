import mongoose from 'mongoose';
import { MongoClient, ServerApiVersion } from 'mongodb';

// MongoDB connection configuration
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "bizloan";

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Enhanced connection options for better performance and reliability
const connectionOptions = {
  bufferCommands: false,
  dbName: dbName,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Connection pool settings
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  // Retry settings
  retryWrites: true,
  retryReads: true,
  // Heartbeat settings
  heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
  // Compression
  compressors: ['zlib'],
  // SSL/TLS settings for production
  ...(process.env.NODE_ENV === 'production' && {
    ssl: true,
  })
};

async function dbConnect() {
  try {
    // Return existing connection if available
    if (cached.conn) {
      // Verify the connection is still alive
      if (cached.conn.connection.readyState === 1) {
        return cached.conn;
      } else {
        console.warn('Existing connection is not ready, reconnecting...');
        cached.conn = null;
        cached.promise = null;
      }
    }

    if (!cached.promise) {
      console.log(`Connecting to MongoDB at ${uri.split('@')[1]?.split('/')[0]} (${dbName})`);
      
      cached.promise = mongoose.connect(uri, connectionOptions).then((mongooseInstance) => {
        console.log('Successfully connected to MongoDB via Mongoose!');
        
        // Set up connection event listeners
        mongooseInstance.connection.on('error', (error) => {
          console.error('MongoDB connection error:', error);
        });
        
        mongooseInstance.connection.on('disconnected', () => {
          console.warn('MongoDB disconnected');
          cached.conn = null;
          cached.promise = null;
        });
        
        mongooseInstance.connection.on('reconnected', () => {
          console.log('MongoDB reconnected');
        });
        
        // Graceful shutdown handling
        process.on('SIGINT', async () => {
          try {
            await mongooseInstance.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
          } catch (error) {
            console.error('Error during MongoDB shutdown:', error);
            process.exit(1);
          }
        });
        
        return mongooseInstance;
      });
    }
    
    cached.conn = await cached.promise;
    
    // Verify connection is working
    await cached.conn.connection.db.admin().ping();
    
    return cached.conn;
    
  } catch (error: any) {
    // Clear cache on error
    cached.promise = null;
    cached.conn = null;
    
    console.error('Failed to connect to MongoDB:', error);
    
    // Provide more specific error messages
    if (error.name === 'MongoNetworkError') {
      throw new Error('Unable to connect to MongoDB server. Please check your network connection and MongoDB Atlas settings.');
    } else if (error.name === 'MongoParseError') {
      throw new Error('Invalid MongoDB connection string. Please check your MONGODB_URI environment variable.');
    } else if (error.name === 'MongoServerError' && error.code === 8000) {
      throw new Error('MongoDB authentication failed. Please check your username and password.');
    } else if (error.name === 'MongoServerError' && error.code === 13) {
      throw new Error('MongoDB authorization failed. Please check your database permissions.');
    }
    
    throw error;
  }
}

// Health check function
export async function checkConnection(): Promise<boolean> {
  try {
    const mongoose = await dbConnect();
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    return false;
  }
}

// Function to get connection statistics
export function getConnectionStats() {
  if (!cached.conn) {
    return null;
  }
  
  return {
    readyState: cached.conn.connection.readyState,
    host: cached.conn.connection.host,
    port: cached.conn.connection.port,
    name: cached.conn.connection.name,
    collections: Object.keys(cached.conn.connection.collections),
    readyStateText: getReadyStateText(cached.conn.connection.readyState)
  };
}

function getReadyStateText(state: number): string {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

export default dbConnect; 