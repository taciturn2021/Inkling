"use client";

import {
  getAllNotes as idbGetAll,
  getNote as idbGet,
  getMeta,
  type CachedNote,
  type CachedLabel,
  getAllLabels as idbGetAllLabels,
  replaceLabels,
  replaceLibrarySnapshot,
  getActiveUser,
  setActiveUser,
  clearActiveUserData,
  getImageBlob,
  putImageBlob,
  getAllImageIds,
  deleteImageBlob,
  setImageSyncStatus,
  getImageSyncStatus,
  requestPersistentStorage,
  type CachedUser,
  type ImageSyncStatus,
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
export type { CachedUser, ImageSyncStatus } from './idb';

export async function establishActiveUser(): Promise<CachedUser> {
  try {
    const res = await fetch('/api/auth/session', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const user = {
        id: String(data.user.id),
        username: String(data.user.username),
      };
      setActiveUser(user);
      return user;
    }
    if (res.status === 401) {
      await clearActiveUserData();
      throw new Error('Your session has expired');
    }
    throw new Error('Could not verify session');
  } catch (error) {
    const cachedUser = getActiveUser();
    if (cachedUser) return cachedUser;
    throw error;
  }
}

export { setActiveUser, clearActiveUserData, getActiveUser };

export async function loadCachedNotes(): Promise<CachedNote[]> {
  const notes = await idbGetAll();
  // Don't sort here - let the component handle sorting based on user preference
  return notes;
}

export async function getCachedNote(id: string) {
  return idbGet(id);
}

function normalizeNotes(serverNotes: any[]): CachedNote[] {
  return serverNotes.map((n) => ({
    _id: String(n._id),
    title: n.title || '',
    content: n.content || '',
    format: n.format === 'md' ? 'md' : 'text',
    labels: (n.labels || []).map((l: any) => ({ _id: String(l._id), name: l.name, color: l.color })),
    createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : undefined,
    updatedAt: n.updatedAt ? new Date(n.updatedAt).toISOString() : undefined,
    shared: !!n.shared,
  }));
}

function normalizeLabels(labels: any[]): CachedLabel[] {
  return labels.map((label) => ({
    _id: String(label._id),
    name: String(label.name || ''),
    color: String(label.color || ''),
  }));
}

export function extractInternalImageIds(notes: CachedNote[]): string[] {
  const ids = new Set<string>();
  for (const note of notes) {
    for (const match of note.content.matchAll(/\/api\/images\/([a-f\d]{24})(?:[/?#\s)]|$)/gi)) {
      ids.add(match[1].toLowerCase());
    }
  }
  return [...ids];
}

async function cacheReferencedImages(notes: CachedNote[]): Promise<ImageSyncStatus> {
  const ids = extractInternalImageIds(notes);
  const referenced = new Set(ids);
  const failed: string[] = [];
  let available = 0;
  let cursor = 0;

  await requestPersistentStorage();

  const worker = async () => {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        const cached = await getImageBlob(id);
        if (cached) {
          available += 1;
          continue;
        }
        const res = await fetch(`/api/images/${id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Image request failed with ${res.status}`);
        const blob = await res.blob();
        const contentType = blob.type || res.headers.get('content-type') || '';
        if (!contentType.toLowerCase().startsWith('image/')) {
          throw new Error('Response was not an image');
        }
        await putImageBlob(id, blob, contentType);
        available += 1;
      } catch {
        failed.push(id);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));

  const cachedIds = await getAllImageIds();
  await Promise.all(
    cachedIds
      .filter((id) => !referenced.has(id))
      .map((id) => deleteImageBlob(id)),
  );

  const status = {
    total: ids.length,
    available,
    failed,
    completedAt: Date.now(),
  };
  await setImageSyncStatus(status);
  return status;
}

export type LibraryRefresh = {
  notes: CachedNote[];
  labels: CachedLabel[];
  images: ImageSyncStatus;
};

export async function refreshLibraryFromServer(): Promise<LibraryRefresh> {
  const [notesRes, labelsRes] = await Promise.all([
    fetch('/api/notes', { cache: 'no-store' }),
    fetch('/api/labels', { cache: 'no-store' }),
  ]);
  if (!notesRes.ok || !labelsRes.ok) {
    throw new Error('Failed to fetch library');
  }

  const notes = normalizeNotes((await notesRes.json()) as any[]);
  const labels = normalizeLabels((await labelsRes.json()) as any[]);
  await replaceLibrarySnapshot(notes, labels);
  const images = await cacheReferencedImages(notes);
  return { notes, labels, images };
}

export async function refreshNotesFromServer(): Promise<CachedNote[]> {
  return (await refreshLibraryFromServer()).notes;
}

export async function getLastUpdated(): Promise<number | undefined> {
  return getMeta<number>('lastUpdated');
}

export async function getOfflineImageStatus(): Promise<ImageSyncStatus | undefined> {
  return getImageSyncStatus();
}

export async function loadCachedLabels(): Promise<CachedLabel[]> {
  return idbGetAllLabels();
}

export async function refreshLabelsFromServer(): Promise<CachedLabel[]> {
  const res = await fetch('/api/labels', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch labels');
  const normalized = normalizeLabels((await res.json()) as any[]);
  await replaceLabels(normalized);
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
