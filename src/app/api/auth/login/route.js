import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/clientIp';
import {
  checkLoginAllowed,
  clearLoginAttempts,
  formatLockoutMessage,
  lockoutRetryAfterSeconds,
  recordFailedLogin,
} from '@/lib/loginRateLimit';

export async function POST(req) {
  await dbConnect();

  try {
    const { username, password } = await req.json();
    const ip = getClientIp(req);

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    const lockout = await checkLoginAllowed(ip, username);
    if (lockout.locked) {
      const retryAfter = lockoutRetryAfterSeconds(lockout.remainingMs);
      return NextResponse.json(
        { message: formatLockoutMessage(lockout.remainingMs) },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    const user = await User.findOne({ username });
    if (!user) {
      await recordFailedLogin(ip, username, false);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      await recordFailedLogin(ip, username, true);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    await clearLoginAttempts(ip, username);

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role || 'free',
        tokenVersion: user.tokenVersion ?? 0,
      },
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
