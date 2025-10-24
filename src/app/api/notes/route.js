
import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import '@/models/Label';
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await dbConnect();

  const user = await verifyToken();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const labelId = searchParams.get('labelId');

    const filter = { user: user.userId };
    if (labelId) {
      filter.labels = labelId;
    }

    const notes = await Note.find(filter).populate('labels');
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();

  const user = await verifyToken();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { title, content, format, labels } = await req.json();

    const note = await Note.create({
      title,
      content,
      format,
      labels,
      user: user.userId,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
