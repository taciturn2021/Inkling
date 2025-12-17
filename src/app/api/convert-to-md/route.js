
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new NextResponse('Text is required', { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const markdown = await response.text();

    return NextResponse.json({ markdown });

  } catch (error) {
    console.error('AI conversion error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
