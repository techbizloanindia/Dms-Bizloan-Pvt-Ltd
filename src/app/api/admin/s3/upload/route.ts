import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import dbConnect from '@/lib/mongoose';
import Document from '@/models/Document';

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    let path = formData.get('path') as string;
    const loanNumber = formData.get('loanNumber') as string;
    const fullName = formData.get('fullName') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!loanNumber) {
      return NextResponse.json({ error: 'Loan number is required' }, { status: 400 });
    }

    // Generate unique filename with UUID to prevent conflicts
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const uniqueFileName = `${uuidv4()}-${file.name.replace(/\s+/g, '-')}`;

    // ENFORCE CORRECT S3 FOLDER STRUCTURE: documents/LOAN-ID/filename
    const key = `documents/${loanNumber}/${uniqueFileName}`;
    console.log(`📁 S3 Upload - Enforced structure: ${key}`);
    
    const body = await streamToBuffer(file.stream() as unknown as Readable);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: file.type,
    });

    const uploadResult = await s3Client.send(command);

    const s3Location = `https://${BUCKET_NAME}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;

    const newDocument = new Document({
        loanId: loanNumber,
        loanNumber: loanNumber,
        fileName: uniqueFileName,
        originalName: file.name,
        fullName: fullName || '',
        fileType: file.type,
        fileSize: file.size,
        s3Key: key,
        s3Location: s3Location,
        path: s3Location, // For backward compatibility
        uploadedAt: new Date(),
        status: 'active',
        metadata: {
          uploadSource: 's3-admin-api-upload',
          uploader: 'admin',
          mimeType: file.type || 'application/octet-stream'
        },
        // Add searchable fields for better querying
        searchTerms: [
          loanNumber.toLowerCase(),
          (fullName || '').toLowerCase(),
          ...file.name.toLowerCase().split(/[\s.-]+/)
        ].filter(term => term.length > 2)
    });

    await newDocument.save();

    return NextResponse.json({ success: true, document: newDocument });
  } catch (error: any) {
    console.error(`Failed to upload to S3 bucket: ${BUCKET_NAME}`, error);
    return NextResponse.json({ error: 'Failed to upload to S3' }, { status: 500 });
  }
}