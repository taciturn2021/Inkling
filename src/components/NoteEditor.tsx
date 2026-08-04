"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import MarkdownEditor from '@/components/NoteMdEditor';
import { refreshNotesFromServer } from '@/lib/notesStore';

type Label = { _id: string; name: string; color: string };

export default function NoteEditor({ noteId }: { noteId?: string }) {
  const [noteIdState, setNoteIdState] = useState<string | undefined>(noteId);
  const isNew = !noteIdState || noteIdState === 'new';
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [format, setFormat] = useState<'text' | 'md'>('md');
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchNote = async () => {
      if (isNew) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/notes/${noteIdState}`);
        if (res.ok) {
          const noteData = await res.json();
          setTitle(noteData.title || '');
          setContent(noteData.content || '');
          setFormat(noteData.format || 'md');
          setSelectedLabels((noteData.labels || []).map((l: { _id: string }) => l._id));
        } else {
          setError('Failed to fetch note');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
      }
      setLoading(false);
    };

    const fetchLabels = async () => {
      try {
        const res = await fetch('/api/labels');
        if (res.ok) {
          const labelsData = await res.json();
          setLabels(labelsData);
        } else {
          console.error('Failed to fetch labels');
        }
      } catch (err) {
        console.error('An unexpected error occurred while fetching labels.');
      }
    };

    fetchNote();
    fetchLabels();
  }, [noteIdState, isNew]);

  const handleLabelChange = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  const saveNote = async (body: any, methodOverride?: 'POST' | 'PUT') => {
    const method = methodOverride || (isNew ? 'POST' : 'PUT');
    const url = isNew ? '/api/notes' : `/api/notes/${noteIdState}`;
    return fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await saveNote({ title, content, format, labels: selectedLabels });
      if (res.ok) {
        try { 
          await refreshNotesFromServer(); 
          // Mark that notes were just updated so main page knows to refresh
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('notes:justUpdated', Date.now().toString());
          }
        } catch {}
        router.push('/');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to save note');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) return;
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    try {
      setIsDeleting(true);
      setError('');
      const res = await fetch(`/api/notes/${noteIdState}`, { method: 'DELETE' });
      if (res.ok) {
        try {
          await refreshNotesFromServer();
          // Mark that notes were just updated so main page knows to refresh
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('notes:justUpdated', Date.now().toString());
          }
        } catch {}
        router.push('/');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to delete note');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConvertAndSave = async () => {
    setIsConverting(true);
    setError('');
    setProgress(10);
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 3 : p));
    }, 300);

    try {
      const res = await fetch('/api/convert-to-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || 'Failed to convert to Markdown');
        return;
      }

      const data = await res.json();
      setContent(data.markdown);
      setFormat('md');
      setProgress(90);

      const saveRes = await saveNote({ title, content: data.markdown, format: 'md', labels: selectedLabels });
      if (!saveRes.ok) {
        const d = await saveRes.json().catch(() => ({}));
        setError(d.message || 'Failed to save converted note');
        return;
      }

      setProgress(100);
      try { 
        await refreshNotesFromServer(); 
        // Mark that notes were just updated so main page knows to refresh
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('notes:justUpdated', Date.now().toString());
        }
      } catch {}
      router.push('/');
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      if (progressTimer.current) clearInterval(progressTimer.current);
      progressTimer.current = null;
      setIsConverting(false);
      setTimeout(() => setProgress(0), 400);
    }
  };

  const ensureNoteId = useCallback(async (): Promise<string> => {
    if (!isNew && noteIdState) return noteIdState;
    const res = await saveNote({ title, content, format: 'md', labels: selectedLabels }, 'POST');
    if (!res.ok) throw new Error('Failed to create draft');
    const created = await res.json();
    const newId = String(created._id);
    setNoteIdState(newId);
    try { 
      await refreshNotesFromServer(); 
      // Mark that notes were just updated so main page knows to refresh
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('notes:justUpdated', Date.now().toString());
      }
    } catch {}
    // Do not navigate immediately; edits continue seamlessly. User can delete after id appears.
    return newId;
  }, [isNew, noteIdState, title, content, selectedLabels, format]);

  if (loading) return <div className="min-h-dvh bg-slate-900 p-4"><div className="mx-auto h-8 max-w-4xl animate-pulse rounded bg-slate-800" /></div>;

  return (
    <div className="min-h-dvh bg-slate-900 px-4 py-5 text-slate-50 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
      {isConverting && (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-white transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-2xl font-bold tracking-tight">{isNew ? 'New note' : 'Edit note'}</h1>
        </div>
        <div>
          <button
            disabled={isSaving || isConverting || isDeleting}
            onClick={handleSave}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:mr-2"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          {!isNew && (
            <button
              disabled={isSaving || isConverting || isDeleting}
              onClick={handleDelete}
              className="rounded-xl border border-rose-800/70 bg-rose-950/60 px-4 py-2 font-semibold text-rose-200 transition hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mb-4 w-full rounded-2xl border border-slate-700 bg-slate-800 p-3 text-slate-100 placeholder:text-slate-500 focus:border-white"
      />

      <MarkdownEditor
        content={content}
        setContent={setContent}
        noteId={isNew ? undefined : noteIdState}
        ensureNoteId={ensureNoteId}
      />

      {error && <div className="mb-4 rounded-xl border border-rose-800/70 bg-rose-950/40 px-4 py-3 text-sm text-rose-200" role="alert">{error}</div>}

      <div className="mb-5 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>Markdown only. Use the button or paste an image to embed.</span>
        <div className="flex flex-col items-end sm:items-center gap-1">
          <button
            onClick={handleConvertAndSave}
            disabled={isConverting || isSaving}
            className="rounded-xl bg-slate-700 px-3 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConverting ? 'Converting…' : 'Convert & Save' }
          </button>
          <span className="text-xs text-gray-500">Use AI to convert to markdown</span>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 font-bold text-slate-200">Labels</h3>
        <div className="flex flex-wrap">
          {labels.map((label) => (
            <button
              key={label._id}
              onClick={() => handleLabelChange(label._id)}
              style={{ backgroundColor: selectedLabels.includes(label._id) ? label.color : '' }}
              className={`mb-2 mr-2 rounded-full px-3 py-2 text-sm ${selectedLabels.includes(label._id) ? 'text-white' : 'border border-slate-700 bg-slate-800 text-slate-300'}`}
            >
              {label.name}
            </button>
          ))}
        </div>
      </div>

      {/* Removed duplicate bottom Submit button to avoid confusion */}
      </div>
    </div>
  );
}
