import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

// Add this to tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  let loanId = searchParams.get('loanId');

  if (!loanId) {
    return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
  }

  // If the loanId is in the format 'BIZLN-3878', extract '3878'
  if (loanId.startsWith('BIZLN-')) {
    loanId = loanId.split('-')[1];
  }

  const prefix = `${loanId}/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const { Contents = [] } = await s3Client.send(command);

    const files = await Promise.all(
      Contents.map(async (file) => {
        const signedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({ Bucket: BUCKET_NAME, Key: file.Key! }),
          { expiresIn: 3600 }
        );
        return { key: file.Key!, url: signedUrl };
      })
    );

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error(`Failed to list objects in S3 bucket: ${BUCKET_NAME}`, error);
    return NextResponse.json({ error: 'Failed to list S3 objects' }, { status: 500 });
  }
}