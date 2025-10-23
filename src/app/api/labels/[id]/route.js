
import dbConnect from '@/lib/db';
import Label from '@/models/Label';
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  await dbConnect();

  const user = await verifyToken();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { name, color } = await req.json();

    const label = await Label.findOneAndUpdate(
      { _id: params.id, user: user.userId },
      { name, color },
      { new: true, runValidators: true }
    );

    if (!label) {
      return new NextResponse('Label not found', { status: 404 });
    }

    return NextResponse.json(label);
  } catch (error) {
    console.error('Update label error:', error);
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
    const label = await Label.findOneAndDelete({ _id: params.id, user: user.userId });

    if (!label) {
      return new NextResponse('Label not found', { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete label error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
