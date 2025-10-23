import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import { verifyToken } from '@/lib/auth';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

type Label = { _id: string; name: string; color: string };

async function getNote(id: string) {
  await dbConnect();
  const user = await verifyToken();
  if (!user) return null;
  const noteDoc: any = await Note.findOne({ _id: id, user: user.userId }).populate('labels').lean();
  if (!noteDoc) return null;
  return {
    _id: noteDoc._id.toString(),
    title: noteDoc.title || 'Untitled Note',
    content: noteDoc.content as string,
    format: (noteDoc.format as 'text' | 'md') || 'text',
    labels: (noteDoc.labels || []).map((l: any) => ({ _id: l._id.toString(), name: l.name, color: l.color })),
  } as { _id: string; title: string; content: string; format: 'text' | 'md'; labels: Label[] };
}

export default async function NoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getNote(id);

  if (!note) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <BackButton />
          <h1 className="text-xl font-semibold">Note not found</h1>
        </div>
        <p className="text-gray-400">The note may have been deleted or you may not have access.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackButton />
            <h1 className="text-lg font-bold truncate max-w-[65vw] sm:max-w-none">{note.title}</h1>
          </div>
          <Link
            href={`/notes/${note._id}/edit`}
            className="rounded-lg bg-blue-600 text-white text-sm px-3 py-2 active:scale-[.98]"
          >
            Edit
          </Link>
        </div>
      </div>

      {note.labels.length > 0 && (
        <div className="container mx-auto px-4 pt-3">
          <div className="flex flex-wrap gap-1.5">
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
        </div>
      )}

      <article className="container mx-auto px-4 py-5 prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none
        prose-headings:scroll-mt-24 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-lg prose-pre:bg-gray-900/60 prose-code:bg-gray-800/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
        {note.format === 'md' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeRaw,
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: 'append', properties: { className: ['ml-1','text-gray-500','no-underline'] } }],
            ]}
          >
            {note.content}
          </ReactMarkdown>
        ) : (
          <pre className="whitespace-pre-wrap text-gray-200 leading-relaxed">{note.content}</pre>
        )}
      </article>
    </div>
  );
}
