import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { apiKey } = body || {};

    if (!apiKey || typeof apiKey !== 'string') {
      return new NextResponse('API key is required', { status: 400 });
    }

    // Try to initialize and list models
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try a simple operation to test the key
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
      
      // Make a minimal test request
      const result = await model.generateContent('Hi');
      const response = await result.response;
      await response.text();
      
      return NextResponse.json({ 
        valid: true, 
        message: 'API key is valid!' 
      });
    } catch (apiError) {
      console.error('API key test failed:', apiError);
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

