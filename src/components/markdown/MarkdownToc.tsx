"use client";

import { useCallback, useEffect, useState } from 'react';
import type { MarkdownHeading } from '@/lib/markdown/extractHeadings';
import styles from './MarkdownPreview.module.css';

type MarkdownTocProps = {
  headings: MarkdownHeading[];
};

export default function MarkdownToc({ headings }: MarkdownTocProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const handleNavigate = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
    setOpen(false);
  }, []);

  if (headings.length < 2) return null;

  return (
    <nav className={styles.toc} aria-label="Table of contents">
      <button
        type="button"
        className={styles.tocToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="markdown-toc-list"
      >
        {open ? 'Hide contents' : 'Contents'}
        <span className={styles.tocCount} aria-hidden="true">{headings.length}</span>
      </button>
      {open && (
        <ol id="markdown-toc-list" className={styles.tocList}>
          {headings.map((heading) => (
            <li
              key={`${heading.id}-${heading.depth}`}
              className={styles.tocItem}
              style={{ paddingLeft: `${(heading.depth - 1) * 0.75}rem` }}
            >
              <button
                type="button"
                className={`${styles.tocLink} ${activeId === heading.id ? styles.tocLinkActive : ''}`}
                onClick={() => handleNavigate(heading.id)}
                aria-current={activeId === heading.id ? 'location' : undefined}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
