import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string[] } }
) {
  try {
    const s3Key = params.id.join('/');
    
    if (!s3Key) {
      return NextResponse.json({
        success: false,
        message: 'Document key is required'
      }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
    });

    const { Body, ContentType } = await s3Client.send(command);

    if (!Body) {
      throw new Error('S3 object body is empty');
    }

    const headers = new Headers();
    headers.set('Content-Type', ContentType || 'application/octet-stream');
    
    // @ts-ignore
    return new NextResponse(Body, {
      status: 200,
      headers,
    });
  
  } catch (error: any) {
    logger.error('Error streaming file from S3:', error);
    return NextResponse.json({
      success: false,
      message: 'Error retrieving file from storage'
    }, { status: 500 });
  }
}