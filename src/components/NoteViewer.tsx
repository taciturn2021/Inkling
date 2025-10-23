"use client";

import { useEffect, useState } from 'react';
import { getCachedNote, refreshNotesFromServer } from '@/lib/notesStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

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

  return (
    <article className="container mx-auto px-4 py-5 prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none
      prose-headings:scroll-mt-24 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
      prose-img:rounded-lg prose-pre:bg-gray-900/60 prose-code:bg-gray-800/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
      {note.format === 'md' ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeRaw,
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: 'append', properties: { className: ['ml-1','text-gray-500','no-underline'] } }],
          ]}
        >
          {note.content}
        </ReactMarkdown>
      ) : (
        <pre className="whitespace-pre-wrap text-gray-200 leading-relaxed">{note.content}</pre>
      )}
    </article>
  );
}
