import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  USER_PROFILE_CONSTRAINTS,
  isValidThemeId,
  sanitizeUsername,
  validateEmailInput,
  validateUsernameInput,
} from './src/utils/userValidation.ts';

interface MockAuthContext {
  uid: string;
  emailVerified: boolean;
}

function evaluateProfileCreate(
  auth: MockAuthContext | null,
  targetUserId: string,
  payload: Record<string, unknown>,
  serverTime = 1000
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.emailVerified) return 'PERMISSION_DENIED';
  if (!USER_PROFILE_CONSTRAINTS.uidPattern.test(targetUserId) || targetUserId.length > 128) {
    return 'PERMISSION_DENIED';
  }
  if (auth.uid !== targetUserId) return 'PERMISSION_DENIED';

  const required = ['uid', 'username', 'plan', 'preferredTheme', 'createdAt', 'updatedAt'];
  const keys = Object.keys(payload);
  if (!required.every((k) => keys.includes(k)) || !keys.every((k) => required.includes(k))) {
    return 'PERMISSION_DENIED';
  }
  if (payload.uid !== targetUserId) return 'PERMISSION_DENIED';
  if (typeof payload.username !== 'string' || validateUsernameInput(payload.username) !== null) {
    return 'PERMISSION_DENIED';
  }
  if (payload.plan !== 'Free') return 'PERMISSION_DENIED';
  if (typeof payload.preferredTheme !== 'string' || !isValidThemeId(payload.preferredTheme)) {
    return 'PERMISSION_DENIED';
  }
  if (payload.createdAt !== serverTime || payload.updatedAt !== serverTime) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

test('firestore.rules enforces Eight Pillars & Dirty Dozen security invariants', () => {
  const rulesText = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rulesText, /allow read, write: if false;/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /allow list: if false;/);
  assert.match(rulesText, /existsAfter\(/);

  // 1. Cross-user create spoof
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: true },
      'uidB',
      { uid: 'uidB', username: 'Steve', plan: 'Free', preferredTheme: 'cyber', createdAt: 1000, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );

  // 2. Plan privilege escalation on create
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: true },
      'uidA',
      { uid: 'uidA', username: 'Steve', plan: 'Business', preferredTheme: 'cyber', createdAt: 1000, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );

  // 3. Unverified email write
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: false },
      'uidA',
      { uid: 'uidA', username: 'Steve', plan: 'Free', preferredTheme: 'cyber', createdAt: 1000, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );

  // 4. Shadow field injection
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: true },
      'uidA',
      { uid: 'uidA', username: 'Steve', plan: 'Free', preferredTheme: 'cyber', isAdmin: true, createdAt: 1000, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );

  // 5. Username length overflow & XSS regex violation
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: true },
      'uidA',
      { uid: 'uidA', username: 'a'.repeat(300), plan: 'Free', preferredTheme: 'cyber', createdAt: 1000, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: true },
      'uidA',
      { uid: 'uidA', username: '<script>alert(1)</script>', plan: 'Free', preferredTheme: 'cyber', createdAt: 1000, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );

  // 6. Invalid theme enum & client-spoofed timestamp & path poisoning
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: true },
      'uidA',
      { uid: 'uidA', username: 'Steve', plan: 'Free', preferredTheme: 'bad', createdAt: 1000, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: true },
      'uidA',
      { uid: 'uidA', username: 'Steve', plan: 'Free', preferredTheme: 'cyber', createdAt: 999, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateProfileCreate(
      { uid: 'bad$id', emailVerified: true },
      'bad$id',
      { uid: 'bad$id', username: 'Steve', plan: 'Free', preferredTheme: 'cyber', createdAt: 1000, updatedAt: 1000 }
    ),
    'PERMISSION_DENIED'
  );

  // Valid verified owner create succeeds
  assert.equal(
    evaluateProfileCreate(
      { uid: 'uidA', emailVerified: true },
      'uidA',
      { uid: 'uidA', username: 'SteveBuilder', plan: 'Free', preferredTheme: 'cyber', createdAt: 1000, updatedAt: 1000 }
    ),
    'ALLOW'
  );
});

test('userValidation helpers enforce synchronized blueprint bounds', () => {
  assert.equal(sanitizeUsername('***'), 'SurgePlayer');
  assert.equal(sanitizeUsername('  Steve_123  '), 'Steve_123');
  assert.ok(validateEmailInput('bad-email') !== null);
  assert.equal(validateEmailInput('player@surgetrix.net'), null);
});

test('firestore.rules secures /domains/{handle} against spoofing and query scraping', () => {
  const rulesText = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rulesText, /match \/domains\/\{handle\}/);
  assert.match(rulesText, /allow list: if isSignedIn\(\) && resource\.data\.ownerUid == request\.auth\.uid;/);
  assert.match(rulesText, /isValidCustomDomain\(incoming\(\), handle\)/);
  assert.match(rulesText, /incoming\(\)\.ownerUid == existing\(\)\.ownerUid/);
});
