"use client";

import {
  getAllNotes as idbGetAll,
  getNote as idbGet,
  putNotes,
  setMeta,
  getMeta,
  type CachedNote,
  type CachedLabel,
  getAllLabels as idbGetAllLabels,
  putLabels,
} from './idb';

// A tiny client-side store around IndexedDB for notes/labels
export type { CachedNote, CachedLabel } from './idb';

export async function loadCachedNotes(): Promise<CachedNote[]> {
  const notes = await idbGetAll();
  // Sort newest first by createdAt if available
  return notes.sort((a, b) => (b.createdAt?.localeCompare(a.createdAt || '') || 0));
}

export async function getCachedNote(id: string) {
  return idbGet(id);
}

export async function refreshNotesFromServer(): Promise<CachedNote[]> {
  const res = await fetch('/api/notes', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch notes');
  const serverNotes = (await res.json()) as any[];
  const normalized: CachedNote[] = serverNotes.map((n) => ({
    _id: String(n._id),
    title: n.title || '',
    content: n.content || '',
    format: n.format === 'md' ? 'md' : 'text',
    labels: (n.labels || []).map((l: any) => ({ _id: String(l._id), name: l.name, color: l.color })),
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : undefined,
  }));
  await putNotes(normalized);
  await setMeta('lastUpdated', Date.now());
  return normalized;
}

export async function getLastUpdated(): Promise<number | undefined> {
  return getMeta<number>('lastUpdated');
}

export async function loadCachedLabels(): Promise<CachedLabel[]> {
  return idbGetAllLabels();
}

export async function refreshLabelsFromServer(): Promise<CachedLabel[]> {
  const res = await fetch('/api/labels', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch labels');
  const labels = (await res.json()) as any[];
  const normalized: CachedLabel[] = labels.map((l) => ({
    _id: String(l._id),
    name: l.name,
    color: l.color,
  }));
  await putLabels(normalized);
  return normalized;
}
