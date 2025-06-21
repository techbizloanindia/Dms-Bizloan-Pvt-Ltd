const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

// Test configuration
const TEST_LOAN_NUMBER = 'BIZLN-TEST-001';
const TEST_CUSTOMER_NAME = 'TEST CUSTOMER';
const TEST_FILE_NAME = 'test-document.txt';
const TEST_FILE_CONTENT = 'This is a test document for ops-loan-data upload verification.';

console.log('🧪 TESTING ops-loan-data Upload Functionality');
console.log('============================================');

async function testUpload() {
  try {
    // Create a test file
    fs.writeFileSync(TEST_FILE_NAME, TEST_FILE_CONTENT);
    console.log(`📄 Created test file: ${TEST_FILE_NAME}`);

    // Prepare form data
    const formData = new FormData();
    formData.append('loanNumber', TEST_LOAN_NUMBER);
    formData.append('customerName', TEST_CUSTOMER_NAME);
    formData.append('description', 'Test upload for verification');
    formData.append('files', fs.createReadStream(TEST_FILE_NAME));

    console.log('\n📤 Testing upload to ops-loan-data...');
    
    // Make upload request
    const response = await fetch('http://localhost:3000/api/admin/upload-existing-structure', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const result = await response.json();
    console.log('\n📊 Upload Response:');
    console.log('==================');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Message: ${result.message}`);
    
    if (result.success) {
      console.log(`🎯 Bucket: ${result.s3Structure?.bucket}`);
      console.log(`📁 Folder: ${result.customerFolder}`);
      console.log(`📄 Files uploaded: ${result.uploadedFiles}`);
      
      // Verify the expected folder structure
      const expectedFolder = `${TEST_LOAN_NUMBER.replace('BIZLN-', '')}_${TEST_CUSTOMER_NAME}`;
      console.log(`\n🔍 Expected folder: ${expectedFolder}`);
      console.log(`✅ Actual folder: ${result.customerFolder}`);
      console.log(`📋 Match: ${expectedFolder === result.customerFolder ? 'YES' : 'NO'}`);
      
      // Verify the bucket is ops-loan-data
      console.log(`\n🪣 Expected bucket: ops-loan-data`);
      console.log(`✅ Actual bucket: ${result.s3Structure?.bucket}`);
      console.log(`📋 Match: ${result.s3Structure?.bucket === 'ops-loan-data' ? 'YES' : 'NO'}`);
    } else {
      console.error(`❌ Upload failed: ${result.error || result.message}`);
    }

    // Clean up test file
    fs.unlinkSync(TEST_FILE_NAME);
    console.log(`\n🧹 Cleaned up test file: ${TEST_FILE_NAME}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Clean up test file if it exists
    if (fs.existsSync(TEST_FILE_NAME)) {
      fs.unlinkSync(TEST_FILE_NAME);
      console.log(`🧹 Cleaned up test file: ${TEST_FILE_NAME}`);
    }
  }
}

async function verifyS3Connection() {
  try {
    console.log('\n🔌 Verifying S3 Connection to ops-loan-data...');
    
    const s3Client = new S3Client({
      region: 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new ListObjectsV2Command({
      Bucket: 'ops-loan-data',
      MaxKeys: 5
    });

    const response = await s3Client.send(command);
    console.log('✅ S3 connection successful');
    console.log(`📊 Objects found: ${response.KeyCount || 0}`);
    
    if (response.Contents && response.Contents.length > 0) {
      console.log('\n📁 Sample objects:');
      response.Contents.slice(0, 3).forEach(obj => {
        console.log(`   📄 ${obj.Key}`);
      });
    }

  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await verifyS3Connection();
  await testUpload();
  
  console.log('\n🎉 Test completed!');
  console.log('\n📋 Summary:');
  console.log('- Upload endpoint: /api/admin/upload-existing-structure');
  console.log('- Target bucket: ops-loan-data (hardcoded)');
  console.log('- Folder structure: CUSTOMER_ID_CUSTOMER_NAME');
  console.log('- Admin panel: http://localhost:3000/admin/documents');
}

runTests(); 