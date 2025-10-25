import dbConnect from '@/lib/db';
import { getGridFsBucket } from '@/lib/gridfs';
import { verifyToken } from '@/lib/auth';
import Note from '@/models/Note';
import Image from '@/models/Image';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req, { params }) {
  await dbConnect();
  try {
    const resolvedParams = await params;
    const imageId = resolvedParams.id;
    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const image = await Image.findById(imageId);
    if (!image) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const note = await Note.findById(image.note);
    if (!note) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const user = await verifyToken();
    const isOwner = user && user.userId && note.user.toString() === user.userId;
    const canAccess = isOwner || note.shared === true;
    if (!canAccess) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Update lastSeenAt for retention
    await Image.updateOne({ _id: image._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});

    const bucket = getGridFsBucket();
    const downloadStream = bucket.openDownloadStream(image.gridFsId);

    const headers = new Headers();
    headers.set('Content-Type', image.contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(downloadStream, { headers });
  } catch (error) {
    console.error('Image fetch error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


