import { createSalt, encryptText } from "./crypto";
import { putBookWithChapters } from "./idb";
import type {
  ChapterInput,
  DownloadBookInput,
  OfflineChapterRecord,
} from "./types";

/**
 * Offline download engine — the single entry point that turns raw chapter text
 * into an encrypted, offline-readable copy in IndexedDB.
 *
 * Encryption is per-chapter: a fresh IV for every chapter, one per-book salt.
 * Nothing plaintext is persisted; only ciphertext rows and the manifest.
 */

/** Target chapter length (in characters) used when auto-splitting raw text. */
export const DEFAULT_CHAPTER_TOKEN = 6_000;

/**
 * Splits a single blob of text into chapter-sized chunks at paragraph
 * boundaries where possible, so auto-chunked books still read cleanly.
 *
 * Swap this out via `downloadBookForOffline` if the source already provides
 * per-chapter content.
 */
export function splitIntoChapters(
  text: string,
  chunkSize: number = DEFAULT_CHAPTER_TOKEN,
): ChapterInput[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return [{ order: 0, title: "Chapter 1", text: "" }];

  const chapters: ChapterInput[] = [];
  let buffer: string[] = [];
  let length = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    chapters.push({
      order: chapters.length,
      title: `Chapter ${chapters.length + 1}`,
      text: buffer.join("\n\n"),
    });
    buffer = [];
    length = 0;
  };

  for (const paragraph of paragraphs) {
    buffer.push(paragraph);
    length += paragraph.length;
    if (length >= chunkSize) flush();
  }
  flush();

  return chapters;
}

/**
 * Encrypts and persists a book for offline reading.
 *
 * @returns the number of chapters stored, so a UI can report progress.
 */
export async function downloadBookForOffline(
  input: DownloadBookInput,
): Promise<number> {
  const { bookId, title, author = null, passphrase, chapters } = input;

  if (chapters.length === 0) {
    throw new Error("Cannot save a book with no chapters.");
  }

  const salt = createSalt();

  const encryptedChapters: OfflineChapterRecord[] = chapters.map((chapter, index) => {
    const order = chapter.order ?? index;
    const { iv, ciphertext, mac } = encryptText(chapter.text, passphrase, salt);
    return {
      id: `${bookId}:${order}`,
      bookId,
      order,
      title: chapter.title ?? `Chapter ${order + 1}`,
      iv,
      ciphertext,
      mac,
    };
  });

  encryptedChapters.sort((a, b) => a.order - b.order);

  await putBookWithChapters(
    {
      bookId,
      title,
      author,
      salt,
      chapterCount: encryptedChapters.length,
      updatedAt: Date.now(),
    },
    encryptedChapters,
  );

  return encryptedChapters.length;
}
