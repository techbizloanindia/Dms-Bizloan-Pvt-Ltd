require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB connection string
const uri = process.env.MONGODB_URI;

// Create a new MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
});

async function testConnection() {
  console.log('Starting MongoDB connection test...');
  console.log(`URI: ${uri.replace(/:[^:]*@/, ':***@')}`); // Hide password in logs
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to the MongoDB server');
    
    // List available databases
    const adminDb = client.db('admin');
    const result = await adminDb.command({ ping: 1 });
    console.log('Ping result:', result);
    
    const databasesList = await client.db().admin().listDatabases();
    console.log('Available databases:');
    databasesList.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
    
    // Try to access the target database
    const targetDb = client.db('bizloan');
    const collections = await targetDb.listCollections().toArray();
    console.log('Collections in bizloan database:');
    
    if (collections.length === 0) {
      console.log('No collections found. Creating users collection...');
      await targetDb.createCollection('users');
      console.log('Users collection created');
    } else {
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    }
    
    console.log('MongoDB connection test successful!');
    return true;
  } catch (error) {
    console.error('MongoDB connection test failed:');
    console.error(`Error name: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    console.error(`Error stack: ${error.stack}`);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('This is typically a connection issue. Check:');
      console.error('1. Network connectivity');
      console.error('2. IP allowlist in MongoDB Atlas');
      console.error('3. Username and password correctness');
    }
    
    return false;
  } finally {
    await client.close();
    console.log('MongoDB client closed');
  }
}

// Run the test
testConnection()
  .then(success => {
    console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 