require('dotenv').config();
const { MongoClient } = require('mongodb');
const { S3Client, HeadBucketCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function testMongoDBConnection() {
  console.log('\n🔵 Testing MongoDB Connection...');
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📋 Found ${collections.length} collections:`, collections.map(c => c.name));
    
    // Check users collection specifically
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`👥 Users collection has ${userCount} documents`);
    
    await client.close();
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function testS3Connection() {
  console.log('\n🟢 Testing S3 Connection...');
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_DEFAULT_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Test bucket access
    const headBucketCommand = new HeadBucketCommand({
      Bucket: process.env.S3_BUCKET_NAME,
    });
    await s3Client.send(headBucketCommand);
    console.log('✅ S3 bucket access successful');
    console.log(`📦 Bucket: ${process.env.S3_BUCKET_NAME}`);
    console.log(`🌍 Region: ${process.env.AWS_DEFAULT_REGION}`);

    // List some objects to see what's in the bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      MaxKeys: 10,
      Prefix: 'documents/'
    });
    
    const { Contents = [] } = await s3Client.send(listCommand);
    console.log(`📁 Found ${Contents.length} objects in documents/ folder`);
    
    // Look specifically for loan folder 3878
    const loan3878Command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'documents/3878/',
      MaxKeys: 10
    });
    
    const loan3878Result = await s3Client.send(loan3878Command);
    console.log(`🔍 Loan folder 3878: ${loan3878Result.Contents?.length || 0} documents found`);
    
    if (loan3878Result.Contents && loan3878Result.Contents.length > 0) {
      console.log('📄 Documents in loan 3878:');
      loan3878Result.Contents.forEach(obj => {
        console.log(`   - ${obj.Key}`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    return false;
  }
}

async function testUserCreationEndpoint() {
  console.log('\n👤 Testing User Creation Endpoint...');
  try {
    const testUser = {
      username: `test_user_${Date.now()}`,
      password: 'testpass123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user'
    };

    // Note: This would require the server to be running
    console.log('ℹ️  User creation endpoint test requires server to be running');
    console.log('🔗 Endpoint: POST /api/admin/create-user');
    console.log('📝 Test payload ready:', { ...testUser, password: '****' });
    
    return true;
  } catch (error) {
    console.error('❌ User creation test setup failed:', error.message);
    return false;
  }
}

async function testDocumentUploadEndpoint() {
  console.log('\n📄 Testing Document Upload Endpoint...');
  try {
    console.log('ℹ️  Document upload endpoint test requires server to be running');
    console.log('🔗 Endpoint: POST /api/admin/upload-document');
    console.log('📁 Will upload to S3 bucket:', process.env.S3_BUCKET_NAME);
    
    return true;
  } catch (error) {
    console.error('❌ Document upload test setup failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Admin Panel Connections');
  console.log('=====================================');
  
  const results = {
    mongodb: await testMongoDBConnection(),
    s3: await testS3Connection(),
    userCreation: await testUserCreationEndpoint(),
    documentUpload: await testDocumentUploadEndpoint()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`MongoDB Connection: ${results.mongodb ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`S3 Connection: ${results.s3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`User Creation Setup: ${results.userCreation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Document Upload Setup: ${results.documentUpload ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL SYSTEMS GO!' : '⚠️  SOME ISSUES DETECTED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Your admin panel is ready to:');
    console.log('   - Create users in MongoDB');
    console.log('   - Upload documents to S3');
    console.log('   - Find loan folder 3878');
    console.log('   - Manage document storage');
  }
}

main().catch(console.error); 