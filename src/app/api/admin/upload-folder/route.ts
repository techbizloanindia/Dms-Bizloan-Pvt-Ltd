import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Document from '@/models/Document';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// Configure for folder uploads
export const dynamic = 'force-dynamic';
export const maxDuration = 60 // 60 seconds timeout (maximum for hobby plan); // 10 minutes timeout for large folder uploads

const s3Client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    await dbConnect();
    
    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      logger.error('Invalid content type for folder upload:', contentType);
      return NextResponse.json({
        success: false,
        message: 'Invalid content type. Expected multipart/form-data.'
      }, { status: 400 });
    }
    
    // Parse form data
    let formData;
    try {
      formData = await request.formData();
      if (!formData) {
        throw new Error('No form data received');
      }
    } catch (error) {
      logger.error('Error parsing form data:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to parse form data: ' + (error instanceof Error ? error.message : 'Unknown error')
      }, { status: 400 });
    }
    
    logger.log('Processing folder upload request...');
    
    // Get form data fields
    let loanNumber = formData.get('loanNumber') as string;
    let fullName = formData.get('fullName') as string;
    const description = formData.get('description') as string || 'Folder upload from admin panel';
    const preserveFolderStructure = formData.get('preserveFolderStructure') === 'true';
    
    // Get files from form data first to extract folder info if needed
    const files: (File & { webkitRelativePath?: string })[] = [];
    const fileEntries = formData.getAll('files');
    const folderPaths = formData.getAll('folderPath');
    
    logger.log(`Found ${fileEntries.length} file entries in folder upload`);
    
    // Process each file with its folder path
    for (let i = 0; i < fileEntries.length; i++) {
      const entry = fileEntries[i];
      const folderPath = folderPaths[i] as string || '';
      
      if (entry instanceof File) {
        const fileWithPath = entry as File & { webkitRelativePath?: string };
        fileWithPath.webkitRelativePath = folderPath;
        files.push(fileWithPath);
        logger.log(`Processing file ${i + 1}: ${entry.name} in path: ${folderPath}`);
      }
    }

    // Auto-generate loan number if not provided
    if (!loanNumber || loanNumber.trim() === '') {
      const timestamp = Date.now();
      const firstFolderPath = folderPaths[0] as string || '';
      const folderName = firstFolderPath ? firstFolderPath.split('/')[0] : '';
      const extractedNumber = folderName.match(/\d+/)?.[0] || timestamp.toString().slice(-4);
      loanNumber = `BIZLN-${extractedNumber}`;
      logger.log(`Auto-generated loan number: ${loanNumber}`);
    }

    // Auto-extract full name if not provided
    if (!fullName || fullName.trim() === '') {
      const firstFolderPath = folderPaths[0] as string || '';
      const folderName = firstFolderPath ? firstFolderPath.split('/')[0] : '';
      // Try to extract name from folder pattern like "4189_SANTRAM"
      const parts = folderName.split('_');
      if (parts.length >= 2) {
        fullName = parts.slice(1).join(' ').toUpperCase();
      } else if (folderName) {
        fullName = folderName.toUpperCase();
      } else {
        fullName = 'AUTO_EXTRACTED';
      }
      logger.log(`Auto-extracted full name: ${fullName}`);
    }
    
    logger.log(`Processed folder upload - Loan: ${loanNumber}, Name: ${fullName}, Preserve Structure: ${preserveFolderStructure}`);
    
    // Simple validation - just check if files exist
    if (files.length === 0) {
      logger.error('Validation failed: No valid files were found in the folder');
      return NextResponse.json({
        success: false,
        message: 'No valid files found in the selected folder'
      }, { status: 400 });
    }

    const uploadedDocs = [];
    const uploadResults = {
      total: files.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Process each file in the folder
    for (const file of files) {
      try {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/plain',
          'text/csv'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          logger.warn(`Skipping file with invalid type: ${file.name} (${file.type})`);
          uploadResults.failed++;
          uploadResults.errors.push(`${file.name}: Invalid file type (${file.type})`);
          continue;
        }

        const maxSize = 100 * 1024 * 1024; // 100MB per file
        if (file.size > maxSize) {
          logger.warn(`Skipping file that exceeds size limit: ${file.name} (${file.size} bytes)`);
          uploadResults.failed++;
          uploadResults.errors.push(`${file.name}: File size exceeds 100MB limit`);
          continue;
        }

        // Generate S3 key with folder structure
        let s3Key: string;
        if (preserveFolderStructure && file.webkitRelativePath) {
          // Preserve the original folder structure
          const relativePath = file.webkitRelativePath.replace(/\\/g, '/'); // Normalize path separators
          s3Key = `documents/${loanNumber}/${relativePath}`;
        } else {
          // Flatten the structure or use custom structure
          const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, '-')}`;
          s3Key = `documents/${loanNumber}/${fileName}`;
        }
        
        let s3Location: string | undefined;

        try {
          logger.log(`Starting upload of file: ${file.name} to S3 key: ${s3Key}`);
          const buffer = Buffer.from(await file.arrayBuffer());

          const upload = new Upload({
              client: s3Client,
              params: {
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: s3Key,
                  Body: buffer,
                  ContentType: file.type,
                  Metadata: {
                      loanNumber,
                      fullName,
                      originalName: file.name,
                      folderPath: file.webkitRelativePath || '',
                      uploadType: 'folder-upload'
                  },
              },
          });

          const result = await upload.done();
          s3Location = result.Location;
          logger.log(`Successfully uploaded file to S3: ${s3Location}`);

        } catch (s3Error) {
          const errorMessage = s3Error instanceof Error ? s3Error.message : 'Unknown S3 error';
          logger.error(`Failed to upload file ${file.name} to S3:`, errorMessage);
          uploadResults.failed++;
          uploadResults.errors.push(`${file.name}: S3 upload failed - ${errorMessage}`);
          continue;
        }
        
        // Save document metadata to MongoDB
        try {
          // Determine document type based on file name
          const getDocumentType = (fileName: string): string => {
            const name = fileName.toLowerCase();
            if (name.includes('kyc') || name.includes('aadhar') || name.includes('pan')) return 'KYC Document';
            if (name.includes('bank') || name.includes('statement')) return 'Bank Statement';
            if (name.includes('agreement') || name.includes('loan')) return 'Loan Agreement';
            if (name.includes('financial') || name.includes('balance')) return 'Financial Statement';
            if (name.includes('invoice') || name.includes('bill')) return 'Invoice';
            if (name.includes('payment') || name.includes('schedule')) return 'Payment Schedule';
            return 'Other';
          };

          // Get the default admin user (for uploadedBy field)
          const adminUser = await dbConnect().then(async () => {
            const User = (await import('@/models/User')).default;
            // Try to find admin user, with fallback options
            let user = await User.findOne({ username: 'admin' }).select('_id');
            if (!user) {
              user = await User.findOne({ role: 'admin' }).select('_id');
            }
            if (!user) {
              user = await User.findOne({ username: 'Bizloanindiapvtltd' }).select('_id');
            }
            return user;
          });

          if (!adminUser) {
            logger.error('No admin user found in database');
            throw new Error('No admin user found - checked usernames: admin, Bizloanindiapvtltd, and role: admin');
          }

          const newDocument = new Document({
            loanId: loanNumber,
            fileName: file.name,
            fileType: file.type,
            mimeType: file.type,
            fileSize: file.size,
            documentType: getDocumentType(file.name),
            storageKey: s3Key,
            uploadedBy: adminUser._id,
            uploadDate: new Date()
          });

          await newDocument.save();
          uploadedDocs.push(newDocument);
          uploadResults.successful++;
          
          logger.log(`Document metadata saved to MongoDB for: ${file.name}`);
        } catch (dbError) {
          const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
          logger.error(`Failed to save document metadata for ${file.name}:`, errorMessage);
          uploadResults.failed++;
          uploadResults.errors.push(`${file.name}: Database save failed - ${errorMessage}`);
        }
        
      } catch (fileError) {
        const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
        logger.error(`Failed to process file ${file.name}:`, errorMessage);
        uploadResults.failed++;
        uploadResults.errors.push(`${file.name}: Processing failed - ${errorMessage}`);
      }
    }
    
    const processingTime = Date.now() - startTime;
    logger.log(`Folder upload completed in ${processingTime}ms. Success: ${uploadResults.successful}, Failed: ${uploadResults.failed}`);
    
    // Return results
    if (uploadResults.successful === 0) {
      return NextResponse.json({
        success: false,
        message: 'No files were successfully uploaded',
        results: uploadResults
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Folder upload completed: ${uploadResults.successful} files uploaded successfully${uploadResults.failed > 0 ? `, ${uploadResults.failed} failed` : ''}`,
      uploadedDocuments: uploadedDocs,
      results: uploadResults,
      processingTimeMs: processingTime
    }, { status: 200 });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Folder upload error:', errorMessage);
    
    return NextResponse.json({
      success: false,
      message: `Folder upload failed: ${errorMessage}`,
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      processingTimeMs: processingTime
    }, { status: 500 });
  }
} 