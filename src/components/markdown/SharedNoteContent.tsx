"use client";

import MarkdownPreview from '@/components/markdown/MarkdownPreview';

export default function SharedNoteContent({ content }: { content: string }) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <MarkdownPreview content={content} imageMode="remote" showToc />
    </div>
  );
}
