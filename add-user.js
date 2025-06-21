/**
 * Utility script to add users to the MongoDB database
 * 
 * Usage:
 * node add-user.js username password name role
 * 
 * Example:
 * node add-user.js johndoe password123 "John Doe" user
 */

const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');

// MongoDB connection - use environment variable or fallback to working URI
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://bizloan-project03:IR0Y0MN607DeMmwB@cluster0.8yzfowk.mongodb.net/";

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

async function addUser() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node add-user.js username password name [role]');
    console.log('Example: node add-user.js johndoe password123 "John Doe" user');
    process.exit(1);
  }
  
  const username = args[0];
  const password = args[1];
  const name = args[2];
  const role = args[3] || 'user';
  
  try {
    // Test direct MongoDB connection first
    const client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    await client.close();
    
    // Connect to MongoDB with mongoose
    await mongoose.connect(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    console.log('Mongoose connected to MongoDB');
    
    // Get User model
    const User = mongoose.model('User', userSchema);
    
    // Check if user exists
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      console.log(`User ${username} already exists`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = new User({
      username,
      password: hashedPassword,
      name,
      role,
      isActive: true,
      email: '',
      phoneNumber: '',
      updatedAt: new Date()
    });
    
    await user.save();
    console.log(`User ${username} created successfully`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
addUser(); 