const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables first
const envPath = path.resolve(process.cwd(), '.env.local');
const defaultEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: defaultEnvPath });
}

// Now require modules that depend on environment variables
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const dbConnect = require('../src/lib/mongoose').default;

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const testS3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function checkS3Connection() {
  console.log(`Attempting to connect to S3 bucket: ${BUCKET_NAME}...`);

  try {
    const command = new HeadBucketCommand({
      Bucket: BUCKET_NAME,
    });
    await testS3Client.send(command);
    console.log(`✅ Successfully connected to S3 bucket: ${BUCKET_NAME}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to connect to S3 bucket: ${BUCKET_NAME}`);
    console.error('Error details:', error);
    if (error.name === 'NotFound') {
      console.error('Hint: The bucket was not found. Please check the BUCKET_NAME and AWS_REGION.');
    } else if (error.name === 'Forbidden' || error.statusCode === 403) {
      console.error('Hint: Access denied. Please check your AWS credentials (access key and secret key) and IAM permissions.');
    }
    return false;
  }
}

async function testMongoConnection() {
    console.log('Testing MongoDB connection...');
    try {
        await dbConnect();
        console.log('✅ MongoDB connection verified');
        return true;
    } catch (error) {
        console.error('❌ Error during MongoDB connection test:', error);
        return false;
    }
}


async function runTests() {
    const mongoSuccess = await testMongoConnection();
    const s3Success = await checkS3Connection();

    if (mongoSuccess && s3Success) {
        console.log('\n🎉 All connection tests passed!');
        process.exit(0);
    } else {
        console.error('\n❌ Some connection tests failed.');
        process.exit(1);
    }
}

runTests();