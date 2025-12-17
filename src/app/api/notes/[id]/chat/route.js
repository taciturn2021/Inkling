import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { NextResponse } from 'next/server';
import Note from '@/models/Note';
import ChatMessage from '@/models/ChatMessage';
import User from '@/models/User';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { decrypt } from '@/lib/encryption';

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

  try {
    const { id } = await params;
    const body = await req.json();
    const { content } = body || {};
    if (!content || typeof content !== 'string') return new NextResponse('Content required', { status: 400 });

    const note = await Note.findOne({ _id: id, user: user.userId }).lean();
    if (!note) return new NextResponse('Not found', { status: 404 });

    // Save user message
    const savedUserMsg = await ChatMessage.create({ user: user.userId, note: id, role: 'user', content });

    // Get user's API key
    const userDoc = await User.findById(user.userId).select('geminiApiKey').lean();
    if (!userDoc || !userDoc.geminiApiKey) {
      // Create a helpful assistant message
      const assistantMsg = await ChatMessage.create({ 
        user: user.userId, 
        note: id, 
        role: 'assistant', 
        content: '⚠️ **API Key Not Configured**\n\nTo use the AI chat feature, you need to configure your Gemini API key.\n\n**Steps:**\n1. Click the settings button (⚙️) in the header\n2. Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)\n3. Paste it in the settings and click Save\n4. Test your key to make sure it works\n\nOnce configured, you\'ll be able to chat with AI about your notes!' 
      });
      return NextResponse.json([savedUserMsg, assistantMsg]);
    }

    // Build context from note content + recent history
    const history = await ChatMessage.find({ user: user.userId, note: id }).sort({ createdAt: 1 }).lean();
    const systemPrompt = `You are a helpful assistant answering questions about the user's note. Answer concisely.
You can and should use Markdown in your responses (headings, lists, tables, code blocks, links).
Prefer short sections and bullet points. Use math (LaTeX) when applicable.
Note title: ${note.title || ''}
Note content (Markdown or text):\n${note.content || ''}`;

    // Decrypt and use user's API key
    const decryptedApiKey = decrypt(userDoc.geminiApiKey);
    const genAI = new GoogleGenerativeAI(decryptedApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
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


