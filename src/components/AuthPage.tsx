import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Wrench,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, ensureUserProfile, googleProvider, updateUserProfileFields } from '../firebase';
import { ThemeStyleId } from '../utils/themePresets';
import { validateEmailInput, validateUsernameInput } from '../utils/userValidation';
import { VerificationToken, isVerificationTokenValid } from '../utils/botVerification';
import { HumanVerificationWidget } from './HumanVerificationWidget';

export interface AuthUserState {
  uid: string;
  username: string;
  email: string;
  plan: string;
  emailVerified: boolean;
}

interface AuthPageProps {
  initialMode: 'signin' | 'signup';
  user: AuthUserState | null;
  authLoading: boolean;
  activeThemeId: ThemeStyleId;
  onProfileUpdated: (username: string) => void;
  onNavigate: (path: string) => void;
}

function mapAuthError(err: unknown): { message: string; needsEmailProviderNote?: boolean } {
  const code = (err as { code?: string })?.code || '';
  if (code === 'auth/operation-not-allowed') {
    return {
      message:
        'Email/Password sign-in is not enabled in your Firebase Console yet. Enable it under Authentication -> Sign-in method -> Email/Password, or use Continue with Google below.',
      needsEmailProviderNote: true,
    };
  }
  if (code === 'auth/email-already-in-use') {
    return { message: 'An account with this email already exists. Try signing in instead.' };
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return { message: 'Incorrect email or password. Please check your credentials and try again.' };
  }
  if (code === 'auth/weak-password') {
    return { message: 'Password must be at least 6 characters long.' };
  }
  if (code === 'auth/popup-closed-by-user') {
    return { message: 'Google sign-in popup was closed before completing.' };
  }
  if (code === 'auth/unauthorized-domain') {
    return { message: 'This domain is not authorized for Google Sign-In in Firebase Console.' };
  }
  return {
    message: err instanceof Error ? err.message : 'Authentication failed. Please try again.',
  };
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode,
  user,
  authLoading,
  activeThemeId,
  onProfileUpdated,
  onNavigate,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [verificationToken, setVerificationToken] = useState<VerificationToken | null>(null);
  const [verifyResetCounter, setVerifyResetCounter] = useState(0);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Account edit state when signed in
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setStatusMessage('');
    setVerifyResetCounter((c) => c + 1);
  }, [initialMode]);

  useEffect(() => {
    if (user?.username) {
      setEditUsername(user.username);
    }
  }, [user?.username]);

  const handleGoogleAuth = async () => {
    if (!isVerificationTokenValid(verificationToken)) {
      setError('Please complete the human verification check first.');
      return;
    }
    setError('');
    setStatusMessage('');
    setGoogleSubmitting(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(cred.user, activeThemeId);
    } catch (err) {
      setError(mapAuthError(err).message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    if (!isVerificationTokenValid(verificationToken)) {
      setError('Please complete the human verification check before continuing.');
      return;
    }

    const emailErr = validateEmailInput(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      const userErr = validateUsernameInput(username);
      if (userErr) {
        setError(userErr);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: username.trim() });
        await sendEmailVerification(cred.user);
        setStatusMessage(
          'Account created! Check your inbox for the verification link to sync your SurgeTrix cloud profile.'
        );
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (cred.user.emailVerified) {
          await ensureUserProfile(cred.user, activeThemeId);
        }
      }
    } catch (err) {
      setError(mapAuthError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setError('');
    setStatusMessage('');
    try {
      await sendEmailVerification(auth.currentUser);
      setStatusMessage('Verification email sent. Check your inbox and spam folder.');
    } catch (err) {
      setError(mapAuthError(err).message);
    }
  };

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) return;
    setError('');
    setStatusMessage('');
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        const profile = await ensureUserProfile(
          auth.currentUser,
          activeThemeId,
          auth.currentUser.displayName || undefined
        );
        if (profile) {
          onProfileUpdated(profile.username);
        }
        setStatusMessage('Email verified and cloud profile synced!');
      } else {
        setStatusMessage('Email is not verified yet. Open the link in your inbox, then refresh again.');
      }
    } catch (err) {
      setError(mapAuthError(err).message);
    }
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const errMsg = validateUsernameInput(editUsername);
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setError('');
    setStatusMessage('');
    setSavingProfile(true);
    try {
      await updateUserProfileFields(user.uid, { username: editUsername.trim() });
      onProfileUpdated(editUsername.trim());
      setStatusMessage('Minecraft username updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--st-accent-text)' }} />
        <p className="text-sm text-slate-600 dark:text-slate-400">Checking account session...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-lg mx-auto px-6 py-14 space-y-6">
        <div className="st-card p-7 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--st-success)' }}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>SurgeTrix Account</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {user.username}
              </h1>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {user.email}
              </p>
            </div>
            <span
              className="px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{
                backgroundColor: 'var(--st-accent-soft)',
                color: 'var(--st-accent-text)',
                border: '1px solid var(--st-border-strong)',
              }}
            >
              {user.plan} Plan
            </span>
          </div>

          {!user.emailVerified && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start gap-2.5">
                <MailCheck className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  Your account is signed in, but email verification is required before cloud profile sync is enabled.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRefreshVerification}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>I&apos;ve verified — Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="px-3 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer"
                >
                  Resend email
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {user.emailVerified && (
            <form onSubmit={handleSaveUsername} className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/[0.08]">
              <label
                htmlFor="account-username"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Minecraft Username
              </label>
              <div className="flex gap-2">
                <input
                  id="account-username"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="flex-1 px-3.5 py-2 st-surface-inset text-sm text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/tools')}
              className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>Open Tools</span>
            </button>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-secondary text-sm font-medium cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <div className="st-card p-6 sm:p-7 space-y-5 shadow-xl">
        {/* Sign In / Sign Up Mode Switcher */}
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="grid grid-cols-2 gap-1 p-1 st-surface-inset"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            onClick={() => {
              setMode('signin');
              setError('');
              setStatusMessage('');
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'st-btn-primary'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              setError('');
              setStatusMessage('');
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'st-btn-primary'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'signin' ? 'Sign in to SurgeTrix' : 'Create your SurgeTrix account'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {mode === 'signin'
              ? 'Access your saved tool presets, security settings, and style preferences.'
              : 'Get started free — save configurations, sync themes, and vote on upcoming tools.'}
          </p>
        </div>

        {/* Google Auth Primary Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={googleSubmitting || submitting}
          className="w-full py-2.5 px-4 st-btn-secondary text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
        >
          {googleSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.91 6.72-4.91Z"
              />
            </svg>
          )}
          <span>{mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}</span>
        </button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-200 dark:border-white/[0.08]" />
          <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            or use email
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-white/[0.08]" />
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 leading-relaxed"
          >
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label
                htmlFor="auth-username"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Minecraft Username
              </label>
              <input
                id="auth-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="SteveBuilder"
                className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signin' ? 'Enter your password' : 'At least 6 characters'}
                className="w-full px-3.5 py-2.5 pr-10 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="auth-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3.5 py-2.5 st-surface-inset text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--st-accent)]/40"
              />
            </div>
          )}

          <HumanVerificationWidget
            onVerified={setVerificationToken}
            resetTrigger={verifyResetCounter}
            label="Verify you are human"
          />

          <button
            type="submit"
            disabled={submitting || googleSubmitting}
            className="w-full py-2.5 st-btn-primary text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              mode === 'signup' && <UserPlus className="w-4 h-4" />
            )}
            <span>{mode === 'signin' ? 'Sign In' : 'Create Free Account'}</span>
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 dark:text-slate-400">
          {mode === 'signin' ? (
            <>
              New to SurgeTrix?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  onNavigate('/signup');
                }}
                className="font-semibold hover:underline cursor-pointer"
                style={{ color: 'var(--st-accent-text)' }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  onNavigate('/login');
                }}
                className="font-semibold hover:underline cursor-pointer"
                style={{ color: 'var(--st-accent-text)' }}
              >
                Sign in instead
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
