'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import LabelFilters from '@/components/LabelFilters';
import SortSelector, { type SortOption } from '@/components/SortSelector';
import NoteList from '@/components/NoteList';
import FloatingActionButton from '@/components/FloatingActionButton';
import LabelManager from '@/components/LabelManager';
import CachedNoteScreen from '@/components/CachedNoteScreen';
import {
  loadCachedNotes,
  refreshLibraryFromServer,
  getLastUpdated,
  type CachedNote,
  loadCachedLabels,
  refreshLabelsFromServer,
  establishActiveUser,
  getOfflineImageStatus,
} from '@/lib/notesStore';
import { useOnlineStatus } from '@/lib/useOnlineStatus';




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
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [cacheUnavailable, setCacheUnavailable] = useState(false);
  const online = useOnlineStatus();

  const refreshNow = async (updateUi = true) => {
    try {
      setRefreshError('');
      setRefreshing(true);
      const fresh = await refreshLibraryFromServer();
      if (updateUi) {
        setNotes(fresh.notes);
        setLabels(fresh.labels);
      }
      if (fresh.images.failed.length > 0) {
        setRefreshError(
          `${fresh.images.failed.length} image${fresh.images.failed.length === 1 ? '' : 's'} could not be saved for offline use.`,
        );
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
      await establishActiveUser();
      const [cachedNotes, cachedLabels] = await Promise.all([
        loadCachedNotes(),
        loadCachedLabels(),
      ]);

      setNotes(cachedNotes);
      setLabels(cachedLabels);
      const imageStatus = await getOfflineImageStatus();
      if (imageStatus?.failed.length) {
        setRefreshError(
          `${imageStatus.failed.length} cached image${imageStatus.failed.length === 1 ? '' : 's'} may be unavailable offline.`,
        );
      }

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
        const fresh = await refreshLibraryFromServer();
        setNotes(fresh.notes);
        setLabels(fresh.labels);
      } else {
        const last = await getLastUpdated();
        const tooOld = !last || Date.now() - last > 10 * 60 * 1000;
        if (tooOld) refreshNow(false);
      }

      if (cachedNotes.length > 0 && cachedLabels.length === 0) {
        const freshLabels = await refreshLabelsFromServer();
        setLabels(freshLabels);
      }
    } catch (error) {
      console.error('Bootstrap cache failed', error);
      setCacheUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrapFromCache();
  }, []);

  useEffect(() => {
    const readPath = () => {
      const match = window.location.pathname.match(/^\/notes\/([a-f\d]{24})\/?$/i);
      setActiveNoteId(match?.[1] || null);
    };
    readPath();
    window.addEventListener('popstate', readPath);
    return () => window.removeEventListener('popstate', readPath);
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

  const openCachedNote = (id: string) => {
    window.history.pushState({ inklingNote: id }, '', `/notes/${id}`);
    setActiveNoteId(id);
  };

  const closeCachedNote = () => {
    window.history.replaceState({}, '', '/');
    setActiveNoteId(null);
  };

  if (activeNoteId) {
    return <CachedNoteScreen id={activeNoteId} onBack={closeCachedNote} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <Header
        onManageLabels={() => setIsLabelManagerOpen(true)}
        onRefresh={online ? () => refreshNow(true) : undefined}
        refreshing={refreshing}
        searchTerm={searchInput}
        onSearchChange={setSearchInput}
        networkEnabled={online}
      />

      {!online && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-800/70 bg-amber-950/40 px-4 py-3 text-sm text-amber-200" role="status">
          You are offline. Downloaded notes and images remain available; changes require a connection.
        </div>
      )}

      <LabelFilters labels={labels} selectedLabel={selectedLabel} onSelectLabel={handleSelectLabel} />
      <SortSelector sortBy={sortBy} onSortChange={handleSortChange} />

      {refreshError && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-800/70 bg-amber-950/40 px-4 py-3 text-sm text-amber-200" role="status">
          {refreshError}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 px-4 pb-24 pt-4 sm:grid-cols-2 sm:gap-6 sm:pt-5 lg:grid-cols-3" aria-label="Loading notes">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl border border-slate-700 bg-slate-800/70" />
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <NoteList notes={filteredNotes} onOpenNote={openCachedNote} />
      ) : (
        <div className="animate-fade-in-up mx-auto max-w-md px-6 py-20 text-center">
          {notes.length === 0 && cacheUnavailable ? (
            <>
              <h2 className="mb-3 text-2xl font-semibold tracking-tight">No offline notes available</h2>
              <p className="text-slate-400">Connect to the internet once to download your notes and their images.</p>
            </>
          ) : notes.length === 0 ? (
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

      {online && <FloatingActionButton />}
      {online && <LabelManager isOpen={isLabelManagerOpen} onClose={() => setIsLabelManagerOpen(false)} onLabelsUpdate={handleLabelsUpdate} />}
    </div>
  );
}
