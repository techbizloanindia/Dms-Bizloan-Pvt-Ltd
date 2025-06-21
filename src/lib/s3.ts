import { S3Client } from '@aws-sdk/client-s3';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!S3_BUCKET_NAME || !AWS_DEFAULT_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  throw new Error("Missing required S3 environment variables");
}

declare global {
  var s3Client: S3Client | null;
}

let cachedS3Client = global.s3Client;

if (!cachedS3Client) {
  cachedS3Client = global.s3Client = new S3Client({
    region: AWS_DEFAULT_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
}

const s3 = cachedS3Client;

export default s3;