import CryptoJS from "crypto-js";
import { constantTimeEqual } from "@/lib/constant-time";

/**
 * Crypto primitives for the offline engine.
 *
 * Construction: **encrypt-then-MAC**.
 *   - Key material is derived with PBKDF2(SHA-256) from the passphrase + a
 *     per-book random salt, expanded to 512 bits and split into an independent
 *     256-bit AES key and 256-bit HMAC key (domain separation by position).
 *   - Each chapter is encrypted with AES-256-CBC under a fresh random IV, then
 *     authenticated with HMAC-SHA256 over the ciphertext.
 *
 * The MAC is what makes this fail closed: CBC alone has no integrity, so a
 * corrupted row or a guessed key could decrypt to silent garbage. We verify the
 * HMAC (constant-time) *before* decrypting, so tampering is always detected.
 *
 * Key derivation parameters are exported as constants so they can be tuned in
 * exactly one place.
 */

export const PBKDF2_ITERATIONS = 120_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 16;

const AES_KEY_WORDS = 256 / 32; // 8 words = 256 bits
const MAC_KEY_WORDS = 256 / 32; // 8 words
const DERIVED_WORDS = AES_KEY_WORDS + MAC_KEY_WORDS; // 512 bits total

const toBase64 = (wordArray: CryptoJS.lib.WordArray): string =>
  wordArray.toString(CryptoJS.enc.Base64);

const fromBase64 = (value: string): CryptoJS.lib.WordArray =>
  CryptoJS.enc.Base64.parse(value);

/** Generates a fresh base64-encoded random salt. */
export function createSalt(): string {
  return toBase64(CryptoJS.lib.WordArray.random(SALT_BYTES));
}

/** Generates a fresh base64-encoded random IV. */
export function createIv(): string {
  return toBase64(CryptoJS.lib.WordArray.random(IV_BYTES));
}

export interface DerivedKeys {
  encKey: CryptoJS.lib.WordArray;
  macKey: CryptoJS.lib.WordArray;
}

/**
 * Derives the AES + HMAC keys from the passphrase and a base64 salt. The salt
 * is public (it lives beside the ciphertext); the passphrase is not.
 */
export function deriveKeys(passphrase: string, saltBase64: string): DerivedKeys {
  const derived = CryptoJS.PBKDF2(passphrase, fromBase64(saltBase64), {
    keySize: DERIVED_WORDS,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });

  const words = derived.words;
  return {
    encKey: CryptoJS.lib.WordArray.create(words.slice(0, AES_KEY_WORDS), 256 / 8),
    macKey: CryptoJS.lib.WordArray.create(words.slice(AES_KEY_WORDS, DERIVED_WORDS), 256 / 8),
  };
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  mac: string;
}

/** Encrypts UTF-8 text with a random IV and appends an integrity tag. */
export function encryptText(
  text: string,
  passphrase: string,
  saltBase64: string,
): EncryptedPayload {
  const { encKey, macKey } = deriveKeys(passphrase, saltBase64);
  const iv = CryptoJS.lib.WordArray.random(IV_BYTES);
  const encrypted = CryptoJS.AES.encrypt(text, encKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  const mac = CryptoJS.HmacSHA256(ciphertext, macKey).toString(CryptoJS.enc.Base64);

  return { iv: toBase64(iv), ciphertext, mac };
}

/**
 * Verifies the MAC, then decrypts. Throws on a wrong key or tampered data so
 * callers fail closed instead of rendering garbage.
 */
export function decryptText(
  ciphertextBase64: string,
  ivBase64: string,
  macBase64: string,
  passphrase: string,
  saltBase64: string,
): string {
  const { encKey, macKey } = deriveKeys(passphrase, saltBase64);

  const expectedMac = CryptoJS.HmacSHA256(ciphertextBase64, macKey).toString(CryptoJS.enc.Base64);
  if (!constantTimeEqual(macBase64, expectedMac)) {
    throw new Error("Integrity check failed — this offline copy was altered.");
  }

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: fromBase64(ciphertextBase64),
  });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, encKey, {
    iv: fromBase64(ivBase64),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const text = decrypted.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error("Decryption failed — invalid key or corrupted data.");
  return text;
}
