const fs = require('fs');
const path = require('path');

// Function to recursively find all TypeScript files in a directory
function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTsFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to add dynamic export to a file if it doesn't have it
function addDynamicExport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file already has dynamic export
  if (!content.includes("export const dynamic = 'force-dynamic'")) {
    // Find the first import statement
    const importRegex = /^import.*?;/m;
    const match = content.match(importRegex);
    
    if (match) {
      // Add dynamic export after the imports
      const lastImportIndex = content.lastIndexOf(match[0]) + match[0].length;
      const beforeImports = content.substring(0, lastImportIndex);
      const afterImports = content.substring(lastImportIndex);
      
      content = beforeImports + '\n\n// Add this to tell Next.js this is a dynamic route\nexport const dynamic = \'force-dynamic\';\n' + afterImports;
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content);
      console.log(`✅ Added dynamic export to ${filePath}`);
      return true;
    } else {
      console.log(`⚠️ Could not find import statement in ${filePath}`);
      return false;
    }
  } else {
    console.log(`ℹ️ ${filePath} already has dynamic export`);
    return false;
  }
}

// Function to update maxDuration if it exceeds 60 seconds
function updateMaxDuration(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has maxDuration export
  const maxDurationRegex = /export const maxDuration = (\d+)/;
  const match = content.match(maxDurationRegex);
  
  if (match) {
    const currentDuration = parseInt(match[1], 10);
    
    if (currentDuration > 60) {
      // Update maxDuration to 60 seconds
      content = content.replace(maxDurationRegex, `export const maxDuration = 60 // 60 seconds timeout (maximum for hobby plan)`);
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated maxDuration to 60 seconds in ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️ ${filePath} already has maxDuration <= 60`);
      return false;
    }
  }
  
  return false;
}

// Main function
function main() {
  const apiDir = path.join(__dirname, 'src', 'app', 'api');
  
  // Check if the directory exists
  if (!fs.existsSync(apiDir)) {
    console.error(`❌ API directory not found: ${apiDir}`);
    return;
  }
  
  // Find all route.ts files
  const routeFiles = findTsFiles(apiDir);
  console.log(`Found ${routeFiles.length} API route files`);
  
  // Update each file
  let updatedCount = 0;
  
  routeFiles.forEach(filePath => {
    const dynamicAdded = addDynamicExport(filePath);
    const maxDurationUpdated = updateMaxDuration(filePath);
    
    if (dynamicAdded || maxDurationUpdated) {
      updatedCount++;
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} API route files`);
}

main(); 