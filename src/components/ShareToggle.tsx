"use client";

import { useEffect, useState } from 'react';
import { getCachedNote, refreshNotesFromServer } from '@/lib/notesStore';

export default function ShareToggle({ id }: { id: string }) {
  const [shared, setShared] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const n = await getCachedNote(id);
      if (mounted) setShared(!!n?.shared);
    })();
    return () => { mounted = false; };
  }, [id]);

  const toggleShare = async () => {
    if (shared === null) return;
    try {
      setBusy(true);
      setError('');
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared: !shared }),
      });
      if (!res.ok) throw new Error('Failed to update share state');
      await refreshNotesFromServer();
      setShared((s) => !s);
    } catch {
      setError('Could not update sharing right now.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleShare}
        disabled={busy || shared === null}
        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 active:scale-[.98] disabled:opacity-60"
      >
        {busy ? 'Working…' : shared ? 'Unshare' : 'Share'}
      </button>
      {shared && (
        <button
          onClick={copyLink}
          className="rounded-xl bg-white px-3 py-2 text-sm text-slate-950 active:scale-[.98]"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      )}
      {error && <span className="max-w-32 text-xs text-rose-300" role="alert">{error}</span>}
    </div>
  );
}
