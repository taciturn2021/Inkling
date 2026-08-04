import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import type { PluggableList } from 'unified';
import { markdownSanitizeSchema } from './sanitizeSchema';

export const remarkPlugins: PluggableList = [remarkGfm, remarkMath, remarkAlert];

export const rehypePlugins: PluggableList = [
  rehypeSlug,
  rehypeKatex,
  [rehypeAutolinkHeadings, { behavior: 'append', properties: { className: ['heading-anchor'] } }],
  [rehypeSanitize, markdownSanitizeSchema],
];
