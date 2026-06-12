import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getKey(): Buffer {
  const hex = process.env.BOOKING_SECRET;
  if (hex && hex.length === 64) return Buffer.from(hex, 'hex');
  // Dev-only fallback — set BOOKING_SECRET in .env for production
  return Buffer.alloc(32, 0xab);
}

/** Encrypts a booking ref/id into a URL-safe token. */
export function encryptBookingRef(ref: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(ref, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // layout: [12 iv][16 auth-tag][ciphertext]
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

/** Decrypts a token produced by encryptBookingRef. Returns null if tampered. */
export function decryptBookingRef(token: string): string | null {
  try {
    const key = getKey();
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 29) return null; // 12 + 16 + 1 minimum
    const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const dec = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}
