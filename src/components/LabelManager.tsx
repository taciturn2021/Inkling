
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

  useEffect(() => {
    if (isOpen) {
      fetchLabels();
    }
  }, [isOpen]);

  const fetchLabels = async () => {
    const res = await fetch('/api/labels', { cache: 'no-store' });
    const data = await res.json();
    setLabels(data);
  };

  const handleCreate = async () => {
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
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingLabel) return;
    const res = await fetch(`/api/labels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingLabel.name, color: editingLabel.color }),
    });
    if (res.ok) {
      fetchLabels();
      onLabelsUpdate();
      setEditingLabel(null);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchLabels();
      onLabelsUpdate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 bg-black/60 flex">
      <div className="bg-gray-900 w-full h-full md:h-auto md:max-w-md md:rounded-2xl md:m-auto p-4 md:p-6 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Manage Labels</h2>
        
        <div className="mb-4">
          <h3 className="font-bold mb-2">Create New Label</h3>
          <div className="flex items-center">
            <input 
              type="text" 
              value={newLabelName} 
              onChange={(e) => setNewLabelName(e.target.value)} 
              placeholder="Label Name" 
              className="bg-gray-800 p-2 rounded-lg mr-2 grow border border-gray-700"
            />
            <input 
              type="color" 
              value={newLabelColor} 
              onChange={(e) => setNewLabelColor(e.target.value)} 
              className="bg-gray-800 p-1 rounded-lg border border-gray-700"
            />
            <button onClick={handleCreate} className="bg-blue-600 text-white p-2 rounded-lg ml-2 active:scale-[.98]">Create</button>
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2">Existing Labels</h3>
          {labels.map(label => (
            <div key={label._id} className="flex items-center justify-between mb-2 bg-gray-800 p-2 rounded-lg">
              {editingLabel?._id === label._id ? (
                <>
                  <input 
                    type="text" 
                    value={editingLabel.name} 
                    onChange={(e) => setEditingLabel({...editingLabel, name: e.target.value})} 
                    className="bg-gray-700 p-1 rounded-lg mr-2 grow border border-gray-600"
                  />
                  <input 
                    type="color" 
                    value={editingLabel.color} 
                    onChange={(e) => setEditingLabel({...editingLabel, color: e.target.value})} 
                    className="bg-gray-700 p-1 rounded-lg border border-gray-600"
                  />
                  <button onClick={() => handleUpdate(label._id)} className="bg-green-600 text-white p-1 rounded-lg ml-2 active:scale-[.98]">Save</button>
                  <button onClick={() => setEditingLabel(null)} className="bg-gray-500 text-white p-1 rounded-lg ml-2 active:scale-[.98]">Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ color: label.color }}>{label.name}</span>
                  <div>
                    <button onClick={() => setEditingLabel(label)} className="bg-yellow-600 text-white p-1 rounded-lg mr-2 active:scale-[.98]">Edit</button>
                    <button onClick={() => handleDelete(label._id)} className="bg-red-600 text-white p-1 rounded-lg active:scale-[.98]">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} className="mt-4 bg-gray-700 text-white p-2 rounded-lg w-full active:scale-[.98]">Close</button>
      </div>
    </div>
  );
}
