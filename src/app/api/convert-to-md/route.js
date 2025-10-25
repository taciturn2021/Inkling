
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

    const prompt = `Convert the following text into clean GitHub Flavored Markdown (GFM) compatible with remark-gfm and rehype-katex.
Rules:
- If it's already valid Markdown, return it unchanged.
- Output ONLY the Markdown; no explanations or code fences.
- Preserve LaTeX math exactly: inline $...$ and block $$...$$.
- Keep code blocks/inline code. Add language hints to fenced blocks where obvious (e.g., \`\`\`ts).
- Use proper headings (#..######), list syntax, links, images, and tables.
- Avoid raw HTML where a Markdown alternative exists.
- Do not add frontmatter or any metadata.

Text:
${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const markdown = await response.text();

    return NextResponse.json({ markdown });

  } catch (error) {
    console.error('AI conversion error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
