'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useStartNavigating } from './NavigationProvider';
import type { Note } from './NoteList';

export default function NoteCard({
  note,
  onOpenNote,
}: {
  note: Note;
  onOpenNote?: (id: string) => void;
}) {
  const router = useRouter();
  const startNavigating = useStartNavigating();
  const [isPending, startTransition] = useTransition();
  const accentColor = note.labels[0]?.color || '#f8fafc';

  const openNote = () => {
    if (isPending) return;
    if (onOpenNote) {
      onOpenNote(note._id);
      return;
    }
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
      className={`group relative block w-full overflow-hidden rounded-xl border border-slate-700/70 bg-slate-800/70 text-left transition duration-200 hover:border-slate-500 hover:bg-slate-800 disabled:cursor-wait ${
        isPending ? 'opacity-80' : ''
      }`}
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />

      <div className="px-4 py-3 pl-[1.15rem]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-[15px] font-medium tracking-tight text-slate-100">
            {note.title || 'Untitled Note'}
          </h3>
          {isPending && (
            <span
              className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-500 border-t-white"
              aria-hidden="true"
            />
          )}
        </div>

        {note.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {note.labels.map((label) => (
              <span
                key={label._id}
                style={{ backgroundColor: label.color, color: '#fff' }}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium"
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {isPending && (
          <span className="mt-2 block text-xs font-medium text-slate-300" aria-live="polite">
            Opening…
          </span>
        )}
      </div>
    </button>
  );
}
