import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAllNotes,
  replaceLibrarySnapshot,
  setActiveUser,
  type CachedNote,
} from './idb';
import { extractInternalImageIds } from './notesStore';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: globalThis,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: new MemoryStorage(),
  });
});

describe('offline cache', () => {
  it('keeps note snapshots isolated by account', async () => {
    setActiveUser({ id: 'user-a', username: 'alice' });
    await replaceLibrarySnapshot(
      [{ _id: 'note-a', title: 'Alice', content: 'A', format: 'md', labels: [] }],
      [],
    );

    setActiveUser({ id: 'user-b', username: 'bob' });
    await replaceLibrarySnapshot(
      [{ _id: 'note-b', title: 'Bob', content: 'B', format: 'md', labels: [] }],
      [],
    );
    expect((await getAllNotes()).map((note) => note._id)).toEqual(['note-b']);

    setActiveUser({ id: 'user-a', username: 'alice' });
    expect((await getAllNotes()).map((note) => note._id)).toEqual(['note-a']);
  });

  it('extracts unique app-hosted image IDs from downloaded notes', () => {
    const first = '0123456789abcdef01234567';
    const second = 'abcdef0123456789abcdef01';
    const notes: CachedNote[] = [
      {
        _id: 'note',
        content: `![one](/api/images/${first})\n<img src="/api/images/${second}?v=1">\n![duplicate](/api/images/${first})`,
        format: 'md',
        labels: [],
      },
    ];

    expect(extractInternalImageIds(notes)).toEqual([first, second]);
  });
});
