"use client";

import { useEffect, useState } from 'react';
import { getCachedNote, refreshNotesFromServer } from '@/lib/notesStore';
import MarkdownPreview from '@/components/markdown/MarkdownPreview';
import type { CachedNote } from '@/lib/idb';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

export default function NoteViewer({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<CachedNote | null>(null);
  const online = useOnlineStatus();

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const cached = await getCachedNote(id);
        if (mounted && cached) setNote(cached);
      } catch {
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

  const processedContent = note ? String(note.content || '') : '';

  return (
    <div className="animate-fade-in-up px-4 py-6 sm:px-6 sm:py-8">
      {note.format === 'md' ? (
        <MarkdownPreview content={processedContent} imageMode="cached" showToc />
      ) : (
        <pre className="whitespace-pre-wrap text-gray-200 leading-relaxed">{note.content}</pre>
      )}
    </div>
  );
}
