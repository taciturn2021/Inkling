import { openDB, type IDBPDatabase } from 'idb';

export type CachedLabel = { _id: string; name: string; color: string };
export type CachedNote = {
  _id: string;
  title?: string;
  content: string;
  format: 'text' | 'md';
  labels: CachedLabel[];
  createdAt?: string;
  updatedAt?: string;
  shared?: boolean;
};

export type CachedUser = { id: string; username: string };
export type ImageSyncStatus = {
  total: number;
  available: number;
  failed: string[];
  completedAt: number;
};

export type CachedChatMessage = {
  id: string;
  note: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
};

type DBSchema = {
  notes: CachedNote;
  labels: CachedLabel;
  meta: { key: string; value: any };
  images: { id: string; contentType: string; blob: Blob; updatedAt: number };
  chats: CachedChatMessage;
};

const ACTIVE_USER_KEY = 'inkling:active-user';
const dbPromises = new Map<string, Promise<IDBPDatabase<any>>>();

function readActiveUser(): CachedUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(ACTIVE_USER_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<CachedUser>;
    if (!parsed.id || !parsed.username) return null;
    return { id: String(parsed.id), username: String(parsed.username) };
  } catch {
    return null;
  }
}

export function getActiveUser(): CachedUser | null {
  return readActiveUser();
}

export function setActiveUser(user: CachedUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    ACTIVE_USER_KEY,
    JSON.stringify({ id: String(user.id), username: String(user.username) }),
  );
  // Version 4 and earlier used one unscoped database for every account.
  // It cannot be attributed safely, so never migrate or render its contents.
  try {
    indexedDB.deleteDatabase('notes-local-db');
  } catch {}
}

