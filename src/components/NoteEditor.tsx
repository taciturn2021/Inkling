"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

type Label = { _id: string; name: string; color: string };

export default function NoteEditor({ noteId }: { noteId?: string }) {
  const isNew = !noteId || noteId === 'new';
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [format, setFormat] = useState<'text' | 'md'>('text');
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
        const res = await fetch(`/api/notes/${noteId}`);
        if (res.ok) {
          const noteData = await res.json();
          setTitle(noteData.title || '');
          setContent(noteData.content || '');
          setFormat(noteData.format || 'text');
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
  }, [noteId, isNew]);

  const handleLabelChange = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  const saveNote = async (body: any, methodOverride?: 'POST' | 'PUT') => {
    const method = methodOverride || (isNew ? 'POST' : 'PUT');
    const url = isNew ? '/api/notes' : `/api/notes/${noteId}`;
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
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to delete note');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
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
        setError('Failed to convert to Markdown');
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

  if (loading) return <p className="px-4 py-6">Loading...</p>;
  if (error) return <p className="px-4 py-6 text-red-500">{error}</p>;

  return (
    <div className="container mx-auto p-4">
      {isConverting && (
        <div className="h-1 w-full bg-gray-800 rounded mb-3 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-2xl font-bold">{isNew ? 'New Note' : 'Edit Note'}</h1>
        </div>
        <div>
          <button
            disabled={isSaving || isConverting}
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg mr-2"
          >
            Save
          </button>
          {!isNew && (
            <button
              disabled={isSaving || isConverting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full bg-gray-800 p-2 rounded-lg mb-4"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content"
        className="w-full bg-gray-800 p-2 rounded-lg mb-4 h-64"
      />

      <div className="flex items-center mb-4">
        <span className="mr-2">Format:</span>
        <button
          onClick={() => setFormat('text')}
          className={`px-3 py-1 rounded-full text-sm mr-2 ${format === 'text' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Text
        </button>
        <button
          onClick={() => setFormat('md')}
          className={`px-3 py-1 rounded-full text-sm ${format === 'md' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Markdown
        </button>
      </div>

      <div className="mb-4">
        <h3 className="font-bold mb-2">Labels</h3>
        <div className="flex flex-wrap">
          {labels.map((label) => (
            <button
              key={label._id}
              onClick={() => handleLabelChange(label._id)}
              style={{ backgroundColor: selectedLabels.includes(label._id) ? label.color : '' }}
              className={`px-3 py-1 rounded-full text-sm mr-2 mb-2 ${selectedLabels.includes(label._id) ? 'text-white' : 'text-gray-300'}`}
            >
              {label.name}
            </button>
          ))}
        </div>
      </div>

      {format === 'text' ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || isConverting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            Submit text as-is
          </button>
          <button
            onClick={handleConvertAndSave}
            disabled={isConverting || isSaving}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            {isConverting ? 'Submitting…' : 'Submit and convert to markdown'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          Submit
        </button>
      )}
    </div>
  );
}
