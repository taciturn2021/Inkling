import Link from 'next/link';
import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';
import NoteViewer from '@/components/NoteViewer';
import ShareToggle from '@/components/ShareToggle';
import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import { verifyToken } from '@/lib/auth';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    await dbConnect();
    const note: any = await Note.findById(id).select('title').lean();
    const title = note?.title ? String(note.title) : 'Note';
    return {
      title,
      openGraph: { title },
      twitter: { title, card: 'summary' },
    };
  } catch {
    return { title: 'Note' };
  }
}

export default async function NoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="animate-fade-in min-h-screen bg-slate-900 text-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 flex-shrink-0">
            <BackButton />
            <h1 className="text-lg font-bold truncate max-w-[65vw] sm:max-w-none">Note</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/notes/${id}/edit`}
              prefetch={false}
              className="rounded-xl bg-white px-3 py-2 text-sm text-slate-950 active:scale-[.98]"
            >
              Edit
            </Link>
            <ShareToggle id={id} />
          </div>
        </div>
      </div>

      <NoteViewer id={id} />
      {await (async () => {
        const ChatBotComp = (await import('@/components/ChatBot')).default;
        return <ChatBotComp noteId={id} enabled={true} />;
      })()}
    </div>
  );
}
