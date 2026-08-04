import { describe, expect, it } from 'vitest';
import { extractHeadings } from './extractHeadings';
import { renderMarkdownHtml } from './renderMarkdownHtml';

describe('extractHeadings', () => {
  it('extracts nested headings with stable ids', () => {
    const markdown = `# Intro\n\n## Details\n\n### Sub section\n`;
    expect(extractHeadings(markdown)).toEqual([
      { depth: 1, text: 'Intro', id: 'user-content-intro' },
      { depth: 2, text: 'Details', id: 'user-content-details' },
      { depth: 3, text: 'Sub section', id: 'user-content-sub-section' },
    ]);
  });

  it('deduplicates slug collisions', () => {
    const markdown = `## Section\n\n## Section\n`;
    expect(extractHeadings(markdown).map((h) => h.id)).toEqual(['user-content-section', 'user-content-section-1']);
  });
});

describe('renderMarkdownHtml', () => {
  it('uses the same safe prefix for rendered heading ids', async () => {
    const html = await renderMarkdownHtml('## A section');
    expect(html).toContain('id="user-content-a-section"');
  });

  it('does not render raw HTML tags from source', async () => {
    const html = await renderMarkdownHtml('# Safe\n\n<script>alert(1)</script>\n\n<img onerror="alert(1)" src=x>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).toContain('Safe');
  });

  it('renders GitHub alert blockquotes', async () => {
    const html = await renderMarkdownHtml('> [!NOTE]\n> Remember this.');
    expect(html).toContain('markdown-alert');
    expect(html).toContain('Remember this');
  });

  it('renders GFM tables', async () => {
    const html = await renderMarkdownHtml('| A | B |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<table');
    expect(html).toContain('1');
  });

  it('renders math markup via KaTeX', async () => {
    const html = await renderMarkdownHtml('Inline $x^2$ math.');
    expect(html).toContain('katex');
    expect(html).toContain('x');
  });
});
