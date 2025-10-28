import Link from 'next/link';
import type { Metadata } from 'next';
import BackButton from '@/components/BackButton';
import NoteViewer from '@/components/NoteViewer';
import ShareToggle from '@/components/ShareToggle';
import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

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
  let isPremium = false;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && typeof decoded === 'object' && 'role' in decoded) {
        isPremium = (decoded as any).role === 'premium';
      }
    }
  } catch {}
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-lg font-bold truncate max-w-[65vw] sm:max-w-none">Note</h1>
          </div>
          <Link
            href={`/notes/${id}/edit`}
            prefetch={false}
            className="rounded-lg bg-blue-600 text-white text-sm px-3 py-2 active:scale-[.98]"
          >
            Edit
          </Link>
          <ShareToggle id={id} />
        </div>
      </div>

      <NoteViewer id={id} />
      {isPremium ? (
        // @ts-expect-error Async server-side dynamic import
        await (async () => {
          const ChatBot = (await import('@/components/ChatBot')).default;
          return <ChatBot noteId={id} enabled={true} />;
        })()
      ) : null}
    </div>
  );
}
