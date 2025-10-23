
import dbConnect from '@/lib/db';
import Note from '@/models/Note';
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
    const { title, content, format, labels } = await req.json();

    const note = await Note.findOneAndUpdate(
      { _id: resolvedParams.id, user: user.userId },
      { title, content, format, labels },
      { new: true, runValidators: true }
    );

    if (!note) {
      return new NextResponse('Note not found', { status: 404 });
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

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete note error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
