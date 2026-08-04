"use client";

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import MermaidDiagram from './MermaidDiagram';
import styles from './MarkdownPreview.module.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);

const LANGUAGE_LABELS: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  sh: 'Shell',
  bash: 'Shell',
  shell: 'Shell',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  xml: 'XML',
  md: 'Markdown',
  markdown: 'Markdown',
};

function languageLabel(lang: string): string {
  return LANGUAGE_LABELS[lang.toLowerCase()] ?? lang.toUpperCase();
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children);
  }
  return '';
}

type CodeBlockProps = {
  className?: string;
  children?: ReactNode;
};

export function CodeBlock({ className, children }: CodeBlockProps) {
  const match = /language-([\w-]+)/.exec(className || '');
  const language = match?.[1]?.toLowerCase() ?? '';
  const source = extractText(children).replace(/\n$/, '');

  if (language === 'mermaid') {
    return <MermaidDiagram source={source} />;
  }

  return <HighlightedCode language={language} source={source} />;
}

function HighlightedCode({ language, source }: { language: string; source: string }) {
  const [copied, setCopied] = useState(false);

  const highlighted = (() => {
    if (!source) return '';
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(source, { language }).value;
      }
      return hljs.highlightAuto(source).value;
    } catch {
      return source
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  })();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [source]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const label = language ? languageLabel(language) : 'Text';

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLanguage}>{label}</span>
        <button type="button" className={styles.copyButton} onClick={handleCopy} aria-live="polite">
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <div className={styles.codeScroll}>
        <pre className={styles.codePre}>
          <code
            className={language ? `hljs language-${language}` : 'hljs'}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
}

export function InlineCode({ className, children, ...rest }: CodeBlockProps & Record<string, unknown>) {
  return (
    <code className={`${styles.inlineCode} ${className || ''}`} {...rest}>
      {children}
    </code>
  );
}
