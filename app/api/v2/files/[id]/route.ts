/**
 * GET    /api/v2/files/[id]          — Get presigned download URL
 * DELETE /api/v2/files/[id]          — Delete file from MinIO + DB
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import prisma from '@/lib/server/db';
import { getPresignedUrl, deleteFile } from '@/lib/server/minio';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const file = await prisma.fileObject.findFirst({
      where: { id, userId: user.id },
    });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const url = await getPresignedUrl(file.objectKey, 3600);
    return NextResponse.json({ url, expiresInSeconds: 3600 });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const file = await prisma.fileObject.findFirst({
      where: { id, userId: user.id },
    });
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await deleteFile(file.objectKey, file.bucket);
    await prisma.fileObject.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
