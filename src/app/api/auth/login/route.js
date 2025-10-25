import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function POST(req) {
  await dbConnect();

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new NextResponse('Username and password are required', { status: 400 });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const res = NextResponse.json({ message: 'Logged in successfully' });
    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return res;

  } catch (error) {
    console.error('Login error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
