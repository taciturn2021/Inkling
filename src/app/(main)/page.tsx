'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import LabelFilters from '@/components/LabelFilters';
import NoteList from '@/components/NoteList';
import FloatingActionButton from '@/components/FloatingActionButton';
import LabelManager from '@/components/LabelManager';
import {
  loadCachedNotes,
  refreshNotesFromServer,
  getLastUpdated,
  type CachedNote,
  loadCachedLabels,
  refreshLabelsFromServer,
} from '@/lib/notesStore';




type Label = { _id: string; name: string; color: string };
type Note = CachedNote;

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshNow = async (updateUi = true) => {
    try {
      setRefreshing(true);
      const fresh = await refreshNotesFromServer();
      if (updateUi) setNotes(fresh);
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      setRefreshing(false);
    }
  };

  const bootstrapFromCache = async () => {
    setLoading(true);
    try {
      const [cachedNotes, cachedLabels] = await Promise.all([
        loadCachedNotes(),
        loadCachedLabels(),
      ]);

      setNotes(cachedNotes);
      setLabels(cachedLabels);

      if (!cachedNotes || cachedNotes.length === 0) {
        const fresh = await refreshNotesFromServer();
        setNotes(fresh);
      } else {
        const last = await getLastUpdated();
        const tooOld = !last || Date.now() - last > 10 * 60 * 1000;
        if (tooOld) refreshNow(false);
      }

      if (!cachedLabels || cachedLabels.length === 0) {
        const freshLabels = await refreshLabelsFromServer();
        setLabels(freshLabels);
      }
    } catch (error) {
      console.error('Bootstrap cache failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrapFromCache();
  }, []);

  const filteredNotes = selectedLabel
    ? notes.filter((n) => n.labels.some((l) => l._id === selectedLabel))
    : notes;

  const handleLabelsUpdate = async () => {
    try {
      const fresh = await refreshLabelsFromServer();
      setLabels(fresh);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header onManageLabels={() => setIsLabelManagerOpen(true)} onRefresh={() => refreshNow(true)} refreshing={refreshing} />

      <LabelFilters labels={labels} selectedLabel={selectedLabel} onSelectLabel={setSelectedLabel} />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading...</p>
        </div>
      ) : filteredNotes.length > 0 ? (
        <NoteList notes={filteredNotes} />
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-4">Welcome to your notes!</h2>
          <p className="text-gray-400">You don't have any notes yet. Click the '+' button to create your first note.</p>
        </div>
      )}

      <FloatingActionButton />
      <LabelManager isOpen={isLabelManagerOpen} onClose={() => setIsLabelManagerOpen(false)} onLabelsUpdate={handleLabelsUpdate} />
    </div>
  );
}
