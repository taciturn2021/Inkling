"use client";

import { useCallback, useRef, useState } from 'react';
import MarkdownPreview from '@/components/markdown/MarkdownPreview';
import MarkdownSyntaxGuide from '@/components/markdown/MarkdownSyntaxGuide';

type EditorView = 'edit' | 'preview';

export default function NoteMdEditor({
  content,
  setContent,
  noteId,
  ensureNoteId,
}: {
  content: string;
  setContent: (val: string) => void;
  noteId?: string;
  ensureNoteId?: () => Promise<string>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<EditorView>('edit');

  const insertAtCursor = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent(content + text);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const next = `${before}${text}${after}`;
    setContent(next);
    requestAnimationFrame(() => {
      const pos = start + text.length;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
    });
  }, [content, setContent]);

  const uploadFile = useCallback(async (file: File, alt: string) => {
    if (!file) return;
    let targetNoteId = noteId;
    if (!targetNoteId && ensureNoteId) {
      try { targetNoteId = await ensureNoteId(); } catch { alert('Please save the note first.'); return; }
    }
    if (!targetNoteId) { alert('Please save the note first.'); return; }
    const form = new FormData();
    form.append('file', file);
    form.append('noteId', targetNoteId);
    form.append('alt', alt || file.name || 'Image');
    setUploading(true);
    try {
      const res = await fetch('/api/images/upload', { method: 'POST', body: form, cache: 'no-store' });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      insertAtCursor(`\n\n${data.markdown}\n\n`);
    } catch {
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  }, [noteId, ensureNoteId, insertAtCursor]);

  const onPaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadFile(file, 'Pasted image');
        }
        return;
      }
    }
  }, [uploadFile]);

  return (
    <div className="mb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-slate-300">Markdown editor</div>
          <div className="flex rounded-xl border border-slate-700 bg-slate-800 p-0.5 md:hidden">
            <button
              type="button"
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${view === 'edit' ? 'bg-slate-600 text-white' : 'text-slate-300'}`}
              onClick={() => setView('edit')}
              aria-pressed={view === 'edit'}
            >
              Edit
            </button>
            <button
              type="button"
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${view === 'preview' ? 'bg-slate-600 text-white' : 'text-slate-300'}`}
              onClick={() => setView('preview')}
              aria-pressed={view === 'preview'}
            >
              Preview
            </button>
          </div>
        </div>
        <label className="relative inline-flex items-center gap-2 text-sm">
          <span className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200">{uploading ? 'Uploading…' : 'Upload image'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await uploadFile(f, f.name || 'Image');
              e.currentTarget.value = '';
            }}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={uploading}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:h-[calc(100dvh-18rem)] md:min-h-[32rem] md:max-h-[52rem] md:grid-cols-2">
        <section className={`min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 ${view === 'preview' ? 'hidden md:flex' : 'flex'} flex-col`}>
            <div className="shrink-0 border-b border-slate-700 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">Source</div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={onPaste}
              placeholder="Write Markdown here… Paste or upload images to embed"
              className="min-h-72 w-full resize-y overflow-x-auto bg-slate-800 p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-inset focus:ring-white md:min-h-0 md:flex-1 md:resize-none"
              aria-label="Markdown source"
            />
        </section>

        <section className={`min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/40 ${view === 'edit' ? 'hidden md:flex' : 'flex'} flex-col`}>
          <div className="shrink-0 border-b border-slate-700 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">Preview</div>
          <div className="min-h-72 overflow-y-auto p-4 md:min-h-0 md:flex-1">
            <MarkdownPreview content={content} imageMode={noteId ? 'cached' : 'remote'} showToc={false} />
          </div>
        </section>
      </div>

      <div className="mt-3">
        <MarkdownSyntaxGuide />
      </div>
    </div>
  );
}
