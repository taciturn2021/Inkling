
import Link from 'next/link';
import type { Note } from './NoteList';

export default function NoteCard({ note }: { note: Note }) {
  return (
    <Link
      href={`/notes/${note._id}`}
      prefetch={false}
      className="group block min-h-28 rounded-2xl border border-slate-700/80 bg-slate-800/80 p-4 shadow-lg shadow-slate-950/10 transition duration-200 hover:-translate-y-1 hover:border-white/50 hover:bg-slate-800"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="truncate text-base font-semibold text-slate-100">{note.title || 'Untitled Note'}</h3>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white opacity-70 transition group-hover:opacity-100" />
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
    </Link>
  );
}
