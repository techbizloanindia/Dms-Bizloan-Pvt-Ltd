import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// Disable body parsing, we'll handle it manually
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout (maximum for hobby plan)

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
      logger.error('Invalid content type for file upload:', contentType);
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
    
    logger.log('Processing file upload request...');
    
    // Get form data fields
    const loanNumber = formData.get('loanNumber') as string;
    const fullName = formData.get('fullName') as string;
    const description = formData.get('description') as string || '';
    const folderPath = formData.get('folderPath') as string || '';
    
    logger.log(`Received form data - Loan: ${loanNumber}, Name: ${fullName}`);
    
    // Get files from form data
    const files: File[] = [];
    const fileEntries = formData.getAll('files');
    
    logger.log(`Found ${fileEntries.length} file entries in form data`);
    
    // Define a type for file-like objects
    interface FileLike {
      name: string;
      type: string;
      arrayBuffer: () => Promise<ArrayBuffer>;
    }
    
    // Convert FileLike objects to proper File objects if needed
    for (let i = 0; i < fileEntries.length; i++) {
      const entry = fileEntries[i];
      try {
        if (entry instanceof File) {
          logger.log(`Processing file ${i + 1}: ${entry.name} (${entry.size} bytes, ${entry.type})`);
          files.push(entry);
        } else if (entry && typeof entry === 'object') {
          const fileLike = entry as unknown as FileLike;
          if (fileLike.name && fileLike.arrayBuffer) {
            logger.log(`Processing file-like object ${i + 1}: ${fileLike.name}`);
            const arrayBuffer = await fileLike.arrayBuffer();
            files.push(new File(
              [arrayBuffer],
              fileLike.name,
              { type: fileLike.type || 'application/octet-stream' }
            ));
          } else {
            logger.warn(`Skipping invalid file entry at index ${i}: missing required properties`);
          }
        } else {
          logger.warn(`Skipping invalid file entry at index ${i}: not a File or File-like object`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error processing file entry at index ${i}:`, errorMessage);
        // Continue with other files even if one fails
      }
    }
    
    // Validate inputs
    if (!loanNumber || !fullName) {
      const message = !loanNumber && !fullName
        ? 'Loan number and full name are required'
        : !loanNumber
          ? 'Loan number is required'
          : 'Full name is required';
      
      logger.error(`Validation failed: ${message}`);
      return NextResponse.json({
        success: false,
        message
      }, { status: 400 });
    }
    
    if (files.length === 0) {
      logger.error('Validation failed: No valid files were found in the request');
      return NextResponse.json({
        success: false,
        message: 'At least one valid file is required'
      }, { status: 400 });
    }

    
    const uploadedDocs = [];
    
    // Process each file
    for (const file of files) {
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
        'text/csv',
        'application/octet-stream' // For unknown types, fallback
      ];
      
      if (!allowedTypes.includes(file.type)) {
        logger.error(`Invalid file type for ${file.name}: ${file.type}`);
        // Instead of returning immediately, skip this file and continue with others
        continue;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        logger.error(`File size exceeds limit for ${file.name}: ${file.size} bytes`);
        // Instead of returning immediately, skip this file and continue with others
        continue;
      }

      // Generate unique filename with UUID to avoid collisions
      const originalName = file.name;
      const fileName = `${uuidv4()}-${originalName.replace(/\s+/g, '-')}`;
      
      // Handle folder structure if folderPath is provided
      let s3Key: string;
      if (folderPath) {
        // Preserve folder structure - use relative path from folder upload
        const normalizedPath = folderPath.replace(/\\/g, '/'); // Normalize path separators
        s3Key = `documents/${loanNumber}/${normalizedPath}`;
      } else {
        // Standard upload - use generated filename
        s3Key = `documents/${loanNumber}/${fileName}`;
      }
      
      let s3Location: string | undefined;

      try {
        logger.log(`Starting upload of file: ${fileName} to S3`);
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
                },
            },
        });

        upload.on("httpUploadProgress", (progress) => {
            logger.log(`Upload progress for ${fileName}: ${progress.loaded} of ${progress.total}`);
        });

        const result = await upload.done();
        s3Location = result.Location;
        logger.log(`Successfully uploaded file to S3: ${s3Location}`);

      } catch (fileError) {
        const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
        logger.error(`Failed to upload file ${fileName} to S3:`, errorMessage);
        
        return NextResponse.json({
          success: false,
          message: `Failed to upload file ${file.name}: ${errorMessage}`,
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        }, { status: 500 });
      }
      
      // Create document record referencing the S3 file
      const documentDoc = {
        _id: new ObjectId(),
        loanNumber: loanNumber,
        fullName: fullName,
        fileName: fileName,
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
        description: description,
        s3Key: s3Key,
        s3Location: s3Location,
        folderPath: folderPath || '', // Add folder path support
        uploadedAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        metadata: {
          uploadSource: folderPath ? 'admin-folder-upload' : 'admin-upload',
          uploader: 'admin', // TODO: Replace with actual user ID from session
          mimeType: file.type || 'application/octet-stream',
          preservedStructure: !!folderPath
        },
        // Add searchable fields for better querying
        searchTerms: [
          loanNumber.toLowerCase(),
          fullName.toLowerCase(),
          ...(description ? description.toLowerCase().split(/\s+/) : []),
          ...file.name.toLowerCase().split(/[\s.-]+/)
        ].filter(term => term.length > 2) // Only include terms longer than 2 chars
      };

      // Save document to MongoDB with retry logic
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let result;
      let lastError;

      while (retryCount < MAX_RETRIES) {
        try {
          // Connect to database and get collection directly
          const { db } = await connectToDatabase();
          const documentsCollection = db.collection('documents');
          result = await documentsCollection.insertOne(documentDoc);
          logger.log(`Document record created in MongoDB: ${result.insertedId}`);
          break; // Success, exit retry loop
        } catch (dbError) {
          lastError = dbError;
          retryCount++;
          
          if (retryCount < MAX_RETRIES) {
            const delayMs = 1000 * Math.pow(2, retryCount); // Exponential backoff
            logger.warn(`Retry ${retryCount}/${MAX_RETRIES} after error saving document:`,
              dbError instanceof Error ? dbError.message : 'Unknown error');
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            // All retries failed
            logger.error(`Failed to save document after ${MAX_RETRIES} attempts:`, dbError);
            
            // TODO: Add S3 cleanup logic here if needed
            
            return NextResponse.json({
              success: false,
              message: `Failed to save document record after ${MAX_RETRIES} attempts`,
              error: process.env.NODE_ENV === 'development'
                ? (dbError instanceof Error ? dbError.message : 'Unknown error')
                : undefined
            }, { status: 500 });
          }
        }
      }
      
      // Add to uploaded documents list
      if (result && result.insertedId) {
        const uploadedDoc = {
          id: result.insertedId.toString(),
          name: file.name,
          s3Location: s3Location,
          fullName: fullName,
          loanNumber: loanNumber,
          size: file.size,
          type: file.type,
          uploadedAt: documentDoc.uploadedAt.toISOString()
        };
        
        uploadedDocs.push(uploadedDoc);
        logger.log(`Added document to upload results:`, uploadedDoc);
      }
    }

    // Log successful upload summary
    logger.log(`Successfully processed ${uploadedDocs.length} file(s) for loan ${loanNumber}`);
    
    // Return success response with detailed information
    const response = {
      success: true,
      message: `${uploadedDocs.length} document(s) uploaded successfully`,
      count: uploadedDocs.length,
      timestamp: new Date().toISOString(),
      loanNumber,
      fullName,
      documents: uploadedDocs.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        type: doc.type,
        uploadedAt: doc.uploadedAt,
        s3Location: doc.s3Location,
        status: 'uploaded'
      })),
      metadata: {
        processingTime: `${Date.now() - startTime}ms`,
        totalSize: uploadedDocs.reduce((sum, doc) => sum + (doc.size || 0), 0)
      }
    };

    logger.log('Upload completed successfully:', response);
    
    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'X-Upload-Success': 'true',
        'X-Files-Uploaded': uploadedDocs.length.toString()
      }
    });

  } catch (error: any) {
    // Log the full error with stack trace in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error in document upload handler:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
    
    // Prepare error response
    const errorResponse = {
      success: false,
      message: 'Failed to process document upload',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: errorStack,
        code: error.code || 'UPLOAD_ERROR'
      })
    };
    
    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Upload-Success': 'false'
      }
    });
  }
}