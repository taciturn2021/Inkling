import GithubSlugger from 'github-slugger';

export const HEADING_ID_PREFIX = 'user-content-';

export type MarkdownHeading = {
  depth: number;
  text: string;
  id: string;
};

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function extractHeadings(markdown: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const slugger = new GithubSlugger();
  const lines = markdown.split('\n');

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!match) continue;

    const depth = match[1].length;
    const text = stripInlineMarkdown(match[2]);
    if (!text) continue;

    headings.push({ depth, text, id: `${HEADING_ID_PREFIX}${slugger.slug(text)}` });
  }

  return headings;
}
