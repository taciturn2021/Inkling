import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { generateGroqChatCompletion } from '@/lib/groq';

export async function POST(req) {
  await dbConnect();
  const user = await verifyToken();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { text } = await req.json();

    if (!text) {
      return new NextResponse('Text is required', { status: 400 });
    }

    // Get user's API key
    const userDoc = await User.findById(user.userId).select('groqApiKey').lean();
    if (!userDoc || !userDoc.groqApiKey) {
      return NextResponse.json({ 
        error: 'API Key Not Configured',
        message: 'Please configure your Groq API key in settings (⚙️ icon in header) to use AI features.' 
      }, { status: 400 });
    }

    // Decrypt and use user's API key
    const decryptedApiKey = decrypt(userDoc.groqApiKey);

    const prompt = `Convert the following text into clean GitHub Flavored Markdown (GFM) for a renderer that uses remark-gfm and rehype-katex (KaTeX).
Rules:
- Output ONLY the Markdown; no explanations or extra code fences.
- Normalize LaTeX math delimiters to what the renderer expects:
  - Convert \( ... \) to $...$ (inline math).
  - Convert \[ ... \] to $$
...
$$ (block math) and ensure a blank line before and after the block.
  - If math already uses $...$ or $$...$$, keep it unchanged.
  - Do not escape backslashes inside math; keep commands like \frac, \left, \right.
- Keep code blocks and inline code. Add language hints to fenced blocks where obvious (e.g., \`\`\`ts).
- Use proper headings (#..######), list syntax, links, images, and tables.
- Avoid raw HTML where a Markdown alternative exists.
- Do not add frontmatter or any metadata.

Text:
${text}`;

    const markdown = await generateGroqChatCompletion(decryptedApiKey, [
      { role: 'user', content: prompt },
    ], { temperature: 0.1 });

    return NextResponse.json({ markdown });

  } catch (error) {
    console.error('AI conversion error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
