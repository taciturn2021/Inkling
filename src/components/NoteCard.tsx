
import Link from 'next/link';
import type { Note } from './NoteList';

export default function NoteCard({ note }: { note: Note }) {
  return (
    <Link
      href={`/notes/${note._id}`}
      className="block bg-gray-800 p-4 rounded-xl shadow-md hover:shadow-lg hover:translate-y-[-2px] transition-transform"
    >
      <h3 className="font-semibold text-base mb-2 text-white">{note.title || 'Untitled Note'}</h3>
      <p className="text-gray-400 mb-3 text-sm">{note.content.substring(0, 120)}...</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
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
