import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req) {
  await dbConnect();
  const user = await verifyToken();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json({ message: 'Invalid password format' }, { status: 400 });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { message: 'New password must be different from your current password' },
        { status: 400 }
      );
    }

    const userDoc = await User.findById(user.userId);
    if (!userDoc) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, userDoc.password);
    if (!isCurrentValid) {
      return NextResponse.json({ message: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    userDoc.password = hashedPassword;
    userDoc.tokenVersion = (userDoc.tokenVersion ?? 0) + 1;
    await userDoc.save();

    // Clear the current session cookie so the user logs in fresh with a new token
    const res = NextResponse.json({ message: 'Password changed successfully. Please log in again.' });
    res.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('Change password error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
