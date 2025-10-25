
import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import Image from '@/models/Image';
import mongoose from 'mongoose';
import '@/models/Label';
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  await dbConnect();

  const user = await verifyToken();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const note = await Note.findOne({ _id: resolvedParams.id, user: user.userId }).populate('labels');
    if (!note) {
      return new NextResponse('Note not found', { status: 404 });
    }
    return NextResponse.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();

  const user = await verifyToken();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const { title, content, format, labels, shared } = await req.json();

    const update = { title, content, format, labels };
    if (typeof shared === 'boolean') {
      update.shared = shared;
    }

    const note = await Note.findOneAndUpdate(
      { _id: resolvedParams.id, user: user.userId },
      update,
      { new: true, runValidators: true }
    );

    if (!note) {
      return new NextResponse('Note not found', { status: 404 });
    }

    // Update lastSeenAt for any images referenced in markdown for this note
    try {
      if (typeof content === 'string' && mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
        const imageIdMatches = [...content.matchAll(/\/api\/images\/([a-f\d]{24})/gi)].map(m => m[1]);
        const uniqueIds = [...new Set(imageIdMatches)].filter(id => mongoose.Types.ObjectId.isValid(id));
        if (uniqueIds.length > 0) {
          await Image.updateMany(
            { _id: { $in: uniqueIds }, note: resolvedParams.id },
            { $set: { lastSeenAt: new Date() } }
          );
        }
      }
    } catch (e) {
      // best-effort; do not block update
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();

  const user = await verifyToken();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const note = await Note.findOneAndDelete({ _id: resolvedParams.id, user: user.userId });

    if (!note) {
      return new NextResponse('Note not found', { status: 404 });
    }

    // Delete images tied to this note (metadata + GridFS)
    try {
      const images = await Image.find({ note: resolvedParams.id });
      if (images.length > 0) {
        const { getGridFsBucket } = await import('@/lib/gridfs');
        const bucket = getGridFsBucket();
        await Promise.all(images.map(async (img) => {
          try { await bucket.delete(img.gridFsId); } catch {}
        }));
        await Image.deleteMany({ note: resolvedParams.id });
      }
    } catch (e) {
      // best-effort cleanup
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete note error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
