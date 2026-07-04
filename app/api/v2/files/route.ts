/**
 * GET    /api/v2/files           — List user files
 * POST   /api/v2/files/upload    — Upload file to MinIO
 * GET    /api/v2/files/:id       — Get file download URL
 * DELETE /api/v2/files/:id       — Delete file
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import prisma from '@/lib/server/db';
import { uploadFile, getPresignedUrl, deleteFile } from '@/lib/server/minio';

export const dynamic = 'force-dynamic';

// ─── List Files ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const files = await prisma.fileObject.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        checksum: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      files: files.map((f: typeof files[number]) => ({
        ...f,
        sizeBytes: Number(f.sizeBytes),
      })),
    });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── Upload File ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const formData = await request.formData();
    const file = (formData as unknown as Map<string, File>).get('file') || null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to MinIO
    const result = await uploadFile(
      user.id,
      file.name,
      buffer,
      file.type || 'application/octet-stream',
    );

    // Save metadata to PostgreSQL
    const fileObj = await prisma.fileObject.create({
      data: {
        userId: user.id,
        objectKey: result.objectKey,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        checksum: result.checksum,
        storageType: 'minio',
        bucket: result.bucket,
      },
    });

    return NextResponse.json({
      id: fileObj.id,
      filename: fileObj.filename,
      objectKey: fileObj.objectKey,
      size: Number(fileObj.sizeBytes),
      checksum: fileObj.checksum,
    }, { status: 201 });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
