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
import { useOnlineStatus } from '@/lib/useOnlineStatus';

function CachedImage({ src, alt }: { src?: string; alt?: string }) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>();

  useEffect(() => {
    let canceled = false;
    let objectUrl: string | undefined;

    const resolve = async () => {
      if (!src) {
        setResolvedSrc(undefined);
        return;
      }
      const match = src.match(/\/api\/images\/([a-f\d]{24})/i);
      const id = match?.[1];
      if (!id) {
        setResolvedSrc(src);
        return;
      }

      try {
        const cached = await getImageBlob(id);
        if (cached) {
          objectUrl = URL.createObjectURL(cached.blob);
          if (canceled) URL.revokeObjectURL(objectUrl);
          else setResolvedSrc(objectUrl);
          return;
        }

        const res = await fetch(src, { cache: 'no-store' });
        if (!res.ok) throw new Error('Image unavailable');
        const blob = await res.blob();
        await putImageBlob(id, blob, blob.type || 'image/*');
        objectUrl = URL.createObjectURL(blob);
        if (canceled) URL.revokeObjectURL(objectUrl);
        else setResolvedSrc(objectUrl);
      } catch {
        if (!canceled) setResolvedSrc(undefined);
      }
    };

    void resolve();
    return () => {
      canceled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return <img src={resolvedSrc} alt={alt || ''} loading="lazy" decoding="async" />;
}

export default function NoteViewer({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<any>(null);
  const online = useOnlineStatus();

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

  if (loading) return <div className="px-4 py-8 sm:px-6"><div className="h-5 w-1/3 animate-pulse rounded bg-slate-800" /><div className="mt-4 h-40 animate-pulse rounded-2xl bg-slate-800/70" /></div>;
  if (error) return <div className="animate-fade-in px-4 py-8 text-rose-300 sm:px-6" role="alert">{error}</div>;
  if (!note)
    return (
      <div className="animate-fade-in-up px-4 py-6 text-slate-400">
        Note not in local cache.
        {online && <div className="mt-3">
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
            className="rounded-xl bg-white px-3 py-2 text-sm text-slate-950 active:scale-[.98]"
          >
            Refresh from server
          </button>
        </div>}
      </div>
    );

  // Replace image URLs with blob URLs if available (and warm cache when displayed)
  const processedContent = note ? String(note.content || '') : '';

  const components = {
    img: ({ src, alt }: any) => <CachedImage src={typeof src === 'string' ? src : undefined} alt={alt} />,
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
      <td className="px-3 py-2 align-top">
        <div className="max-w-[80vw] sm:max-w-none break-words whitespace-normal">{children}</div>
      </td>
    ),
    pre: ({ children }: any) => (
      <div className="-mx-4 sm:mx-0 overflow-x-auto">
        <pre className="min-w-full whitespace-pre">{children}</pre>
      </div>
    ),
  } as any;

  return (
    <article className="note-content animate-fade-in-up px-4 py-6 prose prose-invert prose-sm max-w-none sm:px-6 sm:py-8 sm:prose-base lg:prose-lg
      prose-headings:scroll-mt-24 prose-headings:text-slate-100 prose-a:text-white prose-a:no-underline hover:prose-a:underline
      prose-img:rounded-2xl prose-pre:bg-slate-950/70 prose-code:bg-slate-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
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
