/**
 * Offline-encryption self-test. Runs with plain Node (no browser, no cloud):
 *
 *   npm run test:offline
 *
 * Verifies the fail-closed guarantees of lib/offline/crypto.ts:
 *   1. encrypt -> decrypt round-trips the exact bytes
 *   2. the wrong passphrase is rejected (never yields garbage plaintext)
 *   3. tampered ciphertext is rejected by the MAC
 *   4. a fresh IV per encryption (no deterministic ciphertext)
 *   5. the MAC is a full 256-bit value
 */
import {
  createSalt,
  decryptText,
  encryptText,
  type EncryptedPayload,
} from "@/lib/offline/crypto";

let failures = 0;
function check(name: string, condition: boolean) {
  const ok = condition ? "PASS" : "FAIL";
  if (!condition) failures += 1;
  console.log(`  [${ok}] ${name}`);
}

const passphrase = "server-issued-key::demo-user";
const salt = createSalt();
const plaintext = "Chapter 1 — the quick brown fox jumps over the lazy dog. 🦊";

console.log("offline crypto self-test");

const payload = encryptText(plaintext, passphrase, salt);
check("round-trips plaintext", decryptText(payload.ciphertext, payload.iv, payload.mac, passphrase, salt) === plaintext);

let wrongKeyRejected = false;
try {
  decryptText(payload.ciphertext, payload.iv, payload.mac, "a-different-key", salt);
} catch {
  wrongKeyRejected = true;
}
check("rejects wrong passphrase", wrongKeyRejected);

let tamperRejected = false;
try {
  const bytes = Buffer.from(payload.ciphertext, "base64");
  bytes[0] ^= 0x01;
  const tampered = bytes.toString("base64");
  decryptText(tampered, payload.iv, payload.mac, passphrase, salt);
} catch {
  tamperRejected = true;
}
check("rejects tampered ciphertext (MAC)", tamperRejected);

let ivChangedRejected = false;
try {
  const other: EncryptedPayload = encryptText(plaintext, passphrase, salt);
  check("fresh IV per encryption", other.iv !== payload.iv);
  check("fresh ciphertext per encryption", other.ciphertext !== payload.ciphertext);
  check("ciphertext differs from plaintext", !payload.ciphertext.includes(plaintext));
} catch {
  ivChangedRejected = true;
}
check("independent encryptions succeed", !ivChangedRejected);

check("MAC is 256 bits (32 bytes)", Buffer.from(payload.mac, "base64").length === 32);
check("IV is 128 bits (16 bytes)", Buffer.from(payload.iv, "base64").length === 16);

console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
