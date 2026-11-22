import { ThemeStyleId } from './themePresets';

/**
 * Synchronized with firebase-blueprint.json & firestore.rules
 */
export const USER_PROFILE_CONSTRAINTS = {
  uidPattern: /^[a-zA-Z0-9_-]+$/,
  uidMaxLength: 128,
  usernameMinLength: 2,
  usernameMaxLength: 32,
  usernamePattern: /^[a-zA-Z0-9_ .-]+$/,
  emailMinLength: 3,
  emailMaxLength: 160,
  allowedPlans: ['Free', 'Plus', 'Pro', 'Business'] as const,
  allowedThemes: ['cyber', 'obsidian', 'bedrock', 'daylight'] as const,
};

export function sanitizeUsername(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_ .-]/g, '')
    .slice(0, USER_PROFILE_CONSTRAINTS.usernameMaxLength);
  return cleaned.length >= USER_PROFILE_CONSTRAINTS.usernameMinLength ? cleaned : 'SurgePlayer';
}

export function validateUsernameInput(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length < USER_PROFILE_CONSTRAINTS.usernameMinLength) {
    return `Username must be at least ${USER_PROFILE_CONSTRAINTS.usernameMinLength} characters.`;
  }
  if (trimmed.length > USER_PROFILE_CONSTRAINTS.usernameMaxLength) {
    return `Username must be at most ${USER_PROFILE_CONSTRAINTS.usernameMaxLength} characters.`;
  }
  if (!USER_PROFILE_CONSTRAINTS.usernamePattern.test(trimmed)) {
    return 'Username can only contain letters, numbers, spaces, underscores, dots, and hyphens.';
  }
  return null;
}

export function validateEmailInput(email: string): string | null {
  const trimmed = email.trim();
  if (
    trimmed.length < USER_PROFILE_CONSTRAINTS.emailMinLength ||
    trimmed.length > USER_PROFILE_CONSTRAINTS.emailMaxLength ||
    !trimmed.includes('@') ||
    !trimmed.includes('.')
  ) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function isValidThemeId(theme: string): theme is ThemeStyleId {
  return (USER_PROFILE_CONSTRAINTS.allowedThemes as readonly string[]).includes(theme);
}
