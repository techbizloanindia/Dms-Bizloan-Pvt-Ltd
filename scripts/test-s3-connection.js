const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env and .env.local
// Variables in .env.local will override .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!BUCKET_NAME || !REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    console.error('❌ Missing required AWS environment variables.');
    console.error('Please ensure AWS_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are set in your .env or .env.local file.');
    process.exit(1);
}

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

async function checkS3Connection() {
  console.log(`Attempting to connect to S3 bucket: ${BUCKET_NAME} in region ${REGION}...`);

  try {
    const command = new HeadBucketCommand({
      Bucket: BUCKET_NAME,
    });
    await s3Client.send(command);
    console.log(`✅ Successfully connected to S3 bucket: ${BUCKET_NAME}`);
  } catch (error) {
    console.error(`❌ Failed to connect to S3 bucket: ${BUCKET_NAME}`);
    console.error('Error details:', error);
    if (error.name === 'NotFound') {
      console.error('Hint: The bucket was not found. Please check the BUCKET_NAME and AWS_REGION.');
    } else if (error.name === 'Forbidden' || (error && error.$metadata && error.$metadata.httpStatusCode === 403)) {
      console.error('Hint: Access denied. Please check your AWS credentials (access key and secret key) and IAM permissions.');
    } else {
        console.error(`Error Name: ${error.name}`);
    }
  }
}

checkS3Connection();