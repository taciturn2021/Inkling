'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const LAST_LABEL_KEY = 'ui:lastSelectedLabel';
  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshNow = async (updateUi = true) => {
    try {
      setRefreshing(true);
      const [freshNotes, freshLabels] = await Promise.all([
        refreshNotesFromServer(),
        refreshLabelsFromServer(),
      ]);
      if (updateUi) {
        setNotes(freshNotes);
        setLabels(freshLabels);
      }
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

  // Restore last selected label when labels are available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedLabel !== null) return;
    try {
      const saved = localStorage.getItem(LAST_LABEL_KEY);
      if (saved && labels.some((l) => l._id === saved)) {
        setSelectedLabel(saved);
      }
    } catch {}
  }, [labels, selectedLabel]);

  const handleSelectLabel = (id: string | null) => {
    setSelectedLabel(id);
    if (typeof window === 'undefined') return;
    try {
      if (id) localStorage.setItem(LAST_LABEL_KEY, id);
      else localStorage.removeItem(LAST_LABEL_KEY);
    } catch {}
  };

  // Debounce search input for snappy UX
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 200);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filteredNotes = useMemo(() => {
    const byLabel = selectedLabel
      ? notes.filter((n) => n.labels.some((l) => l._id === selectedLabel))
      : notes;
    if (!searchQuery) return byLabel;
    const q = searchQuery.toLowerCase();
    return byLabel.filter((n) => {
      const title = (n.title || '').toLowerCase();
      const content = (n.content || '').toLowerCase();
      if (title.includes(q) || content.includes(q)) return true;
      return n.labels.some((l) => (l.name || '').toLowerCase().includes(q));
    });
  }, [notes, selectedLabel, searchQuery]);

  const handleLabelsUpdate = async () => {
    try {
      const fresh = await refreshLabelsFromServer();
      setLabels(fresh);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        onManageLabels={() => setIsLabelManagerOpen(true)}
        onRefresh={() => refreshNow(true)}
        refreshing={refreshing}
        searchTerm={searchInput}
        onSearchChange={setSearchInput}
      />

      <LabelFilters labels={labels} selectedLabel={selectedLabel} onSelectLabel={handleSelectLabel} />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading...</p>
        </div>
      ) : filteredNotes.length > 0 ? (
        <NoteList notes={filteredNotes} />
      ) : (
        <div className="text-center py-16">
          {notes.length === 0 ? (
            <>
              <h2 className="text-2xl font-semibold mb-4">Welcome to your notes!</h2>
              <p className="text-gray-400">You don't have any notes yet. Click the '+' button to create your first note.</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-2">No results</h2>
              <p className="text-gray-400">Try a different search or clear filters.</p>
            </>
          )}
        </div>
      )}

      <FloatingActionButton />
      <LabelManager isOpen={isLabelManagerOpen} onClose={() => setIsLabelManagerOpen(false)} onLabelsUpdate={handleLabelsUpdate} />
    </div>
  );
}
