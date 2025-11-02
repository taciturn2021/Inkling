"use client";

import {
  getAllNotes as idbGetAll,
  getNote as idbGet,
  putNotes,
  deleteNote,
  setMeta,
  getMeta,
  type CachedNote,
  type CachedLabel,
  getAllLabels as idbGetAllLabels,
  putLabels,
  // chat helpers
  type CachedChatMessage,
  getChatForNote,
  replaceChatForNote,
  appendChatMessages,
  clearChatForNote,
} from './idb';

// A tiny client-side store around IndexedDB for notes/labels
export type { CachedNote, CachedLabel } from './idb';
export type { CachedChatMessage } from './idb';

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
    shared: !!n.shared,
  }));
  
  // Get current cached notes to find ones that need to be deleted
  const cachedNotes = await idbGetAll();
  const serverNoteIds = new Set(normalized.map(n => n._id));
  
  // Delete notes that are in cache but not in server response
  const notesToDelete = cachedNotes.filter(n => !serverNoteIds.has(n._id));
  await Promise.all(notesToDelete.map(n => deleteNote(n._id)));
  
  // Update/add notes from server
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

// Chat store mirroring notes behavior
export async function loadCachedChat(noteId: string): Promise<CachedChatMessage[]> {
  return getChatForNote(noteId);
}

export function normalizeServerChatMessages(noteId: string, raw: any[]): CachedChatMessage[] {
  return (raw || []).map((m) => ({
    id: String(m._id || `${noteId}-${m.role}-${m.createdAt || Date.now()}-${Math.random().toString(36).slice(2)}`),
    note: noteId,
    role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
    content: String(m.content || ''),
    createdAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
  })).sort((a, b) => a.createdAt - b.createdAt);
}

export async function refreshChatFromServer(noteId: string): Promise<CachedChatMessage[]> {
  const res = await fetch(`/api/notes/${noteId}/chat`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch chat');
  const server = (await res.json()) as any[];
  const normalized = normalizeServerChatMessages(noteId, server);
  await replaceChatForNote(noteId, normalized);
  return normalized;
}

export async function sendChatMessage(noteId: string, content: string): Promise<CachedChatMessage[]> {
  const res = await fetch(`/api/notes/${noteId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to send message');
  }
  const server = (await res.json()) as any[];
  const normalized = normalizeServerChatMessages(noteId, server);
  await appendChatMessages(normalized);
  return (await getChatForNote(noteId));
}

export async function clearChatHistory(noteId: string) {
  const res = await fetch(`/api/notes/${noteId}/chat`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear chat');
  await clearChatForNote(noteId);
}
