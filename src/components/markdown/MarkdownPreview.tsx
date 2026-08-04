"use client";

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { remarkPlugins, rehypePlugins } from '@/lib/markdown/markdownPlugins';
import { extractHeadings } from '@/lib/markdown/extractHeadings';
import MarkdownToc from './MarkdownToc';
import { createMarkdownComponents, type MarkdownImageMode } from './markdownComponents';
import styles from './MarkdownPreview.module.css';
import 'highlight.js/styles/github-dark.min.css';

export type MarkdownPreviewProps = {
  content: string;
  className?: string;
  showToc?: boolean;
  imageMode?: MarkdownImageMode;
};

export default function MarkdownPreview({
  content,
  className = '',
  showToc = true,
  imageMode = 'cached',
}: MarkdownPreviewProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const components = useMemo(() => createMarkdownComponents(imageMode), [imageMode]);

  return (
    <article className={`${styles.preview} ${className}`.trim()} data-markdown-preview>
      {showToc && headings.length >= 2 ? <MarkdownToc headings={headings} /> : null}
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
