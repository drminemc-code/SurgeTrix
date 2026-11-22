export type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'expired';

export interface VerificationToken {
  token: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createChallengeNonce(): string {
  const bytes = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  const timePart = Date.now().toString(36).slice(-4);
  return `${timePart}-${bytes}`;
}

/**
 * Generates a deterministic proof-of-interaction verification token
 * matching a Turnstile-style human check workflow.
 */
export function buildVerificationToken(
  nonce: string,
  interactionMs: number,
  now = Date.now()
): VerificationToken {
  const cleanNonce = nonce.trim() || 'default';
  const clampedMs = Math.max(120, Math.round(interactionMs));
  let hash = 2166136261;
  const seed = `surgetrix-shield:${cleanNonce}:${clampedMs}`;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const digest = (hash >>> 0).toString(36).padStart(7, '0');
  return {
    token: `st-turnstile-${cleanNonce}-${digest}`,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    nonce: cleanNonce,
  };
}

export function isVerificationTokenValid(
  record: VerificationToken | null | undefined,
  now = Date.now()
): boolean {
  if (!record || typeof record.token !== 'string') return false;
  if (!record.token.startsWith('st-turnstile-')) return false;
  return record.expiresAt > now;
}
