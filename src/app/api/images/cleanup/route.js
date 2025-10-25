import dbConnect from '@/lib/db';
import { getGridFsBucket } from '@/lib/gridfs';
import Image from '@/models/Image';
import Note from '@/models/Note';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// This route can be triggered by an external cron (e.g., Coolify HTTP cron)
// It deletes images that are not referenced by their note content and older than 2 hours since last seen

export async function POST() {
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


