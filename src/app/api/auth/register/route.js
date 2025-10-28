import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const allowed = process.env.ALLOW_REGISTRATION === 'true';
  return NextResponse.json({ allowed });
}

export async function POST(req) {
  await dbConnect();

  try {
    if (process.env.ALLOW_REGISTRATION !== 'true') {
      return new NextResponse('Registration is disabled', { status: 403 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return new NextResponse('Username and password are required', { status: 400 });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return new NextResponse('User already exists', { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ 
      username, 
      password: hashedPassword 
    });

    return NextResponse.json({ 
      message: 'User created successfully', 
      userId: user._id 
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
