
import dbConnect from '@/lib/db';
import Label from '@/models/Label';
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await dbConnect();

  const user = await verifyToken();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const labels = await Label.find({ user: user.userId });
    return NextResponse.json(labels);
  } catch (error) {
    console.error('Get labels error:', error);
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
    const { name, color } = await req.json();

    const label = await Label.create({
      name,
      color,
      user: user.userId,
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    console.error('Create label error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
