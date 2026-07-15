'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import LabelFilters from '@/components/LabelFilters';
import SortSelector, { type SortOption } from '@/components/SortSelector';
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
  const LAST_SORT_KEY = 'ui:lastSelectedSort';
  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [loading, setLoading] = useState<boolean>(true);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshNow = async (updateUi = true) => {
    try {
      setRefreshError('');
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
      setRefreshError('Could not sync right now. Your cached notes are still available.');
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

      // Check if notes were just updated (within last 5 seconds)
      let shouldRefresh = false;
      if (typeof window !== 'undefined') {
        try {
          const justUpdated = sessionStorage.getItem('notes:justUpdated');
          if (justUpdated) {
            const updateTime = parseInt(justUpdated, 10);
            const timeSinceUpdate = Date.now() - updateTime;
            // If updated within last 5 seconds, refresh from server
            if (timeSinceUpdate < 5000) {
              shouldRefresh = true;
            }
            // Clear the flag
            sessionStorage.removeItem('notes:justUpdated');
          }
        } catch {}
      }

      if (shouldRefresh) {
        // Notes were just updated, refresh from server immediately
        await refreshNow(true);
      } else if (!cachedNotes || cachedNotes.length === 0) {
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

  // Restore last selected sort option
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(LAST_SORT_KEY);
      if (saved && ['newest', 'oldest', 'title-asc', 'title-desc'].includes(saved)) {
        setSortBy(saved as SortOption);
      }
    } catch {}
  }, []);

  const handleSelectLabel = (id: string | null) => {
    setSelectedLabel(id);
    if (typeof window === 'undefined') return;
    try {
      if (id) localStorage.setItem(LAST_LABEL_KEY, id);
      else localStorage.removeItem(LAST_LABEL_KEY);
    } catch {}
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LAST_SORT_KEY, sort);
    } catch {}
  };

  // Debounce search input for snappy UX
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput.trim()), 200);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filteredNotes = useMemo(() => {
    let filtered = selectedLabel
      ? notes.filter((n) => n.labels.some((l) => l._id === selectedLabel))
      : notes;
    
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((n) => {
        const title = (n.title || '').toLowerCase();
        const content = (n.content || '').toLowerCase();
        if (title.includes(q) || content.includes(q)) return true;
        return n.labels.some((l) => (l.name || '').toLowerCase().includes(q));
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate; // Newest first
        case 'oldest':
          const aDateOld = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDateOld = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aDateOld - bDateOld; // Oldest first
        case 'title-asc':
          const aTitle = (a.title || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();
          if (!aTitle && !bTitle) return 0;
          if (!aTitle) return 1;
          if (!bTitle) return -1;
          return aTitle.localeCompare(bTitle);
        case 'title-desc':
          const aTitleDesc = (a.title || '').toLowerCase();
          const bTitleDesc = (b.title || '').toLowerCase();
          if (!aTitleDesc && !bTitleDesc) return 0;
          if (!aTitleDesc) return 1;
          if (!bTitleDesc) return -1;
          return bTitleDesc.localeCompare(aTitleDesc);
        default:
          return 0;
      }
    });

    return sorted;
  }, [notes, selectedLabel, searchQuery, sortBy]);

  const handleLabelsUpdate = async () => {
    try {
      const fresh = await refreshLabelsFromServer();
      setLabels(fresh);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <Header
        onManageLabels={() => setIsLabelManagerOpen(true)}
        onRefresh={() => refreshNow(true)}
        refreshing={refreshing}
        searchTerm={searchInput}
        onSearchChange={setSearchInput}
      />

      <LabelFilters labels={labels} selectedLabel={selectedLabel} onSelectLabel={handleSelectLabel} />
      <SortSelector sortBy={sortBy} onSortChange={handleSortChange} />

      {refreshError && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-800/70 bg-amber-950/40 px-4 py-3 text-sm text-amber-200" role="status">
          {refreshError}
        </div>
      )}

      {loading ? (
        <div className="px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" aria-label="Loading notes">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl border border-slate-700 bg-slate-800/80" />
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <NoteList notes={filteredNotes} />
      ) : (
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          {notes.length === 0 ? (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl text-white">✦</div>
              <h2 className="mb-3 text-2xl font-semibold tracking-tight">A clear space for your ideas</h2>
              <p className="text-slate-400">Capture your first thought and build your personal library.</p>
            </>
          ) : (
            <>
              <h2 className="mb-2 text-2xl font-semibold">No notes found</h2>
              <p className="text-slate-400">Try a different search or clear your filters.</p>
            </>
          )}
        </div>
      )}

      <FloatingActionButton />
      <LabelManager isOpen={isLabelManagerOpen} onClose={() => setIsLabelManagerOpen(false)} onLabelsUpdate={handleLabelsUpdate} />
    </div>
  );
}
