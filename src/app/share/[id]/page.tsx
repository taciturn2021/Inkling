import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

async function getSharedNote(id: string) {
  await dbConnect();
  const note: any = await Note.findOne({ _id: id, shared: true }).populate('labels').lean();
  if (!note) return null;
  return {
    title: note.title || 'Untitled Note',
    content: String(note.content || ''),
    format: (note.format as 'text' | 'md') || 'text',
    labels: (note.labels || []).map((l: any) => ({ name: l.name, color: l.color })),
  } as { title: string; content: string; format: 'text' | 'md'; labels: { name: string; color: string }[] };
}

export default async function SharedNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = await getSharedNote(id);

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-xl font-semibold">This note is not available.</h1>
          <p className="text-gray-400 mt-2">It may have been unshared or deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="container mx-auto px-4 py-3">
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
