
'use client';

import { useState, useEffect } from 'react';

type Label = { _id: string; name: string; color: string };
type Props = {
  isOpen: boolean;
  onClose: () => void;
  onLabelsUpdate: () => void;
};

export default function LabelManager({ isOpen, onClose, onLabelsUpdate }: Props) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [newLabelName, setNewLabelName] = useState<string>('');
  const [newLabelColor, setNewLabelColor] = useState<string>('#ffffff');
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchLabels();
    }
  }, [isOpen]);

  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/labels', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLabels(data);
    } catch {
      setError('Could not load labels.');
    }
  };

  const handleCreate = async () => {
    if (!newLabelName.trim() || busy) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLabelName, color: newLabelColor }),
    });
    if (res.ok) {
      fetchLabels();
      onLabelsUpdate();
      setNewLabelName('');
      setNewLabelColor('#ffffff');
    } else {
      setError('Could not create label.');
    }
    setBusy(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editingLabel) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/labels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingLabel.name, color: editingLabel.color }),
    });
    if (res.ok) {
      fetchLabels();
      onLabelsUpdate();
      setEditingLabel(null);
    } else {
      setError('Could not update label.');
    }
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this label? Notes will keep their content.')) return;
    setBusy(true);
    setError('');
    const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchLabels();
      onLabelsUpdate();
    } else {
      setError('Could not delete label.');
    }
    setBusy(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 bg-black/60 flex">
      <div className="h-full w-full overflow-y-auto bg-slate-900 p-4 md:m-auto md:h-auto md:max-w-md md:rounded-2xl md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Organize</p>
            <h2 className="text-xl font-bold">Manage labels</h2>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close labels">✕</button>
        </div>
        {error && <div className="mb-4 rounded-xl border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">{error}</div>}
        
        <div className="mb-4">
          <h3 className="font-bold mb-2">Create New Label</h3>
          <div className="flex items-center">
            <input 
              type="text" 
              value={newLabelName} 
              onChange={(e) => setNewLabelName(e.target.value)} 
              placeholder="Label Name" 
              className="grow rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-100"
            />
            <input 
              type="color" 
              value={newLabelColor} 
              onChange={(e) => setNewLabelColor(e.target.value)} 
              className="rounded-xl border border-slate-700 bg-slate-800 p-1"
            />
            <button onClick={handleCreate} disabled={busy || !newLabelName.trim()} className="ml-2 rounded-xl bg-white p-2 text-slate-950 active:scale-[.98] disabled:opacity-50">{busy ? '…' : 'Create'}</button>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2">Existing Labels</h3>
          {labels.map(label => (
            <div key={label._id} className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800 p-2">
              {editingLabel?._id === label._id ? (
                <>
                  <input 
                    type="text" 
                    value={editingLabel.name} 
                    onChange={(e) => setEditingLabel({...editingLabel, name: e.target.value})} 
                    className="mr-2 grow rounded-lg border border-slate-600 bg-slate-700 p-1"
                  />
                  <input 
                    type="color" 
                    value={editingLabel.color} 
                    onChange={(e) => setEditingLabel({...editingLabel, color: e.target.value})} 
                    className="rounded-lg border border-slate-600 bg-slate-700 p-1"
                  />
                  <button onClick={() => handleUpdate(label._id)} disabled={busy} className="ml-2 rounded-lg bg-white p-1 text-slate-950 active:scale-[.98] disabled:opacity-50">Save</button>
                  <button onClick={() => setEditingLabel(null)} className="ml-2 rounded-lg bg-slate-600 p-1 text-white active:scale-[.98]">Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ color: label.color }}>{label.name}</span>
                  <div>
                    <button onClick={() => setEditingLabel(label)} className="bg-yellow-600 text-white p-1 rounded-lg mr-2 active:scale-[.98]">Edit</button>
                    <button onClick={() => handleDelete(label._id)} disabled={busy} className="rounded-lg border border-rose-800/70 bg-rose-950/60 p-1 text-rose-200 active:scale-[.98] disabled:opacity-50">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-slate-800 p-2 text-white ring-1 ring-slate-700 active:scale-[.98]">Close</button>
      </div>
    </div>
  );
}
