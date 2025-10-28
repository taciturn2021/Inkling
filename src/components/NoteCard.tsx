
import Link from 'next/link';
import type { Note } from './NoteList';

export default function NoteCard({ note }: { note: Note }) {
  return (
    <Link
      href={`/notes/${note._id}`}
      prefetch={false}
      className="block bg-gray-800 p-3 rounded-xl shadow-md hover:shadow-lg hover:translate-y-[-2px] transition-transform"
    >
      <h3 className="font-semibold text-base mb-1 text-white truncate">{note.title || 'Untitled Note'}</h3>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {note.labels.map((label) => (
          <span
            key={label._id}
            style={{ backgroundColor: label.color, color: '#fff' }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
          >
            {label.name}
          </span>
        ))}
      </div>
    </Link>
  );
}
