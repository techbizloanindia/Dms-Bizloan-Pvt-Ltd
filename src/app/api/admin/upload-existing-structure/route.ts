import { NextRequest, NextResponse } from 'next/server';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Force bucket to always be ops-loan-data for this endpoint
const BUCKET_NAME = 'ops-loan-data';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 UPLOAD TO ops-loan-data BUCKET ONLY');
    console.log('=====================================');
    console.log(`🎯 Target Bucket: ${BUCKET_NAME}`);
    
    // Parse form data
    const formData = await request.formData();
    const loanNumber = formData.get('loanNumber') as string;
    const customerName = formData.get('customerName') as string;
    const description = formData.get('description') as string || '';
    
    console.log(`📋 Loan Number: ${loanNumber}`);
    console.log(`👤 Customer Name: ${customerName}`);
    console.log(`📝 Description: ${description}`);
    
    // Get files from form data
    const files: File[] = [];
    const fileEntries = formData.getAll('files');
    
    for (const entry of fileEntries) {
      if (entry instanceof File) {
        files.push(entry);
      }
    }
    
    // Validation
    if (!loanNumber || !customerName) {
      return NextResponse.json({
        success: false,
        message: 'Loan number and customer name are required'
      }, { status: 400 });
    }
    
    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'At least one file is required'
      }, { status: 400 });
    }
    
    // Extract customer ID from loan number (remove BIZLN- prefix if present)
    const customerId = loanNumber.replace(/^BIZLN-/, '');
    
    // Create folder name in existing structure format: customer_id_customer_name
    const customerFolder = `${customerId}_${customerName.toUpperCase().replace(/\s+/g, ' ')}`;
    
    console.log(`📁 Target Folder: ${customerFolder}/`);
    
    // Check if folder already exists and get existing structure
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: customerFolder + '/',
      MaxKeys: 1
    });
    
    const existingCheck = await s3Client.send(listCommand);
    const folderExists = existingCheck.Contents && existingCheck.Contents.length > 0;
    
    if (folderExists) {
      console.log(`✅ Folder exists: ${customerFolder}/`);
    } else {
      console.log(`🆕 Creating new folder: ${customerFolder}/`);
    }
    
    const uploadedDocs = [];
    
    // Process each file
    for (const file of files) {
      console.log(`📄 Processing: ${file.name} (${formatBytes(file.size)})`);
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        console.log(`❌ Skipping ${file.name}: Invalid file type ${file.type}`);
        continue;
      }
      
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        console.log(`❌ Skipping ${file.name}: File too large (${formatBytes(file.size)})`);
        continue;
      }
      
      // Use original filename (following existing structure pattern)
      // In existing structure, files are named like: KYC_3878.pdf, LKT_3878.pdf, etc.
      const s3Key = `${customerFolder}/${file.name}`;
      
      try {
        console.log(`☁️ Uploading to: ${s3Key}`);
        
        const buffer = Buffer.from(await file.arrayBuffer());
        
        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: buffer,
            ContentType: file.type,
            Metadata: {
              loanNumber: loanNumber,
              customerId: customerId,
              customerName: customerName,
              originalName: file.name,
              uploadedBy: 'admin',
              uploadDate: new Date().toISOString()
            },
          },
        });
        
        const result = await upload.done();
        
        console.log(`✅ Upload successful: ${result.Location}`);
        
        uploadedDocs.push({
          fileName: file.name,
          s3Key: s3Key,
          size: file.size,
          type: file.type,
          customerFolder: customerFolder,
          s3Location: result.Location,
          uploadedAt: new Date().toISOString()
        });
        
      } catch (uploadError) {
        console.error(`❌ Upload failed for ${file.name}:`, uploadError);
        continue;
      }
    }
    
    if (uploadedDocs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No files were successfully uploaded'
      }, { status: 400 });
    }
    
    console.log(`🎉 SUCCESS: Uploaded ${uploadedDocs.length} files to ${customerFolder}/`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedDocs.length} file(s) to existing structure`,
      loanNumber,
      customerId,
      customerName,
      customerFolder,
      uploadedFiles: uploadedDocs.length,
      documents: uploadedDocs,
      s3Structure: {
        bucket: BUCKET_NAME,
        folderPath: customerFolder + '/',
        storageType: 'existing-structure'
      }
    });
    
  } catch (error) {
    console.error('❌ Upload to existing structure failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to upload to existing structure',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 