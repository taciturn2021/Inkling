import dbConnect from '@/lib/db';
import { getGridFsBucket } from '@/lib/gridfs';
import Image from '@/models/Image';
import Note from '@/models/Note';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Triggered by an external cron (e.g., Coolify HTTP cron).
// Requires: Authorization: Bearer <CRON_SECRET>

export async function POST(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET is not set — cleanup endpoint is disabled');
    return new NextResponse('Service unavailable', { status: 503 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token || token !== cronSecret) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  await dbConnect();
  try {
    const bucket = getGridFsBucket();
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Load images and verify reference presence in note content
    const images = await Image.find({ $or: [ { lastSeenAt: { $lt: cutoff } }, { lastSeenAt: null } ] });
    let deletedCount = 0;

    for (const img of images) {
      try {
        const note = await Note.findById(img.note);
        if (!note) {
          try { await bucket.delete(img.gridFsId); } catch {}
          await Image.deleteOne({ _id: img._id });
          deletedCount++;
          continue;
        }

        const content = String(note.content || '');
        const url = `/api/images/${img._id}`;
        const isReferenced = content.includes(url);
        if (!isReferenced) {
          try { await bucket.delete(img.gridFsId); } catch {}
          await Image.deleteOne({ _id: img._id });
          deletedCount++;
        }
      } catch {}
    }

    return NextResponse.json({ deleted: deletedCount });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


