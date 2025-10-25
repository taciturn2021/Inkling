import dbConnect from '@/lib/db';
import { getGridFsBucket } from '@/lib/gridfs';
import { verifyToken } from '@/lib/auth';
import Note from '@/models/Note';
import Image from '@/models/Image';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/x-icon',
  'image/heic',
  'image/heif',
]);

export async function POST(req) {
  await dbConnect();

  const user = await verifyToken();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const noteId = form.get('noteId');
    const alt = (form.get('alt') || '').toString();

    if (!file || typeof file === 'string') {
      return new NextResponse('File is required', { status: 400 });
    }
    if (!noteId || typeof noteId !== 'string') {
      return new NextResponse('noteId is required', { status: 400 });
    }

    const note = await Note.findOne({ _id: noteId, user: user.userId });
    if (!note) {
      return new NextResponse('Note not found', { status: 404 });
    }

    const contentType = file.type || 'application/octet-stream';
    if (!ALLOWED_TYPES.has(contentType)) {
      return new NextResponse('Unsupported file type', { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const size = arrayBuffer.byteLength;
    if (size > MAX_BYTES) {
      return new NextResponse('File too large', { status: 413 });
    }

    const bucket = getGridFsBucket();
    const filename = file.name || `upload-${Date.now()}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: { note: note._id.toString(), user: user.userId },
    });

    const buffer = Buffer.from(arrayBuffer);
    await new Promise((resolve, reject) => {
      uploadStream.end(buffer, (err) => (err ? reject(err) : resolve()));
    });

    const gridFsId = uploadStream.id;

    const imageDoc = await Image.create({
      note: note._id,
      filename,
      contentType,
      size,
      gridFsId,
      lastSeenAt: new Date(),
    });

    const imageUrl = `/api/images/${imageDoc._id}`;
    return NextResponse.json({
      url: imageUrl,
      markdown: `![${alt || filename}](${imageUrl})`,
      id: imageDoc._id,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


