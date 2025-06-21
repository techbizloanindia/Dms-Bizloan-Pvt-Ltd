import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function GET(request: NextRequest) {
  logger.log(`Attempting to connect to S3 bucket: ${BUCKET_NAME}...`);

  try {
    // 1. Check bucket existence and read permissions
    logger.log(`Step 1: Checking access to S3 bucket: ${BUCKET_NAME}...`);
    const headBucketCommand = new HeadBucketCommand({ Bucket: BUCKET_NAME });
    await s3Client.send(headBucketCommand);
    logger.log(`✅ Bucket found and is accessible.`);

    // 2. Test uploading a small test file
    const testFileContent = 'This is a test file to verify S3 connectivity.';
    const testKey = `test/s3-connection-test-${Date.now()}.txt`;

    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testFileContent,
      ContentType: 'text/plain',
    });

    await s3Client.send(putCommand);
    logger.log(`✅ Write test successful. Object created.`);

    // 3. Test retrieving the file we just uploaded
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
    });

    const { Body } = await s3Client.send(getCommand);
    
    if (!Body) {
      throw new Error('Failed to retrieve file body from S3');
    }

    // Convert the readable stream to a string
    const streamToString = async (stream: Readable): Promise<string> => {
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
    };

    const retrievedContent = await streamToString(Body as Readable);

    // Verify the content matches
    const contentMatches = retrievedContent === testFileContent;

    // Clean up - delete the test file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
    });

    await s3Client.send(deleteCommand);
    logger.log(`✅ Delete test successful. Test object removed.`);

    const message = `✅ S3 connection successful. Bucket is accessible and has read/write permissions.`;
    logger.log(message);
    return NextResponse.json({
      success: true,
      message,
      details: {
        bucketName: BUCKET_NAME,
        region: process.env.AWS_DEFAULT_REGION,
        testFileUploaded: true,
        testFileRetrieved: true,
        contentVerified: contentMatches,
        testFileDeleted: true
      }
    });

  } catch (error: any) {
    const message = `❌ Failed to connect to S3 bucket: ${BUCKET_NAME}`;
    logger.error(message);
    logger.error('Error details:', error);

    let hint = 'An unknown error occurred.';
    if (error.name === 'NotFound') {
      hint = 'The bucket was not found. Please check the BUCKET_NAME and AWS_REGION in your .env.local file.';
    } else if (error.name === 'Forbidden' || error.statusCode === 403) {
      hint = 'Access denied. Please check your AWS credentials (access key and secret key) and IAM permissions.';
    }

    return NextResponse.json({
      success: false,
      message,
      hint,
      error: process.env.NODE_ENV === 'development' ? { name: error.name, message: error.message } : undefined
    }, { status: 500 });
  }
}