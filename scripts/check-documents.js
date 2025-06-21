const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
const defaultEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: defaultEnvPath });
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "bizloan";

// Test loan ID
const TEST_LOAN_ID = 'BIZLN-1234';

async function connectToMongoDB() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');
  return { client, db: client.db(MONGODB_DB) };
}

async function checkDocuments() {
  let client;
  
  try {
    console.log('=== Checking MongoDB Documents ===');
    
    // Connect to MongoDB
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    
    // Get the documents collection
    const documents = db.collection('documents');
    
    // Check for all documents
    const allDocs = await documents.find({}).toArray();
    console.log(`\nTotal documents in collection: ${allDocs.length}`);
    
    if (allDocs.length > 0) {
      // Analyze field structure of the first few documents
      console.log('\nDocument field structure analysis:');
      
      const sampleDocs = allDocs.slice(0, 5); // Take first 5 documents
      const fieldCounts = {};
      
      sampleDocs.forEach((doc, idx) => {
        console.log(`\nDocument ${idx + 1} fields:`);
        Object.keys(doc).forEach(field => {
          console.log(`- ${field}: ${typeof doc[field]}`);
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        });
      });
      
      console.log('\nField frequency across sample documents:');
      Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).forEach(([field, count]) => {
        console.log(`- ${field}: ${count}/${sampleDocs.length} documents`);
      });
      
      // Check how many documents use loanId vs loanNumber
      const loanIdCount = await documents.countDocuments({ loanId: { $exists: true } });
      const loanNumberCount = await documents.countDocuments({ loanNumber: { $exists: true } });
      
      console.log(`\nDocuments with loanId field: ${loanIdCount}`);
      console.log(`Documents with loanNumber field: ${loanNumberCount}`);
      
      // Check for storage field variations
      const storageKeyCount = await documents.countDocuments({ storageKey: { $exists: true } });
      const s3KeyCount = await documents.countDocuments({ s3Key: { $exists: true } });
      
      console.log(`Documents with storageKey field: ${storageKeyCount}`);
      console.log(`Documents with s3Key field: ${s3KeyCount}`);
    }
    
    // Check for documents with our test loan ID using different field names
    console.log('\nSearching for test loan ID using different field names:');
    
    const loanIdDocs = await documents.find({ loanId: TEST_LOAN_ID }).toArray();
    console.log(`Documents with loanId=${TEST_LOAN_ID}: ${loanIdDocs.length}`);
    
    const loanNumberDocs = await documents.find({ loanNumber: TEST_LOAN_ID }).toArray();
    console.log(`Documents with loanNumber=${TEST_LOAN_ID}: ${loanNumberDocs.length}`);
    
    // Combined query
    const combinedDocs = await documents.find({
      $or: [
        { loanId: TEST_LOAN_ID },
        { loanNumber: TEST_LOAN_ID }
      ]
    }).toArray();
    
    console.log(`Documents with either field matching ${TEST_LOAN_ID}: ${combinedDocs.length}`);
    
    if (combinedDocs.length > 0) {
      console.log('\nDocument details:');
      combinedDocs.forEach((doc, index) => {
        console.log(`\nDocument ${index + 1}:`);
        console.log(`- ID: ${doc._id}`);
        console.log(`- Loan identifier: ${doc.loanId || doc.loanNumber}`);
        console.log(`- Filename: ${doc.fileName}`);
        console.log(`- Document Type: ${doc.documentType || 'N/A'}`);
        console.log(`- Storage Key: ${doc.storageKey || doc.s3Key || 'N/A'}`);
        console.log(`- Upload Date: ${doc.uploadDate || 'N/A'}`);
      });
    } else {
      console.log(`No documents found for loan ID: ${TEST_LOAN_ID} with any field name`);
    }
    
    return { allDocs, combinedDocs };
  } catch (error) {
    console.error('=== Document Check Failed ===');
    console.error(error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (client) {
      await client.close();
      console.log('\nMongoDB connection closed');
    }
  }
}

checkDocuments().then(() => {
  console.log('Check completed');
  process.exit(0);
}); 