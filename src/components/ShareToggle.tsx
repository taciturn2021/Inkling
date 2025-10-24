"use client";

import { useEffect, useState } from 'react';
import { getCachedNote, refreshNotesFromServer } from '@/lib/notesStore';

export default function ShareToggle({ id }: { id: string }) {
  const [shared, setShared] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared: !shared }),
      });
      if (!res.ok) throw new Error('Failed to update share state');
      await refreshNotesFromServer();
      setShared((s) => !s);
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
        className="rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm px-3 py-2 active:scale-[.98] disabled:opacity-60"
      >
        {busy ? 'Working…' : shared ? 'Unshare' : 'Share'}
      </button>
      {shared && (
        <button
          onClick={copyLink}
          className="rounded-lg bg-blue-600 text-white text-sm px-3 py-2 active:scale-[.98]"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      )}
    </div>
  );
}
