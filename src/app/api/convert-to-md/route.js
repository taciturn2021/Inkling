
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new NextResponse('Text is required', { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Convert the following text to Markdown.If its already in markdown format, return the same text. If its written rougly, structure it into headings and stuff , keep the original meaning and structure as much as possible. Text: ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const markdown = await response.text();

    return NextResponse.json({ markdown });

  } catch (error) {
    console.error('AI conversion error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
