const { connectToDatabase, verifyConnection } = require('../src/lib/db');
const { hash } = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function testConnection() {
  console.log('Testing MongoDB connection...');
  
  try {
    // Test connection
    console.log('Verifying connection...');
    const isConnected = await verifyConnection();
    if (!isConnected) {
      console.error('❌ Failed to verify MongoDB connection');
      return;
    }
    console.log('✅ MongoDB connection verified');

    // Test creating a user
    console.log('\nTesting user creation...');
    const connection = await connectToDatabase();
    const db = connection.db;
    const users = db.collection('users');

    const testUser = {
      username: `testuser_${Date.now()}`,
      password: await hash('testpass123', 10),
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      role: 'user',
      loanAccess: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    console.log('Creating test user...');
    const result = await users.insertOne(testUser);
    console.log('✅ Successfully created test user with ID:', result.insertedId);

    // Clean up
    console.log('Cleaning up test user...');
    await users.deleteOne({ _id: result.insertedId });
    console.log('✅ Cleaned up test user');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    process.exit(0);
  }
}

testConnection();
