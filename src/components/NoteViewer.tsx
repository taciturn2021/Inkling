"use client";

import { useEffect, useState } from 'react';
import { getCachedNote, refreshNotesFromServer } from '@/lib/notesStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
// no conditional hooks; keep top-level stable
import { getImageBlob, putImageBlob } from '@/lib/idb';

export default function NoteViewer({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const cached = await getCachedNote(id);
        if (mounted && cached) setNote(cached);
        // Do NOT auto-refresh from server; keep it fully offline-first.
      } catch (e) {
        setError('Failed to load note');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="px-4 py-6 text-gray-400">Loading…</div>;
  if (error) return <div className="px-4 py-6 text-red-500">{error}</div>;
  if (!note)
    return (
      <div className="px-4 py-6 text-gray-400">
        Note not in local cache.
        <div className="mt-3">
          <button
            onClick={async () => {
              try {
                setLoading(true);
                await refreshNotesFromServer();
                const n2 = await getCachedNote(id);
                setNote(n2 || null);
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-lg bg-blue-600 text-white text-sm px-3 py-2 active:scale-[.98]"
          >
            Refresh from server
          </button>
        </div>
      </div>
    );

  // Replace image URLs with blob URLs if available (and warm cache when displayed)
  const processedContent = note ? String(note.content || '') : '';

  const components = {
    img: (props: any) => {
      const { src, alt } = props;
      const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(undefined);
      useEffect(() => {
        let canceled = false;
        (async () => {
          try {
            const match = typeof src === 'string' ? src.match(/\/api\/images\/([a-f\d]{24})/i) : null;
            const id = match && Array.isArray(match) ? match[1] : undefined;
            if (!id) { setResolvedSrc(typeof src === 'string' ? src : undefined); return; }
            const cached = await getImageBlob(id).catch(() => undefined);
            if (cached && !canceled) {
              const url = URL.createObjectURL(cached.blob);
              setResolvedSrc(url);
              return;
            }
            if (typeof src === 'string') {
              // Network fallback, then cache
              const res = await fetch(src, { cache: 'no-store' });
              if (!res.ok) { setResolvedSrc(src); return; }
              const blob = await res.blob();
              try { await putImageBlob(id, blob, blob.type || 'image/*'); } catch {}
              if (!canceled) {
                const url = URL.createObjectURL(blob);
                setResolvedSrc(url);
              }
            }
          } catch { setResolvedSrc(typeof src === 'string' ? src : undefined); }
        })();
        return () => { canceled = true; };
      }, [src]);
      // Avoid initial network request by withholding src until resolved
      return <img src={resolvedSrc || ''} alt={alt} loading="lazy" decoding="async" />;
    },
    table: ({ children }: any) => {
      return (
        <div className="-mx-4 sm:mx-0 overflow-x-auto overscroll-x-contain">
          <table className="w-max min-w-full border-separate" role="table">
            {children}
          </table>
        </div>
      );
    },
    th: ({ children }: any) => (
      <th className="px-3 py-2 text-left whitespace-nowrap align-bottom">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-3 py-2 align-top whitespace-normal break-words">
        {children}
      </td>
    ),
    pre: ({ children }: any) => (
      <div className="-mx-4 sm:mx-0 overflow-x-auto">
        <pre className="min-w-full whitespace-pre">{children}</pre>
      </div>
    ),
  } as any;

  return (
    <article className="container mx-auto px-4 py-5 prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none
      prose-headings:scroll-mt-24 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
      prose-img:rounded-lg prose-pre:bg-gray-900/60 prose-code:bg-gray-800/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
      {note.format === 'md' ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[
            rehypeRaw,
            rehypeSlug,
            rehypeKatex,
            [rehypeAutolinkHeadings, { behavior: 'append', properties: { className: ['ml-1','text-gray-500','no-underline'] } }],
          ]}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      ) : (
        <pre className="whitespace-pre-wrap text-gray-200 leading-relaxed">{note.content}</pre>
      )}
    </article>
  );
}
