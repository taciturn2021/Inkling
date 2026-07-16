import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  const session = await verifyToken();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: String(session.userId),
      username: String(session.username),
    },
  });
}
