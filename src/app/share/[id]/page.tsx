import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import type { Metadata } from 'next';
import SharedNoteContent from '@/components/markdown/SharedNoteContent';

type SharedNoteRecord = {
  title?: unknown;
  content?: unknown;
  format?: unknown;
  labels?: { name?: unknown; color?: unknown }[];
};

async function getSharedNote(id: string) {
  await dbConnect();
  const note = await Note.findOne({ _id: id, shared: true }).populate('labels').lean() as SharedNoteRecord | null;
  if (!note) return null;
  return {
    title: typeof note.title === 'string' && note.title ? note.title : 'Untitled Note',
    content: typeof note.content === 'string' ? note.content : '',
    format: note.format === 'md' ? 'md' : 'text',
    labels: (note.labels || []).map((label) => ({
      name: typeof label.name === 'string' ? label.name : '',
      color: typeof label.color === 'string' ? label.color : '#64748b',
    })),
  } as { title: string; content: string; format: 'text' | 'md'; labels: { name: string; color: string }[] };
}

export default async function SharedNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getSharedNote(id);

  if (!note) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-xl font-semibold">This note is not available.</h1>
          <p className="mt-2 text-slate-400">It may have been unshared or deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="container mx-auto px-4 py-3 sm:px-6">
          <h1 className="text-lg font-bold truncate">{note.title}</h1>
        </div>
      </header>

      {note.labels.length > 0 && (
        <div className="container mx-auto px-4 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {note.labels.map((label, i) => (
              <span
                key={i}
                style={{ backgroundColor: label.color, color: '#fff' }}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {note.format === 'md' ? (
        <SharedNoteContent content={note.content} />
      ) : (
        <article className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <pre className="whitespace-pre-wrap text-gray-200 leading-relaxed">{note.content}</pre>
        </article>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    await dbConnect();
    const note = await Note.findOne({ _id: id, shared: true }).select('title').lean() as { title?: unknown } | null;
    const title = typeof note?.title === 'string' && note.title ? note.title : 'Shared Note';
    return {
      title,
      openGraph: { title },
      twitter: { title, card: 'summary' },
    };
  } catch {
    return { title: 'Shared Note' };
  }
}
