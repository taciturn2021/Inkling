"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

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

  const insertAtCursor = (text: string) => {
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
  };

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
    } catch (e) {
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  }, [noteId, content]);

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
  }, [uploading, uploadFile]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-gray-400">Markdown editor</div>
        <label className="relative inline-flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded bg-gray-700">{uploading ? 'Uploading…' : 'Upload image'}</span>
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

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={onPaste}
        placeholder="Write Markdown here… Paste or upload images to embed"
        className="w-full bg-gray-800 p-2 rounded-lg mb-2 h-64"
      />
    </div>
  );
}


