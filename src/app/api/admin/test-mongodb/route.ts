import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, sanitizeDbError } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  logger.log('Attempting to connect to MongoDB...');

  try {
    const isConnected = await verifyConnection();
    
    if (isConnected) {
      const message = '✅ Successfully connected to MongoDB.';
      logger.log(message);
      return NextResponse.json({ success: true, message });
    } else {
      throw new Error('MongoDB connection verification returned false.');
    }

  } catch (error: any) {
    const message = '❌ Failed to connect to MongoDB.';
    logger.error(message, sanitizeDbError(error));

    let hint = 'An unknown error occurred. Check the server logs for details.';
    if (error.message.includes('Authentication failed')) {
      hint = 'Authentication failed. Please check your MONGODB_URI in the .env.local file.';
    } else if (error.message.includes('network')) {
      hint = 'A network error occurred. Please check your internet connection and firewall settings.';
    }

    return NextResponse.json({
      success: false,
      message,
      hint,
      error: process.env.NODE_ENV === 'development' ? sanitizeDbError(error) : undefined
    }, { status: 500 });
  }
}