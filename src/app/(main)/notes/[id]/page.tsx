import Link from 'next/link';
import BackButton from '@/components/BackButton';
import NoteViewer from '@/components/NoteViewer';
import ShareToggle from '@/components/ShareToggle';

export default async function NoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
    </div>
  );
}
