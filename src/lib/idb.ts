import { openDB, type IDBPDatabase } from 'idb';

export type CachedLabel = { _id: string; name: string; color: string };
export type CachedNote = {
  _id: string;
  title?: string;
  content: string;
  format: 'text' | 'md';
  labels: CachedLabel[];
  createdAt?: string;
};

type DBSchema = {
  notes: CachedNote;
  labels: CachedLabel;
  meta: { key: string; value: any };
};

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<any>('notes-local-db', 2, {
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
      },
    });
  }
  return dbPromise;
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

export async function clearNotes() {
  const db = await getDB();
  const tx = db.transaction('notes', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function putLabels(labels: CachedLabel[]) {
  const db = await getDB();
  const tx = db.transaction('labels', 'readwrite');
  await Promise.all(labels.map((l) => tx.store.put(l)));
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
