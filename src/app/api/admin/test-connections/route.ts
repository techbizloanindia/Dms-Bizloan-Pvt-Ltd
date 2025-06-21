import { NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { getDbConnection, getS3Client } from '@/lib/db';
import { ListBucketsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  const results = {
    mongodb: { success: false, message: 'Not tested' },
    s3: { success: false, message: 'Not tested' },
  };

  // Test MongoDB connection
  try {
    await getDbConnection();
    results.mongodb = { success: true, message: 'MongoDB connection successful.' };
  } catch (error: any) {
    results.mongodb = { success: false, message: `MongoDB connection failed: ${error.message}` };
  }

  // Test S3 connection
  try {
    const s3 = getS3Client();
    await s3.send(new ListBucketsCommand({}));
    results.s3 = { success: true, message: 'S3 connection successful.' };
  } catch (error: any) {
    results.s3 = { success: false, message: `S3 connection failed: ${error.message}` };
  }

  const allSuccessful = results.mongodb.success && results.s3.success;

  return NextResponse.json(results, { status: allSuccessful ? 200 : 500 });
}