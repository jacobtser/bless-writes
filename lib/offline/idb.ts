import type { OfflineBookRecord, OfflineChapterRecord } from "./types";

/**
 * Minimal promisified IndexedDB wrapper — deliberately dependency-free.
 *
 * Database layout (`bless-books-offline`, v1):
 *   - `books`    : keyPath `bookId`  — one manifest row per saved book
 *   - `chapters` : keyPath `id`      — one encrypted row per chapter
 *                  index `byBook` (bookId) for ordered range reads
 *
 * IndexedDB is browser-only; every function throws a clear error if called in a
 * non-browser context so mis-imported server code fails loudly.
 */

export const OFFLINE_DB_NAME = "bless-books-offline";
export const OFFLINE_DB_VERSION = 1;
export const BOOKS_STORE = "books";
export const CHAPTERS_STORE = "chapters";
export const CHAPTER_BOOK_INDEX = "byBook";

let dbPromise: Promise<IDBDatabase> | null = null;

function requireIndexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }
  return indexedDB;
}

/** Opens (and upgrades) the offline database. The handle is memoized. */
export function openOfflineDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = requireIndexedDb().open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: "bookId" });
      }
      if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
        const chapters = db.createObjectStore(CHAPTERS_STORE, { keyPath: "id" });
        chapters.createIndex(CHAPTER_BOOK_INDEX, "bookId");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });

  return dbPromise;
}

function runTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => IDBRequest<T> | void,
): Promise<T> {
  return openOfflineDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeNames, mode);
        const request = body(tx);
        tx.oncomplete = () => resolve((request && "result" in request ? request.result : undefined) as T);
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted."));
      }),
  );
}

/** Writes the book manifest + all chapter rows, replacing any previous copy. */
export async function putBookWithChapters(
  book: OfflineBookRecord,
  chapters: OfflineChapterRecord[],
): Promise<void> {
  // Remove the old generation first so a shrink in chapter count can't leave
  // stale rows behind. Two separate readwrite transactions serialize on the
  // same connection, so the deletes are committed before the puts begin.
  await deleteOfflineBook(book.bookId);

  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BOOKS_STORE, CHAPTERS_STORE], "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save offline book."));
    tx.onabort = () => reject(tx.error ?? new Error("Saving offline book was aborted."));

    tx.objectStore(BOOKS_STORE).put(book);
    const chapterStore = tx.objectStore(CHAPTERS_STORE);
    for (const chapter of chapters) chapterStore.put(chapter);
  });
}

export function getOfflineBook(bookId: string): Promise<OfflineBookRecord | undefined> {
  return runTransaction<OfflineBookRecord | undefined>(
    BOOKS_STORE,
    "readonly",
    (tx) => tx.objectStore(BOOKS_STORE).get(bookId),
  );
}

export function getOfflineChapter(
  bookId: string,
  order: number,
): Promise<OfflineChapterRecord | undefined> {
  return runTransaction<OfflineChapterRecord | undefined>(
    CHAPTERS_STORE,
    "readonly",
    (tx) => tx.objectStore(CHAPTERS_STORE).get(`${bookId}:${order}`),
  );
}

export function getOfflineChapterCount(bookId: string): Promise<number> {
  return runTransaction<number>(CHAPTERS_STORE, "readonly", (tx) =>
    tx.objectStore(CHAPTERS_STORE).index(CHAPTER_BOOK_INDEX).count(IDBKeyRange.only(bookId)),
  );
}

export function listOfflineBooks(): Promise<OfflineBookRecord[]> {
  return runTransaction<OfflineBookRecord[]>(BOOKS_STORE, "readonly", (tx) =>
    tx.objectStore(BOOKS_STORE).getAll(),
  );
}

export function hasOfflineBook(bookId: string): Promise<boolean> {
  return runTransaction<number>(BOOKS_STORE, "readonly", (tx) =>
    tx.objectStore(BOOKS_STORE).count(IDBKeyRange.only(bookId)),
  ).then((count) => count > 0);
}

/** Removes a book manifest and every chapter belonging to it. */
export async function deleteOfflineBook(bookId: string): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BOOKS_STORE, CHAPTERS_STORE], "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete offline book."));
    tx.onabort = () => reject(tx.error ?? new Error("Deleting offline book was aborted."));

    tx.objectStore(BOOKS_STORE).delete(bookId);
    tx.objectStore(CHAPTERS_STORE)
      .index(CHAPTER_BOOK_INDEX)
      .openCursor(IDBKeyRange.only(bookId)).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
}
