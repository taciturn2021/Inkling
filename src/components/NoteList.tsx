
import NoteCard from './NoteCard';

type Label = { _id: string; name: string; color: string };
export type Note = { _id: string; title?: string; content: string; labels: Label[] };

export default function NoteList({ notes }: { notes: Note[] }) {
  return (
    <div className="px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {notes.map((note) => (
        <NoteCard key={note._id} note={note} />
      ))}
    </div>
  );
}
