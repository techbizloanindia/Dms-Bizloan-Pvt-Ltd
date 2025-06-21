const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:3001'; // Adjust if your server runs on a different port
const LOAN_ID = 'BIZLN-1234'; // The loan ID we created in the test-document.js script

async function testDebugEndpoint() {
  try {
    console.log(`Testing debug endpoint: GET /api/debug/documents/${LOAN_ID}`);
    console.log(`Request URL: ${API_BASE_URL}/api/debug/documents/${LOAN_ID}`);
    
    const response = await axios.get(`${API_BASE_URL}/api/debug/documents/${LOAN_ID}`, {
      validateStatus: function (status) {
        return status < 500; // Only treat 500+ errors as actual errors
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Debug API request successful');
      console.log(`\nMongoDB Stats:`);
      console.log(`- Total documents: ${response.data.stats.totalDocuments}`);
      console.log(`- Documents with loanId: ${response.data.stats.documentsWithLoanId}`);
      console.log(`- Documents with loanNumber: ${response.data.stats.documentsWithLoanNumber}`);
      console.log(`- Documents with storageKey: ${response.data.stats.documentsWithStorageKey}`);
      console.log(`- Documents with s3Key: ${response.data.stats.documentsWithS3Key}`);
      console.log(`- Documents with path: ${response.data.stats.documentsWithPath}`);
      
      console.log(`\nFound ${response.data.count} documents for loan ${LOAN_ID}`);
      
      // Print document details
      if (response.data.documents && response.data.documents.length > 0) {
        console.log('\nDocuments:');
        response.data.documents.forEach((doc, index) => {
          console.log(`\nDocument ${index + 1}:`);
          console.log(`- ID: ${doc._id}`);
          console.log(`- Fields: ${Object.keys(doc).join(', ')}`);
          console.log(`- Loan ID fields: loanId=${doc.loanId}, loanNumber=${doc.loanNumber}`);
          console.log(`- File path fields: path=${doc.path}, storageKey=${doc.storageKey}, s3Key=${doc.s3Key}`);
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

// Run the test
testDebugEndpoint().then(() => {
  console.log('\n🎉 Debug test completed');
}).catch(() => {
  console.error('\n❌ Debug test failed');
  process.exit(1);
}); 