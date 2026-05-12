import { NextResponse } from 'next/server';
import { generateGroqChatCompletion, groqErrorDetails, isGroqApiError } from '@/lib/groq';

export async function POST(req) {
  try {
    const body = await req.json();
    const { apiKey } = body || {};

    if (!apiKey || typeof apiKey !== 'string') {
      return new NextResponse('API key is required', { status: 400 });
    }

    // Try a simple operation to test the key
    try {
      await generateGroqChatCompletion(apiKey, [
        { role: 'user', content: 'Hi' },
      ], { maxCompletionTokens: 16 });
      
      return NextResponse.json({ 
        valid: true, 
        message: 'API key is valid!' 
      });
    } catch (apiError) {
      console.error('API key test failed:', apiError);
      if (isGroqApiError(apiError)) {
        const { body } = groqErrorDetails(apiError);
        return NextResponse.json({
          valid: false,
          message: body.message,
          error: body.error,
        }, { status: 400 });
      }
      return NextResponse.json({ 
        valid: false, 
        message: 'API key is invalid or has insufficient permissions',
        error: apiError.message || 'Unknown error'
      }, { status: 400 });
    }
  } catch (e) {
    console.error('Test API key error:', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
