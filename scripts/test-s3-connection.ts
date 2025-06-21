import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'ops-loan-data';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function checkS3Connection() {
  console.log(`Attempting to connect to S3 bucket: ${BUCKET_NAME}...`);

  try {
    const command = new HeadBucketCommand({
      Bucket: BUCKET_NAME,
    });
    await s3Client.send(command);
    console.log(`✅ Successfully connected to S3 bucket: ${BUCKET_NAME}`);
  } catch (error: any) {
    console.error(`❌ Failed to connect to S3 bucket: ${BUCKET_NAME}`);
    console.error('Error details:', error);
    if (error.name === 'NotFound') {
      console.error('Hint: The bucket was not found. Please check the BUCKET_NAME and AWS_REGION.');
    } else if (error.name === 'Forbidden' || error.statusCode === 403) {
      console.error('Hint: Access denied. Please check your AWS credentials (access key and secret key) and IAM permissions.');
    }
  }
}

checkS3Connection();