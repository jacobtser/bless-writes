import { decryptText } from "./crypto";
import { getOfflineBook, getOfflineChapter } from "./idb";
import type { OfflineReaderState, OfflineReaderStatus } from "./types";

/**
 * OfflineRuntime — the imperative heart of offline reading.
 *
 * Responsibilities:
 *   - open a saved book manifest from IndexedDB,
 *   - decrypt *only* the chapter currently on screen,
 *   - paint it into a caller-provided DOM container as text nodes,
 *   - overwrite/discard plaintext on every navigation and on destroy.
 *
 * The runtime never receives the passphrase from a prop at paint time — the key
 * is derived per navigation inside `crypto.ts`. Plaintext exists only as the
 * `plaintext` field for the lifetime of the active chapter.
 */

export interface OfflineRuntimeOptions {
  bookId: string;
  passphrase: string;
  onStateChange?: (state: OfflineReaderState) => void;
}

export class OfflineRuntime {
  private readonly bookId: string;
  private readonly passphrase: string;
  private readonly onStateChange?: (state: OfflineReaderState) => void;

  private container: HTMLElement | null = null;
  private title = "Protected reader";
  private salt: string | null = null;
  private total = 0;
  private index = 0;
  private status: OfflineReaderStatus = "idle";
  private error: string | null = null;

  /** The one and only place decrypted text lives. Overwritten on navigate. */
  private plaintext: string | null = null;

  constructor(options: OfflineRuntimeOptions) {
    this.bookId = options.bookId;
    this.passphrase = options.passphrase;
    this.onStateChange = options.onStateChange;
  }

  getState(): OfflineReaderState {
    return {
      status: this.status,
      title: this.title,
      chapterIndex: this.index,
      totalChapters: this.total,
      error: this.error,
    };
  }

  attach(container: HTMLElement): void {
    this.container = container;
    this.paint();
  }

  async open(): Promise<void> {
    this.setStatus("loading");
    try {
      const book = await getOfflineBook(this.bookId);
      if (!book) {
        this.title = "Not saved offline";
        this.setStatus("unavailable");
        return;
      }
      this.title = book.title || "Protected reader";
      this.salt = book.salt;
      this.total = book.chapterCount;
      await this.goTo(0);
    } catch (cause) {
      this.error = toMessage(cause, "Failed to open the offline copy.");
      this.setStatus("error");
    }
  }

  async goTo(order: number): Promise<void> {
    if (!this.salt || this.total === 0) return;
    const clamped = Math.min(Math.max(0, order), this.total - 1);

    try {
      const record = await getOfflineChapter(this.bookId, clamped);
      if (!record) {
        this.error = "Chapter missing from the offline store.";
        this.setStatus("error");
        return;
      }
      this.index = clamped;
      this.plaintext = decryptText(
        record.ciphertext,
        record.iv,
        record.mac,
        this.passphrase,
        this.salt,
      );
      this.setStatus("ready");
    } catch (cause) {
      this.plaintext = null;
      this.error = toMessage(cause, "This offline copy could not be decrypted.");
      this.setStatus("error");
    }
  }

  next(): Promise<void> {
    return this.goTo(this.index + 1);
  }

  prev(): Promise<void> {
    return this.goTo(this.index - 1);
  }

  private paint(): void {
    const container = this.container;
    if (!container) return;

    // Rebuild with DOM nodes only — never innerHTML — so stored text cannot
    // inject markup. `textContent` escapes everything.
    container.replaceChildren();
    if (this.status !== "ready" || this.plaintext == null) return;

    const blocks = this.plaintext.split(/\n{2,}/);
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      const paragraph = document.createElement("p");
      paragraph.textContent = trimmed;
      container.appendChild(paragraph);
    }
  }

  private setStatus(status: OfflineReaderStatus): void {
    this.status = status;
    if (status !== "error") this.error = null;
    this.emit();
  }

  private emit(): void {
    this.onStateChange?.(this.getState());
  }

  /** Zeros the volatile plaintext and clears the painted DOM. */
  destroy(): void {
    this.plaintext = null;
    this.container?.replaceChildren();
    this.container = null;
  }
}

function toMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
