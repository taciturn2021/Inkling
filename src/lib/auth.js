import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function verifyToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  if (!token) return null;

  let decoded;
  try {
    decoded = jwt.verify(token.value, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  // If the token carries a version, verify it matches the current DB value.
  // Tokens issued before this field existed (tokenVersion undefined) are
  // treated as version 0 and will pass until the user's password is changed.
  if (decoded.tokenVersion !== undefined) {
    try {
      await dbConnect();
      const user = await User.findById(decoded.userId).select('tokenVersion').lean();
      if (!user) return null;
      if ((user.tokenVersion ?? 0) !== decoded.tokenVersion) return null;
    } catch {
      return null;
    }
  }

  return decoded;
}
