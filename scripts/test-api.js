const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3001'; // Adjust if your server runs on a different port
const LOAN_ID = 'BIZLN-1234'; // The loan ID we created in the test-document.js script

async function testFetchDocuments() {
  try {
    console.log(`Testing API endpoint: GET /api/s3-documents/${LOAN_ID}`);
    console.log(`Request URL: ${API_BASE_URL}/api/s3-documents/${LOAN_ID}`);
    
    const response = await axios.get(`${API_BASE_URL}/api/s3-documents/${LOAN_ID}`, {
      validateStatus: function (status) {
        return status < 500; // Only treat 500+ errors as actual errors
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ API request successful');
      console.log(`Found ${response.data.count} documents for loan ${LOAN_ID}`);
      
      // Print document details
      if (response.data.documents && response.data.documents.length > 0) {
        console.log('\nDocuments:');
        response.data.documents.forEach((doc, index) => {
          console.log(`\nDocument ${index + 1}:`);
          console.log(`- ID: ${doc._id}`);
          console.log(`- Filename: ${doc.fileName}`);
          console.log(`- Document Type: ${doc.documentType}`);
          console.log(`- S3 URL: ${doc.url.substring(0, 60)}...`); // Show only beginning of URL for security
        });
      } else {
        console.log('No documents found');
      }
      
      return response.data;
    } else {
      console.log(`⚠️ API returned status ${response.status} with message: ${response.data.message || 'No message'}`);
      return response.data;
    }
  } catch (error) {
    console.error('❌ API test failed:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    throw error;
  }
}

async function runTests() {
  try {
    const result = await testFetchDocuments();
    if (result.success || result.status === 404) {
      console.log('\n🎉 API test completed (not necessarily successful)!');
    } else {
      console.error('\n⚠️ API returned error response');
    }
  } catch (error) {
    console.error('\n❌ API tests failed with error');
    process.exit(1);
  }
}

runTests(); 