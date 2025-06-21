import { connect } from './mongodb';
import bcrypt from 'bcryptjs';

export async function initAdminUser() {
  try {
    const { db } = await connect();
    
    // Check if admin user already exists
    const adminUser = await db.collection('users').findOne({ username: 'adminbizln' });
    
    if (!adminUser) {
      console.log('Creating default admin user...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create the admin user
      await db.collection('users').insertOne({
        username: 'adminbizln',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
      });
      
      console.log('Default admin user created successfully');
    } else {
      console.log('Default admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
} 