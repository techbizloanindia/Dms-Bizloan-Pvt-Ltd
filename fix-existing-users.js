/**
 * Script to fix existing users in the MongoDB database
 * Adds the missing isActive field to all existing users
 * 
 * Usage:
 * node fix-existing-users.js
 */

const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB connection - use environment variable or fallback to working URI
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://bizloan-project03:IR0Y0MN607DeMmwB@cluster0.8yzfowk.mongodb.net/";
const dbName = "bizloan";

async function fixExistingUsers() {
  let client;
  
  try {
    // Create a MongoClient
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB successfully!");
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Find all users that don't have the isActive field
    const usersWithoutIsActive = await usersCollection.find({
      isActive: { $exists: false }
    }).toArray();
    
    console.log(`Found ${usersWithoutIsActive.length} users without isActive field`);
    
    if (usersWithoutIsActive.length > 0) {
      // Update all users to add isActive: true and other missing fields
      const updateResult = await usersCollection.updateMany(
        { isActive: { $exists: false } },
        {
          $set: {
            isActive: true,
            updatedAt: new Date()
          },
          $setOnInsert: {
            email: '',
            phoneNumber: ''
          }
        }
      );
      
      console.log(`Updated ${updateResult.modifiedCount} users with isActive field`);
      
      // Also ensure email and phoneNumber fields exist for all users
      const emailPhoneResult = await usersCollection.updateMany(
        {
          $or: [
            { email: { $exists: false } },
            { phoneNumber: { $exists: false } }
          ]
        },
        {
          $set: {
            updatedAt: new Date()
          },
          $setOnInsert: {
            email: '',
            phoneNumber: ''
          }
        }
      );
      
      console.log(`Updated ${emailPhoneResult.modifiedCount} users with missing email/phone fields`);
    }
    
    // Display all users for verification
    const allUsers = await usersCollection.find({}).toArray();
    console.log('\nAll users in database:');
    allUsers.forEach(user => {
      console.log(`- Username: ${user.username}, Name: ${user.name}, Role: ${user.role}, Active: ${user.isActive}`);
    });
    
    console.log('\nUsers are now ready for login!');
    
  } catch (error) {
    console.error('Error fixing users:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
fixExistingUsers(); 