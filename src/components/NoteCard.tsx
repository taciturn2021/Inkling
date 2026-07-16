'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useStartNavigating } from './NavigationProvider';
import type { Note } from './NoteList';

export default function NoteCard({ note }: { note: Note }) {
  const router = useRouter();
  const startNavigating = useStartNavigating();
  const [isPending, startTransition] = useTransition();

  const openNote = () => {
    if (isPending) return;
    startNavigating();
    startTransition(() => {
      router.push(`/notes/${note._id}`);
    });
  };

  return (
    <button
      type="button"
      onClick={openNote}
      disabled={isPending}
      aria-busy={isPending}
      className={`group relative block w-full min-h-28 rounded-2xl border border-slate-700/80 bg-slate-800/80 p-4 text-left shadow-lg shadow-slate-950/10 transition duration-200 hover:-translate-y-1 hover:border-white/50 hover:bg-slate-800 disabled:cursor-wait ${
        isPending ? 'scale-[0.99] border-white/60 opacity-80' : ''
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="truncate text-base font-semibold text-slate-100">{note.title || 'Untitled Note'}</h3>
        {isPending ? (
          <span
            className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-500 border-t-white"
            aria-hidden="true"
          />
        ) : (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white opacity-70 transition group-hover:opacity-100" />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {note.labels.map((label) => (
          <span
            key={label._id}
            style={{ backgroundColor: label.color, color: '#fff' }}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
          >
            {label.name}
          </span>
        ))}
      </div>
      {isPending && (
        <span className="mt-3 block text-xs font-medium text-slate-300" aria-live="polite">
          Opening…
        </span>
      )}
    </button>
  );
}
