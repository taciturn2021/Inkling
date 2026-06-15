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

  // Always verify the token's version against the DB. A missing claim is
  // treated as version 0, so legacy tokens are revoked once tokenVersion is
  // bumped (e.g. on password change).
  try {
    await dbConnect();
    const user = await User.findById(decoded.userId).select('tokenVersion').lean();
    if (!user) return null;
    if ((user.tokenVersion ?? 0) !== (decoded.tokenVersion ?? 0)) return null;
  } catch {
    return null;
  }

  return decoded;
}
