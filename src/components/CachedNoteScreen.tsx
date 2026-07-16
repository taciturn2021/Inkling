'use client';

import Link from 'next/link';
import NoteViewer from '@/components/NoteViewer';
import ShareToggle from '@/components/ShareToggle';
import ChatBot from '@/components/ChatBot';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

export default function CachedNoteScreen({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const online = useOnlineStatus();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-gray-300 hover:text-white"
            aria-label="Back to notes"
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only sm:not-sr-only">Back</span>
          </button>
          <h1 className="max-w-[65vw] truncate text-lg font-bold sm:max-w-none">Note</h1>
          <div className="ml-auto flex items-center gap-2">
            {online ? (
              <>
                <Link
                  href={`/notes/${id}/edit`}
                  prefetch={false}
                  className="rounded-xl bg-white px-3 py-2 text-sm text-slate-950 active:scale-[.98]"
                >
                  Edit
                </Link>
                <ShareToggle id={id} />
              </>
            ) : (
              <span className="rounded-full border border-amber-800/70 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-200">
                Offline · read only
              </span>
            )}
          </div>
        </div>
      </div>
      <NoteViewer id={id} />
      {online && <ChatBot noteId={id} enabled />}
    </div>
  );
}
