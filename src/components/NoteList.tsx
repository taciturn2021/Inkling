
import NoteCard from './NoteCard';

type Label = { _id: string; name: string; color: string };
export type Note = { _id: string; title?: string; content: string; labels: Label[] };

export default function NoteList({ notes }: { notes: Note[] }) {
  return (
    <div className="stagger-fade grid grid-cols-1 gap-4 px-4 pb-24 pt-4 sm:grid-cols-2 sm:gap-6 sm:pt-5 lg:grid-cols-3">
      {notes.map((note) => (
        <NoteCard key={note._id} note={note} />
      ))}
    </div>
  );
}
