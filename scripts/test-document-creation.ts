const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');
const Document = require('../src/models/Document').default;
const dbConnect = require('../src/lib/mongoose').default;

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
const defaultEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: defaultEnvPath });
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Test loan ID - use a consistent format matching the application
const TEST_LOAN_ID = 'BIZLN-1234';

async function uploadTestFileToS3(filePath, key) {
  console.log(`Uploading test file to S3 bucket: ${BUCKET_NAME}, key: ${key}`);
  
  try {
    // Create a simple text file if it doesn't exist
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 'This is a test document for BizLoan application');
    }
    
    const fileContent = fs.readFileSync(filePath);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: 'text/plain',
    });
    
    await s3Client.send(command);
    console.log(`✅ Successfully uploaded test file to S3: ${key}`);
    return key;
  } catch (error) {
    console.error(`❌ Failed to upload test file to S3: ${key}`);
    console.error('Error details:', error);
    throw error;
  }
}

async function createTestDocument(loanId, storageKey) {
  console.log(`Creating test document in MongoDB for loan: ${loanId}`);
  
  try {
    await dbConnect();
    
    const testDocument = new Document({
      loanId,
      fileName: 'Test Document.txt',
      fileType: 'txt',
      mimeType: 'text/plain',
      fileSize: 100,
      uploadDate: new Date(),
      documentType: 'Loan Agreement',
      storageKey,
      isActive: true,
      uploadedBy: new mongoose.Types.ObjectId(), // This would typically be a valid user ID
    });
    
    const savedDocument = await testDocument.save();
    console.log(`✅ Successfully created test document in MongoDB with ID: ${savedDocument._id}`);
    return savedDocument;
  } catch (error) {
    console.error('❌ Failed to create test document in MongoDB');
    console.error('Error details:', error);
    throw error;
  }
}

async function runTest() {
  try {
    console.log('=== Starting Document Creation Test ===');
    
    // Test file path
    const testFilePath = path.join(process.cwd(), 'tmp', 'test-document.txt');
    const s3Key = `${TEST_LOAN_ID}/test-document.txt`;
    
    // Make sure the tmp directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'tmp'));
    }
    
    // Upload file to S3
    const storageKey = await uploadTestFileToS3(testFilePath, s3Key);
    
    // Create document in MongoDB
    const document = await createTestDocument(TEST_LOAN_ID, storageKey);
    
    console.log('=== Document Creation Test Completed Successfully ===');
    
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    return document;
  } catch (error) {
    console.error('=== Document Creation Test Failed ===');
    console.error(error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runTest().then(() => {
  console.log('Test completed');
  process.exit(0);
}); 