/**
 * Shared types for the encrypted offline reading engine.
 *
 * The offline copy of a book is never stored as plaintext. Each chapter is kept
 * as an individually AES-256-CBC-encrypted record in IndexedDB, keyed off a
 * per-book random salt. At read time a single chapter is decrypted into a
 * volatile variable, painted to the DOM, and discarded on navigation.
 */

/** Raw chapter content handed to the engine for encryption. */
export interface ChapterInput {
  /** Optional explicit ordering; falls back to array index. */
  order?: number;
  /** Optional chapter heading. */
  title?: string;
  /** The chapter body. Split/encrypted as supplied. */
  text: string;
}

/** A single encrypted chapter row in IndexedDB. */
export interface OfflineChapterRecord {
  /** `${bookId}:${order}` — stable primary key. */
  id: string;
  bookId: string;
  order: number;
  title: string;
  /** Base64 random 16-byte IV, unique per chapter. */
  iv: string;
  /** Base64 AES-256-CBC ciphertext. */
  ciphertext: string;
  /** Base64 HMAC-SHA256 tag over the ciphertext (encrypt-then-MAC). */
  mac: string;
}

/** A book-level manifest row in IndexedDB (never contains plaintext). */
export interface OfflineBookRecord {
  bookId: string;
  title: string;
  author: string | null;
  /** Base64 random 16-byte PBKDF2 salt, unique per book. */
  salt: string;
  chapterCount: number;
  /** Epoch millis of the last save. */
  updatedAt: number;
}

export interface DownloadBookInput {
  bookId: string;
  title: string;
  author?: string | null;
  /**
   * Server-issued key passphrase (see `lib/offline/key.ts`). Callers pass
   * `deriveOfflinePassphrase(user.id)`, an HMAC of the user id under
   * `OFFLINE_KEY_SECRET`.
   */
  passphrase: string;
  chapters: ChapterInput[];
}

export type OfflineReaderStatus =
  | "idle"
  | "loading"
  | "ready"
  | "unavailable"
  | "error";

export interface OfflineReaderState {
  status: OfflineReaderStatus;
  title: string;
  chapterIndex: number;
  totalChapters: number;
  error: string | null;
}
