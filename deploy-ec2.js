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
  remoteDir: '/home/ec2-user/bizloan',
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
    return true;
  } catch (error) {
    console.error('SSH connection failed. Please check your credentials and try again.');
    return false;
  }
}

// Check if the application is running
async function checkAppStatus() {
  try {
    console.log('\n--- Checking Application Status ---');
    const result = await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "pm2 list"`);
    return result.includes('bizloan') || result.includes('server.js');
  } catch (error) {
    console.error('Failed to check application status.');
    return false;
  }
}

// Deploy the application
async function deployApp() {
  try {
    console.log('\n--- Deploying Application ---');
    
    // Create remote directory if it doesn't exist
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "mkdir -p ${config.remoteDir}"`);
    
    // Copy package.json
    await executeCommand(`scp -i "${config.keyPath}" package.json ${config.ec2User}@${config.ec2Host}:${config.remoteDir}/`);
    
    // Copy server.js
    await executeCommand(`scp -i "${config.keyPath}" server.js ${config.ec2User}@${config.ec2Host}:${config.remoteDir}/`);
    
    // Copy next.config.js
    await executeCommand(`scp -i "${config.keyPath}" next.config.js ${config.ec2User}@${config.ec2Host}:${config.remoteDir}/`);
    
    // Copy tsconfig.json
    await executeCommand(`scp -i "${config.keyPath}" tsconfig.json ${config.ec2User}@${config.ec2Host}:${config.remoteDir}/`);
    
    // Copy tailwind.config.js
    await executeCommand(`scp -i "${config.keyPath}" tailwind.config.js ${config.ec2User}@${config.ec2Host}:${config.remoteDir}/`);
    
    // Create src directory and copy files
    console.log('Creating src directory and copying files...');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "mkdir -p ${config.remoteDir}/src"`);
    await executeCommand(`scp -i "${config.keyPath}" -r src/* ${config.ec2User}@${config.ec2Host}:${config.remoteDir}/src/`);
    
    console.log('Creating .env file...');
    await createEnvFile();
    
    console.log('Installing dependencies...');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "cd ${config.remoteDir} && npm install"`);
    
    console.log('Building application...');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "cd ${config.remoteDir} && npm run build"`);
    
    console.log('Starting application with PM2...');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "cd ${config.remoteDir} && pm2 delete bizloan || true && pm2 start server.js --name bizloan -- PORT=${config.port}"`);
    
    console.log('Saving PM2 process list...');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "pm2 save"`);
    
    console.log('Setting up PM2 startup...');
    await executeCommand(`ssh -i "${config.keyPath}" ${config.ec2User}@${config.ec2Host} "pm2 startup | tail -n 1"`);
    
    return true;
  } catch (error) {
    console.error('Deployment failed:', error);
    return false;
  }
}

// Create .env file on the EC2 instance
async function createEnvFile() {
  // Ask for MongoDB URI
  return new Promise((resolve) => {
    rl.question('Enter your MongoDB URI: ', async (answer) => {
      const mongoUri = answer.trim() || 'mongodb+srv://username:password@cluster.mongodb.net/bizloan';
      
      // Create temporary .env file
      await executeCommand(`echo "PORT=${config.port}\nMONGODB_URI=${mongoUri}\nSESSION_SECRET=bizloan_session_secret\nAWS_ACCESS_KEY_ID=your_aws_access_key\nAWS_SECRET_ACCESS_KEY=your_aws_secret_key\nAWS_DEFAULT_REGION=ap-south-1\nS3_BUCKET_NAME=ops-loan-data\nDEFAULT_ADMIN_USERNAME=admin\nDEFAULT_ADMIN_PASSWORD=admin123\nNODE_ENV=production" > .env.temp`);
      
      // Copy the .env file to EC2
      await executeCommand(`scp -i "${config.keyPath}" .env.temp ${config.ec2User}@${config.ec2Host}:${config.remoteDir}/.env`);
      
      // Remove temporary file
      await executeCommand('rm .env.temp');
      
      resolve();
    });
  });
}

// Configure AWS security group
async function configureSecurityGroup() {
  console.log('\n--- AWS Security Group Configuration ---');
  console.log('Please follow these steps to configure your AWS security group:');
  console.log('1. Log in to the AWS Management Console');
  console.log('2. Navigate to EC2 > Security Groups');
  console.log('3. Find the security group associated with your EC2 instance');
  console.log('4. Click "Edit inbound rules"');
  console.log(`5. Add a new rule: Custom TCP, Port ${config.port}, Source 0.0.0.0/0`);
  console.log('6. Save the rules');
  
  return new Promise((resolve) => {
    rl.question('Have you configured the security group? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        resolve(true);
      } else {
        console.log('Please configure the security group before proceeding.');
        resolve(false);
      }
    });
  });
}

// Check if the application is accessible
async function checkAppAccessibility() {
  console.log('\n--- Checking Application Accessibility ---');
  console.log(`Try accessing your application at: http://${config.ec2Host}:${config.port}`);
  
  return new Promise((resolve) => {
    rl.question('Is the application accessible? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('Great! Your application is now accessible.');
        resolve(true);
      } else {
        console.log('Application is not accessible. Please check the security group configuration.');
        resolve(false);
      }
    });
  });
}

// Main function
async function main() {
  console.log('=== EC2 Deployment Script ===');
  console.log(`Target EC2 instance: ${config.ec2Host}`);
  
  await askForKeyPath();
  await askForUsername();
  
  const connectionSuccess = await testConnection();
  if (!connectionSuccess) {
    console.log('Exiting due to connection failure.');
    rl.close();
    return;
  }
  
  const appRunning = await checkAppStatus();
  if (appRunning) {
    console.log('Application is already running on the EC2 instance.');
    
    const redeploy = await new Promise((resolve) => {
      rl.question('Do you want to redeploy the application? (y/n): ', (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
    
    if (!redeploy) {
      console.log('Exiting without redeployment.');
      rl.close();
      return;
    }
  }
  
  const deploySuccess = await deployApp();
  if (!deploySuccess) {
    console.log('Deployment failed. Please check the logs and try again.');
    rl.close();
    return;
  }
  
  const securityGroupConfigured = await configureSecurityGroup();
  if (!securityGroupConfigured) {
    console.log('Please configure the security group and try again.');
    rl.close();
    return;
  }
  
  const appAccessible = await checkAppAccessibility();
  if (!appAccessible) {
    console.log('Please check your EC2 instance and security group configuration.');
  } else {
    console.log('Deployment completed successfully!');
  }
  
  rl.close();
}

main().catch(error => {
  console.error('An error occurred:', error);
  rl.close();
}); 