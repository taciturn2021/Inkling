import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkPlugins, rehypePlugins } from './markdownPlugins';

export async function renderMarkdownHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypePlugins)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}
