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

export interface AuthErrorDetails {
  message: string;
  needsEmailProviderNote?: boolean;
  suggestGoogle?: boolean;
  offerRedirectFallback?: boolean;
}

export function mapAuthError(err: unknown, currentHostname?: string): AuthErrorDetails {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return {
        message:
          'Email/Password sign-in is disabled in Firebase Console. Enable Authentication -> Sign-in method -> Email/Password, or use Continue with Google.',
        needsEmailProviderNote: true,
        suggestGoogle: true,
      };
    case 'auth/email-already-in-use':
      return {
        message: 'An account with this email already exists. Try signing in or using Google.',
        suggestGoogle: true,
      };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return {
        message: 'Incorrect email or password. Double-check your credentials, reset your password, or sign in with Google.',
        suggestGoogle: true,
      };
    case 'auth/invalid-email':
      return {
        message: 'That email address format is invalid. Please check and try again.',
      };
    case 'auth/weak-password':
      return {
        message: 'Password must be at least 6 characters long.',
      };
    case 'auth/popup-blocked':
      return {
        message: 'Your browser or preview frame blocked the Google sign-in popup. Allow popups for this site or use Redirect Sign-In below.',
        offerRedirectFallback: true,
      };
    case 'auth/popup-closed-by-user':
      return {
        message: 'Google sign-in window was closed before completing. Click the button again to retry.',
      };
    case 'auth/cancelled-popup-request':
      return {
        message: 'Only one sign-in window can be open at a time. Please wait a moment and try again.',
      };
    case 'auth/unauthorized-domain':
      return {
        message: currentHostname
          ? `Domain "${currentHostname}" is not yet authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.`
          : 'This domain is not authorized for Google Sign-In in Firebase Console -> Authentication -> Settings -> Authorized domains.',
      };
    case 'auth/account-exists-with-different-credential':
      return {
        message: 'An account already exists with this email using another sign-in method. Try signing in with Google or your original method.',
        suggestGoogle: true,
      };
    case 'auth/too-many-requests':
      return {
        message: 'Too many sign-in attempts in a short period. Please wait a minute and try again.',
      };
    case 'auth/network-request-failed':
      return {
        message: 'Network request failed while reaching authentication servers. Check your connection and retry.',
      };
    case 'auth/user-disabled':
      return {
        message: 'This account has been disabled by an administrator.',
      };
    default: {
      const rawMessage = err instanceof Error ? err.message : '';
      if (rawMessage.trim().startsWith('{')) {
        return {
          message: 'Profile sync encountered a database permission issue. Please try signing in again.',
        };
      }
      return {
        message: rawMessage || 'Authentication failed. Please try again.',
      };
    }
  }
}

