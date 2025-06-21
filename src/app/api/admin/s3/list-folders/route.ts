import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get('prefix') || '';

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: '/',
    });

    const { CommonPrefixes = [], Contents = [] } = await s3Client.send(command);

    const folders = CommonPrefixes.map((prefix) => prefix.Prefix!).filter(Boolean);
    const files = Contents.map((file) => file.Key!).filter(key => !key.endsWith('/'));

    return NextResponse.json({ folders, files });
  } catch (error: any) {
    console.error(`Failed to list objects in S3 bucket: ${BUCKET_NAME}`, error);
    return NextResponse.json({ error: 'Failed to list S3 objects' }, { status: 500 });
  }
}