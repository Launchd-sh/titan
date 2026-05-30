import { createHash } from 'crypto'

export function generateSessionToken(): { raw: string; hashed: string } {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const raw = Buffer.from(bytes).toString('base64url')
  return { raw, hashed: hashToken(raw) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