function databaseName(userId: string) {
  return `inkling-local-${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

export function getDB() {
  const user = readActiveUser();
  if (!user) {
    return Promise.reject(new Error('No local account is active'));
  }

  const existing = dbPromises.get(user.id);
  if (existing) return existing;

  const dbPromise = openDB<any>(databaseName(user.id), 4, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) {
          const s = db.createObjectStore('notes', { keyPath: '_id' });
          // Optional indexes for future filtering
          try { s.createIndex('title', 'title'); } catch {}
        }
        if (!db.objectStoreNames.contains('labels')) {
          db.createObjectStore('labels', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chats')) {
          const c = db.createObjectStore('chats', { keyPath: 'id' });
          try { c.createIndex('byNoteAndTime', ['note', 'createdAt']); } catch {}
        } else {
          try {
            const c = db.transaction('chats', 'versionchange').store;
            try { c.createIndex('byNoteAndTime', ['note', 'createdAt']); } catch {}
          } catch {}
        }
      },
    });
  dbPromises.set(user.id, dbPromise);
  return dbPromise;
}

export async function clearActiveUserData() {
  const user = readActiveUser();
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_USER_KEY);
  if (!user) return;

  const promise = dbPromises.get(user.id);
  if (promise) {
    try {
      (await promise).close();
    } catch {}
    dbPromises.delete(user.id);
  }

  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(databaseName(user.id));
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

export async function putNotes(notes: CachedNote[]) {
  const db = await getDB();
  const tx = db.transaction('notes', 'readwrite');
  await Promise.all(notes.map((n) => tx.store.put(n)));
  await tx.done;
}

export async function getAllNotes(): Promise<CachedNote[]> {
  const db = await getDB();
  return db.getAll('notes');
}

export async function getNote(id: string): Promise<CachedNote | undefined> {
  const db = await getDB();
  return db.get('notes', id);
}

export async function deleteNote(id: string) {
  const db = await getDB();
  try {
    await db.delete('notes', id);
  } catch {}
}

export async function clearNotes() {
  const db = await getDB();
  const tx = db.transaction('notes', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function replaceLibrarySnapshot(
  notes: CachedNote[],
  labels: CachedLabel[],
) {
  const db = await getDB();
  const tx = db.transaction(['notes', 'labels', 'meta'], 'readwrite');
  await tx.objectStore('notes').clear();
  await tx.objectStore('labels').clear();
  await Promise.all([
    ...notes.map((note) => tx.objectStore('notes').put(note)),
    ...labels.map((label) => tx.objectStore('labels').put(label)),
  ]);
  await tx.objectStore('meta').put({ key: 'lastUpdated', value: Date.now() });
  await tx.done;
}

export async function putLabels(labels: CachedLabel[]) {
  const db = await getDB();
  const tx = db.transaction('labels', 'readwrite');
  await Promise.all(labels.map((l) => tx.store.put(l)));
  await tx.done;
}

export async function replaceLabels(labels: CachedLabel[]) {
  const db = await getDB();
  const tx = db.transaction('labels', 'readwrite');
  await tx.store.clear();
  await Promise.all(labels.map((label) => tx.store.put(label)));
  await tx.done;
}

export async function getAllLabels(): Promise<CachedLabel[]> {
  const db = await getDB();
  return db.getAll('labels');
}

export async function setMeta(key: string, value: any) {
  const db = await getDB();
  await db.put('meta', { key, value });
}

export async function getMeta<T = any>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const entry = await db.get('meta', key);
  return entry?.value as T | undefined;
}

// Image blob cache helpers
export async function putImageBlob(id: string, blob: Blob, contentType: string) {
  const db = await getDB();
  await db.put('images', { id, blob, contentType, updatedAt: Date.now() });
}

export async function getImageBlob(id: string): Promise<{ blob: Blob; contentType: string } | undefined> {
  const db = await getDB();
  const v = await db.get('images', id);
  if (!v) return undefined;
  return { blob: v.blob as Blob, contentType: String(v.contentType) };
}

export async function deleteImageBlob(id: string) {
  const db = await getDB();
  try { await db.delete('images', id); } catch {}
}

export async function getAllImageIds(): Promise<string[]> {
  const db = await getDB();
  return (await db.getAllKeys('images')).map(String);
}

export async function setImageSyncStatus(status: ImageSyncStatus) {
  await setMeta('imageSyncStatus', status);
}

export async function getImageSyncStatus(): Promise<ImageSyncStatus | undefined> {
  return getMeta<ImageSyncStatus>('imageSyncStatus');
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// Chat history helpers
export async function getChatForNote(noteId: string): Promise<CachedChatMessage[]> {
  const db = await getDB();
  try {
    const index = 'byNoteAndTime';
    const lower: [string, number] = [noteId, -Infinity];
    const upper: [string, number] = [noteId, Infinity];
    const range = IDBKeyRange.bound(lower as any, upper as any);
    const all = await db.getAllFromIndex('chats', index as any, range as any);
    return all.sort((a: CachedChatMessage, b: CachedChatMessage) => a.createdAt - b.createdAt);
  } catch {
    // Fallback: get all and filter client-side
    const all = (await db.getAll('chats')) as CachedChatMessage[];
    return all.filter((m) => m.note === noteId).sort((a, b) => a.createdAt - b.createdAt);
  }
}

export async function replaceChatForNote(noteId: string, messages: CachedChatMessage[]) {
  const db = await getDB();
  const tx = db.transaction('chats', 'readwrite');
  try {
    // Delete existing for note
    try {
      const index = tx.store.index('byNoteAndTime');
      const lower: [string, number] = [noteId, -Infinity];
      const upper: [string, number] = [noteId, Infinity];
      const range = IDBKeyRange.bound(lower as any, upper as any);
      let cursor = await index.openCursor(range as any);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    } catch {
      const all = await tx.store.getAll();
      await Promise.all((all as CachedChatMessage[]).filter((m) => m.note === noteId).map((m) => tx.store.delete(m.id)));
    }

    // Put new messages
    await Promise.all(messages.map((m) => tx.store.put(m)));
  } finally {
    await tx.done;
  }
}

export async function appendChatMessages(messages: CachedChatMessage[]) {
  if (!messages || messages.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('chats', 'readwrite');
  await Promise.all(messages.map((m) => tx.store.put(m)));
  await tx.done;
}

export async function clearChatForNote(noteId: string) {
  const db = await getDB();
  const tx = db.transaction('chats', 'readwrite');
  try {
    const index = tx.store.index('byNoteAndTime');
    const lower: [string, number] = [noteId, -Infinity];
    const upper: [string, number] = [noteId, Infinity];
    const range = IDBKeyRange.bound(lower as any, upper as any);
    let cursor = await index.openCursor(range as any);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  } catch {
    const all = await tx.store.getAll();
    await Promise.all((all as CachedChatMessage[]).filter((m) => m.note === noteId).map((m) => tx.store.delete(m.id)));
  } finally {
    await tx.done;
  }
}
