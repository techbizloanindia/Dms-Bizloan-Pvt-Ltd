/**
 * Test script to verify login functionality
 * 
 * Usage:
 * node test-login.js username password
 * 
 * Example:
 * node test-login.js nitishsng password123
 */

const fetch = require('node-fetch');

async function testLogin() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node test-login.js username password');
    console.log('Example: node test-login.js nitishsng password123');
    process.exit(1);
  }
  
  const username = args[0];
  const password = args[1];
  
  try {
    console.log(`Testing login for user: ${username}`);
    
    // Test the login API
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ Login test PASSED!');
      console.log(`User ${username} can successfully log in.`);
    } else {
      console.log('❌ Login test FAILED!');
      console.log('Error:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Login test ERROR:', error.message);
  }
}

// Run the test
testLogin(); 