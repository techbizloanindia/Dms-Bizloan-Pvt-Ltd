import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { S3Client, ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_DEFAULT_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const bucketName = process.env.S3_BUCKET_NAME;

    if (!bucketName) {
      return NextResponse.json({
        success: false,
        error: 'S3_BUCKET_NAME environment variable is not set',
        config: {
          region: process.env.AWS_DEFAULT_REGION,
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          bucketName: null
        }
      }, { status: 400 });
    }

    // Test bucket access
    const headBucketCommand = new HeadBucketCommand({
      Bucket: bucketName,
    });

    await s3Client.send(headBucketCommand);

    // If we reach here, the bucket is accessible
    return NextResponse.json({
      success: true,
      message: 'S3 connection successful',
      config: {
        region: process.env.AWS_DEFAULT_REGION,
        bucketName: bucketName,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('S3 connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown S3 error',
      errorCode: error.Code || error.name || 'UnknownError',
      config: {
        region: process.env.AWS_DEFAULT_REGION,
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        bucketName: process.env.S3_BUCKET_NAME
      }
    }, { status: 500 });
  }
} 