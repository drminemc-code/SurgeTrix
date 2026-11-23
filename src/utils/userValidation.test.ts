import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapAuthError,
  sanitizeUsername,
  validateEmailInput,
  validateUsernameInput,
} from './userValidation';

test('validateUsernameInput & sanitizeUsername enforce ruleset boundaries', () => {
  assert.equal(validateUsernameInput('Steve_Builder'), null);
  assert.ok(validateUsernameInput('A'));
  assert.ok(validateUsernameInput('A'.repeat(33)));
  assert.equal(sanitizeUsername('  $#@ '), 'SurgePlayer');
  assert.equal(sanitizeUsername('Steve_Builder'), 'Steve_Builder');
});

test('validateEmailInput validates email shape', () => {
  assert.equal(validateEmailInput('drminemc@gmail.com'), null);
  assert.ok(validateEmailInput('notanemail'));
});

test('mapAuthError maps Firebase Auth codes clearly with fallback flags', () => {
  const op = mapAuthError({ code: 'auth/operation-not-allowed' });
  assert.equal(op.needsEmailProviderNote, true);
  assert.equal(op.suggestGoogle, true);

  const blocked = mapAuthError({ code: 'auth/popup-blocked' });
  assert.equal(blocked.offerRedirectFallback, true);
  assert.match(blocked.message, /Redirect/i);

  const unauthDomain = mapAuthError({ code: 'auth/unauthorized-domain' }, 'minevex.site');
  assert.match(unauthDomain.message, /minevex\.site/);

  const rawJson = mapAuthError(new Error('{"error":"Missing or insufficient permissions."}'));
  assert.doesNotMatch(rawJson.message, /^{/);
});
