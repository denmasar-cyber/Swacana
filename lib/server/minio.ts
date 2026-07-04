/**
 * SWACANA v2 — MinIO Object Storage Client
 *
 * S3-compatible storage for files, images, audio, video transcripts.
 * Runs on VPS alongside PostgreSQL.
 * Zero cloud, zero cost, 100% open source.
 */

import { Client as MinioClient } from 'minio';
import crypto from 'node:crypto';

// ─── Configuration ──────────────────────────────────────────────────────────

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'swacana';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'swacana-secret';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const DEFAULT_BUCKET = process.env.MINIO_BUCKET || 'swacana-files';

// ─── MinIO Client ───────────────────────────────────────────────────────────

let _client: MinioClient | null = null;

export function getMinioClient(): MinioClient {
  if (_client) return _client;

  _client = new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });

  return _client;
}

// ─── Bucket Management ─────────────────────────────────────────────────────

export async function ensureBucket(bucket = DEFAULT_BUCKET): Promise<void> {
  const client = getMinioClient();
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, 'us-east-1');
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    };
    await client.setBucketPolicy(bucket, JSON.stringify(policy));
  }
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export interface UploadResult {
  objectKey: string;
  bucket: string;
  etag: string;
  versionId?: string;
  size: number;
  checksum: string;
}

export async function uploadFile(
  userId: string,
  filename: string,
  data: Buffer,
  mimeType: string,
  bucket = DEFAULT_BUCKET,
): Promise<UploadResult> {
  const client = getMinioClient();
  await ensureBucket(bucket);

  const timestamp = Date.now();
  const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectKey = `${userId}/${timestamp}-${sanitizedName}`;

  const checksum = crypto.createHash('sha256').update(data).digest('hex');

  const result = await client.putObject(bucket, objectKey, data, data.length, {
    'Content-Type': mimeType,
    'X-Amz-Meta-UserId': userId,
    'X-Amz-Meta-OriginalName': filename,
    'X-Amz-Meta-Checksum': checksum,
  });

  return {
    objectKey,
    bucket,
    etag: result.etag,
    versionId: result.versionId ?? undefined,
    size: data.length,
    checksum,
  };
}

export async function uploadText(
  userId: string,
  filename: string,
  text: string,
  mimeType = 'text/plain',
  bucket = DEFAULT_BUCKET,
): Promise<UploadResult> {
  const data = Buffer.from(text, 'utf-8');
  return uploadFile(userId, filename, data, mimeType, bucket);
}

// ─── Download ───────────────────────────────────────────────────────────────

export async function downloadFile(
  objectKey: string,
  bucket = DEFAULT_BUCKET,
): Promise<Buffer> {
  const client = getMinioClient();
  const stream = await client.getObject(bucket, objectKey);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function getPresignedUrl(
  objectKey: string,
  expirySeconds = 3600,
  bucket = DEFAULT_BUCKET,
): Promise<string> {
  const client = getMinioClient();
  return client.presignedGetObject(bucket, objectKey, expirySeconds);
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteFile(
  objectKey: string,
  bucket = DEFAULT_BUCKET,
): Promise<void> {
  const client = getMinioClient();
  await client.removeObject(bucket, objectKey);
}

export async function deleteAllUserFiles(
  userId: string,
  bucket = DEFAULT_BUCKET,
): Promise<void> {
  const client = getMinioClient();
  const stream = client.listObjects(bucket, `${userId}/`, true);
  const objects: { name: string }[] = [];

  for await (const obj of stream) {
    if (obj.name) objects.push({ name: obj.name });
  }

  if (objects.length > 0) {
    await client.removeObjects(bucket, objects);
  }
}

// ─── List ───────────────────────────────────────────────────────────────────

export interface FileListItem {
  objectKey: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export async function listUserFiles(
  userId: string,
  bucket = DEFAULT_BUCKET,
): Promise<FileListItem[]> {
  const client = getMinioClient();
  const stream = client.listObjects(bucket, `${userId}/`, false);
  const items: FileListItem[] = [];

  for await (const obj of stream) {
    if (obj.name) {
      items.push({
        objectKey: obj.name,
        size: obj.size ?? 0,
        lastModified: obj.lastModified ?? new Date(),
        etag: obj.etag ?? '',
      });
    }
  }

  return items;
}
