import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { MongoClient, ServerApiVersion } from 'mongodb';

// Corrected MongoDB connection string without angle brackets
const uri = process.env.MONGODB_URI || "mongodb+srv://bizloan-project03:IR0Y0MN607DeMmwB@cluster0.8yzfowk.mongodb.net/";
const dbName = "bizloan";

export async function GET(req: NextRequest) {
  console.log('Testing MongoDB connection with direct credentials...');
  console.log('Connection string:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
  
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('MongoDB connection successful!');
    
    const db = client.db();
    await db.admin().ping();
    console.log('Ping successful!');
    
    // Try basic database operations
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      database: db.databaseName,
      collections: collections.map(c => c.name)
    });
  } catch (error: any) {
    console.error('MongoDB connection test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    console.log('MongoDB connection closed');
    await client.close();
  }
} 