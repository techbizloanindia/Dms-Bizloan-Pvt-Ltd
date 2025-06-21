const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
let config = {
  ec2Host: '13.200.169.43',
  ec2User: 'ec2-user',
  keyPath: '',
  port: 3001
};

// Helper function to execute commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Ask for SSH key path
function askForKeyPath() {
  return new Promise((resolve) => {
    rl.question('Enter the path to your SSH key file (.pem): ', (answer) => {
      config.keyPath = answer.trim();
      resolve();
    });
  });
}

// Ask for EC2 username
function askForUsername() {
  return new Promise((resolve) => {
    rl.question('Enter the EC2 username (default: ec2-user): ', (answer) => {
      if (answer.trim()) {
        config.ec2User = answer.trim();
      }
      resolve();
    });
  });
}

// Test SSH connection
async function testConnection() {
  try {
    console.log('\n--- Testing SSH Connection ---');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "echo Connection successful"`);
    console.log('✅ SSH connection successful!');
    return true;
  } catch (error) {
    console.error('❌ SSH connection failed. Please check your credentials and try again.');
    return false;
  }
}

// Check EC2 system status
async function checkSystemStatus() {
  try {
    console.log('\n--- Checking System Status ---');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "df -h && free -m && uptime"`);
    return true;
  } catch (error) {
    console.error('Failed to check system status.');
    return false;
  }
}

// Check if the application is running
async function checkAppStatus() {
  try {
    console.log('\n--- Checking Application Status ---');
    const result = await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "pm2 list"`);
    const isRunning = result.includes('bizloan') || result.includes('server.js');
    
    if (isRunning) {
      console.log('✅ Application is running!');
      await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "pm2 show bizloan || pm2 show server"`);
    } else {
      console.log('❌ Application is not running.');
    }
    
    return isRunning;
  } catch (error) {
    console.error('Failed to check application status.');
    return false;
  }
}

// Check if port is open
async function checkPort() {
  try {
    console.log('\n--- Checking Port Status ---');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "sudo netstat -tulpn | grep :${config.port}"`);
    return true;
  } catch (error) {
    console.error(`Failed to check if port ${config.port} is open.`);
    return false;
  }
}

// Check security group
async function checkSecurityGroup() {
  console.log('\n--- AWS Security Group Check ---');
  console.log('Please verify your security group settings:');
  console.log('1. Log in to the AWS Management Console');
  console.log('2. Navigate to EC2 > Security Groups');
  console.log('3. Find the security group associated with your EC2 instance');
  console.log('4. Check if there is an inbound rule for:');
  console.log(`   - Custom TCP, Port ${config.port}, Source 0.0.0.0/0`);
  
  return new Promise((resolve) => {
    rl.question('Is the security group properly configured? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('✅ Security group is properly configured.');
        resolve(true);
      } else {
        console.log('❌ Please configure the security group to allow traffic on port 3001.');
        resolve(false);
      }
    });
  });
}

// Start the application
async function startApplication() {
  try {
    console.log('\n--- Starting Application ---');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "cd /home/ec2-user/bizloan && pm2 start server.js --name bizloan -- PORT=${config.port} && pm2 save"`);
    console.log('✅ Application started successfully!');
    return true;
  } catch (error) {
    console.error('Failed to start the application.');
    return false;
  }
}

// Main function
async function main() {
  console.log('=== EC2 Status Check Script ===');
  console.log(`Target EC2 instance: ${config.ec2Host}`);
  
  await askForKeyPath();
  await askForUsername();
  
  const connectionSuccess = await testConnection();
  if (!connectionSuccess) {
    console.log('Exiting due to connection failure.');
    rl.close();
    return;
  }
  
  await checkSystemStatus();
  
  const appRunning = await checkAppStatus();
  await checkPort();
  
  const securityGroupConfigured = await checkSecurityGroup();
  
  if (!appRunning) {
    const startApp = await new Promise((resolve) => {
      rl.question('Do you want to start the application? (y/n): ', (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
    
    if (startApp) {
      await startApplication();
      await checkAppStatus();
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`SSH Connection: ${connectionSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`Application Running: ${appRunning ? '✅ Yes' : '❌ No'}`);
  console.log(`Security Group: ${securityGroupConfigured ? '✅ Configured' : '❌ Not Configured'}`);
  
  console.log('\nTo access your application:');
  console.log(`http://${config.ec2Host}:${config.port}`);
  
  rl.close();
}

main().catch(error => {
  console.error('An error occurred:', error);
  rl.close();
}); 