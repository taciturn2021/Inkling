import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import Note from '@/models/Note';
import ChatMessage from '@/models/ChatMessage';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET(req, { params }) {
  await dbConnect();
  const user = await verifyToken();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { id } = await params;
    const note = await Note.findOne({ _id: id, user: user.userId }).lean();
    if (!note) return new NextResponse('Not found', { status: 404 });

    const messages = await ChatMessage.find({ user: user.userId, note: id }).sort({ createdAt: 1 }).lean();
    return NextResponse.json(messages);
  } catch (e) {
    console.error('Chat GET error:', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const user = await verifyToken();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { id } = await params;
    const note = await Note.findOne({ _id: id, user: user.userId }).lean();
    if (!note) return new NextResponse('Not found', { status: 404 });

    await ChatMessage.deleteMany({ user: user.userId, note: id });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error('Chat DELETE error:', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req, { params }) {
  await dbConnect();
  const user = await verifyToken();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  if (user.role !== 'premium') return new NextResponse('Forbidden', { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { content } = body || {};
    if (!content || typeof content !== 'string') return new NextResponse('Content required', { status: 400 });

    const note = await Note.findOne({ _id: id, user: user.userId }).lean();
    if (!note) return new NextResponse('Not found', { status: 404 });

    // Save user message
    const savedUserMsg = await ChatMessage.create({ user: user.userId, note: id, role: 'user', content });

    // Build context from note content + recent history
    const history = await ChatMessage.find({ user: user.userId, note: id }).sort({ createdAt: 1 }).lean();
    const systemPrompt = `You are a helpful assistant answering questions about the user's note. Answer concisely.
You can and should use Markdown in your responses (headings, lists, tables, code blocks, links).
Prefer short sections and bullet points. Use math (LaTeX) when applicable.
Note title: ${note.title || ''}
Note content (Markdown or text):\n${note.content || ''}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const parts = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    ];

    const result = await model.generateContent({ contents: parts });
    const response = await result.response;
    const answer = await response.text();

    const savedAssistant = await ChatMessage.create({ user: user.userId, note: id, role: 'assistant', content: answer });

    return NextResponse.json([savedUserMsg, savedAssistant]);
  } catch (e) {
    console.error('Chat POST error:', e);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


