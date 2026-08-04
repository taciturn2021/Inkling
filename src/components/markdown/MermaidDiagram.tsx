"use client";

import { useEffect, useRef, useState } from 'react';
import styles from './MarkdownPreview.module.css';

type MermaidDiagramProps = {
  source: string;
};

export default function MermaidDiagram({ source }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const renderedRef = useRef(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let canceled = false;
    const wasRendered = renderedRef.current;
    renderedRef.current = false;
    if (wasRendered) node.replaceChildren();
    setStatus('idle');
    setErrorMessage(null);

    const renderDiagram = () => {
      if (canceled || renderedRef.current) return;

      renderedRef.current = true;
      setStatus('loading');

      void (async () => {
        try {
          const mermaid = (await import('mermaid')).default;
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'strict',
            fontFamily: 'inherit',
          });

          const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
          const { svg } = await mermaid.render(id, source);
          if (canceled) return;
          node.innerHTML = svg;
          setStatus('ready');
        } catch (err) {
          if (canceled) return;
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      })();
    };

    if (!('IntersectionObserver' in window)) {
      renderDiagram();
      return () => {
        canceled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        renderDiagram();
      },
      { rootMargin: '120px' },
    );

    observer.observe(node);
    return () => {
      canceled = true;
      observer.disconnect();
    };
  }, [source]);

  return (
    <figure className={styles.mermaidFigure} aria-label="Mermaid diagram">
      <div
        ref={containerRef}
        className={styles.mermaidContainer}
        role="img"
        aria-busy={status === 'loading'}
        aria-live="polite"
      >
        {status === 'idle' || status === 'loading' ? (
          <p className={styles.mermaidFallback}>Diagram loading…</p>
        ) : null}
        {status === 'error' ? (
          <div className={styles.mermaidError} role="alert">
            <p>Could not render diagram{errorMessage ? `: ${errorMessage}` : '.'}</p>
            <button
              type="button"
              className={styles.mermaidToggle}
              onClick={() => setShowSource((v) => !v)}
              aria-expanded={showSource}
            >
              {showSource ? 'Hide source' : 'Show source'}
            </button>
          </div>
        ) : null}
      </div>
      {(status === 'error' || status === 'ready') && (
        <button
          type="button"
          className={styles.mermaidToggle}
          onClick={() => setShowSource((v) => !v)}
          aria-expanded={showSource}
        >
          {showSource ? 'Hide source' : 'View source'}
        </button>
      )}
      {showSource && (
        <pre className={styles.mermaidSource}>
          <code>{source}</code>
        </pre>
      )}
    </figure>
  );
}
