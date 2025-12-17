import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import User from '@/models/User';
import { encrypt } from '@/lib/encryption';

export async function GET(req) {
  await dbConnect();
  const user = await verifyToken();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const userDoc = await User.findById(user.userId).select('geminiApiKey').lean();
    if (!userDoc) return new NextResponse('Not found', { status: 404 });

    // Return only whether key exists (for security)
    // Note: We don't show masked version since the key is encrypted
    return NextResponse.json({ 
      hasKey: !!userDoc.geminiApiKey,
      maskedKey: userDoc.geminiApiKey ? 'API Key configured' : null
    });
  } catch (e) {
    console.error('Get API key error:', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const user = await verifyToken();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const body = await req.json();
    const { apiKey } = body || {};
    
    if (typeof apiKey !== 'string') {
      return new NextResponse('Invalid API key', { status: 400 });
    }

    // Encrypt the API key before storing
    const encryptedKey = encrypt(apiKey.trim());
    await User.findByIdAndUpdate(user.userId, { geminiApiKey: encryptedKey });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Save API key error:', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

