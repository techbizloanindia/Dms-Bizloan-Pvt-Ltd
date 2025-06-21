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

async function checkCollections() {
  let client;
  
  try {
    console.log('=== Checking MongoDB Collections ===');
    console.log(`MongoDB URI: ${MONGODB_URI.split('@')[1].split('/')[0]}`);
    console.log(`Database name: ${MONGODB_DB}`);
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\nCollections in ${MONGODB_DB}:`);
    collections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name} (${collection.type})`);
    });
    
    // Check each collection for document counts
    console.log('\nDocument counts:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`- ${collection.name}: ${count} documents`);
    }
    
    return collections;
  } catch (error) {
    console.error('=== Collection Check Failed ===');
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

// Run the check
checkCollections().then(() => {
  console.log('Collection check completed');
  process.exit(0);
}); 