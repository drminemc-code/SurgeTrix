import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
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
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, ensureUserProfile, googleProvider, updateUserProfileFields } from '../firebase';
import { ThemeStyleId } from '../utils/themePresets';
import {
  AuthErrorDetails,
  mapAuthError,
  sanitizeUsername,
  validateEmailInput,
  validateUsernameInput,
} from '../utils/userValidation';
import { isOwnerUser } from '../utils/pluginMarketplace';

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
  const [resetSending, setResetSending] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [refreshingVerification, setRefreshingVerification] = useState(false);

  const [errorDetails, setErrorDetails] = useState<AuthErrorDetails | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Account edit state when signed in
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setErrorDetails(null);
  }, [initialMode]);

  useEffect(() => {
    if (user?.username) {
      setEditUsername(user.username);
    }
  }, [user?.username]);

  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname : undefined;

  const handleGoogleAuth = async () => {
    setErrorDetails(null);
    setStatusMessage('');
    setGoogleSubmitting(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await ensureUserProfile(cred.user, activeThemeId);
      if (profile) {
        onProfileUpdated(profile.username);
      }
      setStatusMessage('Signed in with Google.');
    } catch (err) {
      setErrorDetails(mapAuthError(err, currentHostname));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleGoogleRedirectFallback = async () => {
    setErrorDetails(null);
    setStatusMessage('');
    setGoogleSubmitting(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      setErrorDetails(mapAuthError(err, currentHostname));
      setGoogleSubmitting(false);
    }
  };

  const handleSwitchToGoogleFromUnverified = async () => {
    setErrorDetails(null);
    setStatusMessage('');
    setGoogleSubmitting(true);
    try {
      await signOut(auth);
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await ensureUserProfile(cred.user, activeThemeId);
      if (profile) {
        onProfileUpdated(profile.username);
      }
      setStatusMessage('Signed in and verified with Google!');
    } catch (err) {
      setErrorDetails(mapAuthError(err, currentHostname));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetails(null);
    setStatusMessage('');

    const trimmedEmail = email.trim();
    const emailErr = validateEmailInput(trimmedEmail);
    if (emailErr) {
      setErrorDetails({ message: emailErr });
      return;
    }

    if (password.length < 6) {
      setErrorDetails({ message: 'Password must be at least 6 characters.' });
      return;
    }

    if (mode === 'signup') {
      const userErr = validateUsernameInput(username);
      if (userErr) {
        setErrorDetails({ message: userErr });
        return;
      }
      if (password !== confirmPassword) {
        setErrorDetails({ message: 'Passwords do not match.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const cleanDisplay = sanitizeUsername(username);
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: cleanDisplay });
        onProfileUpdated(cleanDisplay);
        try {
          await sendEmailVerification(cred.user);
          setStatusMessage(
            `Account created for ${trimmedEmail}! Check your inbox (and spam folder) for the verification link, then click "I've verified — Refresh".`
          );
        } catch {
          setStatusMessage(
            `Account created for ${trimmedEmail}! Click "Resend email" below if you need a new verification link.`
          );
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        if (cred.user.emailVerified) {
          const profile = await ensureUserProfile(
            cred.user,
            activeThemeId,
            cred.user.displayName || undefined
          );
          if (profile) {
            onProfileUpdated(profile.username);
          }
          setStatusMessage('Signed in successfully!');
        } else {
          setStatusMessage(
            'Signed in. Verify your email address using the link in your inbox to unlock cloud sync.'
          );
        }
      }
    } catch (err) {
      setErrorDetails(mapAuthError(err, currentHostname));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorDetails(null);
    setStatusMessage('');
    const trimmedEmail = email.trim();
    const emailErr = validateEmailInput(trimmedEmail);
    if (emailErr) {
      setErrorDetails({ message: 'Enter your account email address above first so we can send a reset link.' });
      return;
    }
    setResetSending(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setStatusMessage(`Password reset email sent to ${trimmedEmail}. Check your inbox and spam folder.`);
    } catch (err) {
      setErrorDetails(mapAuthError(err, currentHostname));
    } finally {
      setResetSending(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setErrorDetails(null);
    setStatusMessage('');
    setResendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setStatusMessage('Verification email sent. Check your inbox and spam folder.');
    } catch (err) {
      setErrorDetails(mapAuthError(err, currentHostname));
    } finally {
      setResendingVerification(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!auth.currentUser) return;
    setErrorDetails(null);
    setStatusMessage('');
    setRefreshingVerification(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        await auth.currentUser.getIdToken(true);
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
        setStatusMessage('Email is not verified yet. Open the link in your inbox, then click Refresh again.');
      }
    } catch (err) {
      setErrorDetails(mapAuthError(err, currentHostname));
    } finally {
      setRefreshingVerification(false);
    }
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const errMsg = validateUsernameInput(editUsername);
    if (errMsg) {
      setErrorDetails({ message: errMsg });
      return;
    }
    setErrorDetails(null);
    setStatusMessage('');
    setSavingProfile(true);
    try {
      await updateUserProfileFields(user.uid, { username: editUsername.trim() });
      onProfileUpdated(editUsername.trim());
      setStatusMessage('Minecraft username updated.');
    } catch (err) {
      setErrorDetails(mapAuthError(err, currentHostname));
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
              {isOwnerUser(user) ? 'Verified Owner' : `${user.plan} Plan`}
            </span>
          </div>

          {!user.emailVerified && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start gap-2.5">
                <MailCheck className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed space-y-1">
                  <p className="font-semibold">Email Verification Pending</p>
                  <p>
                    Your account is created and signed in, but email verification is required before cloud sync, plugin reviews, and owner tools unlock.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRefreshVerification}
                  disabled={refreshingVerification}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingVerification ? 'animate-spin' : ''}`} />
                  <span>{refreshingVerification ? 'Checking...' : "I've verified — Refresh"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="px-3 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer disabled:opacity-60"
                >
                  {resendingVerification ? 'Sending...' : 'Resend email'}
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToGoogleFromUnverified}
                  disabled={googleSubmitting}
                  className="px-3 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer disabled:opacity-60"
                >
                  {googleSubmitting ? 'Opening Google...' : 'Use Google Sign-In instead'}
                </button>
              </div>
            </div>
          )}

          {errorDetails && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 space-y-2">
              <p>{errorDetails.message}</p>
              {errorDetails.offerRedirectFallback && (
                <button
                  type="button"
                  onClick={handleGoogleRedirectFallback}
                  className="px-3 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                >
                  Use Redirect Sign-In Instead
                </button>
              )}
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
            {isOwnerUser(user) && (
              <button
                type="button"
                onClick={() => onNavigate('/dashboard/owner')}
                className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Owner Control Panel</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('/tools')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer ${
                isOwnerUser(user) ? 'st-btn-secondary' : 'st-btn-primary'
              }`}
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
              setErrorDetails(null);
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
              setErrorDetails(null);
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
              ? 'Access your saved tool presets, plugin reviews, and owner workspace.'
              : 'Get started free — instant access with Google or create an email account.'}
          </p>
        </div>

        {/* Google Auth Primary Button — opens popup directly on click without artificial captcha gates */}
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
          <span>
            {googleSubmitting
              ? 'Opening Google...'
              : mode === 'signin'
                ? 'Sign in with Google'
                : 'Sign up with Google'}
          </span>
        </button>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-200 dark:border-white/[0.08]" />
          <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            or use email
          </span>
          <div className="flex-grow border-t border-slate-200 dark:border-white/[0.08]" />
        </div>

        {errorDetails && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 leading-relaxed space-y-2.5"
          >
            <p>{errorDetails.message}</p>
            <div className="flex flex-wrap gap-2">
              {errorDetails.offerRedirectFallback && (
                <button
                  type="button"
                  onClick={handleGoogleRedirectFallback}
                  disabled={googleSubmitting}
                  className="px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                >
                  Use Redirect Sign-In
                </button>
              )}
              {errorDetails.suggestGoogle && (
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleSubmitting}
                  className="px-3 py-1.5 st-btn-secondary text-xs font-semibold cursor-pointer"
                >
                  Continue with Google
                </button>
              )}
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
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
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetSending}
                  className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline cursor-pointer disabled:opacity-60"
                  style={{ color: 'var(--st-accent-text)' }}
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{resetSending ? 'Sending...' : 'Forgot password?'}</span>
                </button>
              )}
            </div>
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
                  setErrorDetails(null);
                  setStatusMessage('');
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
                  setErrorDetails(null);
                  setStatusMessage('');
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
