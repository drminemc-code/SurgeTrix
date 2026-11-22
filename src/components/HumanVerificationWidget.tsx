import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  VerificationStatus,
  VerificationToken,
  buildVerificationToken,
  createChallengeNonce,
} from '../utils/botVerification';

interface HumanVerificationWidgetProps {
  onVerified: (token: VerificationToken | null) => void;
  resetTrigger?: number;
  label?: string;
}

export const HumanVerificationWidget: React.FC<HumanVerificationWidgetProps> = ({
  onVerified,
  resetTrigger = 0,
  label = 'Verify you are human',
}) => {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [nonce, setNonce] = useState<string>(() => createChallengeNonce());
  const mountTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setStatus('idle');
    setNonce(createChallengeNonce());
    mountTimeRef.current = Date.now();
    onVerified(null);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [resetTrigger]);

  const startVerification = () => {
    if (status === 'verifying' || status === 'verified') return;
    setStatus('verifying');
    const elapsed = Date.now() - mountTimeRef.current;

    timerRef.current = window.setTimeout(() => {
      const token = buildVerificationToken(nonce, elapsed);
      setStatus('verified');
      onVerified(token);
    }, 520);
  };

  const handleReset = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setStatus('idle');
    setNonce(createChallengeNonce());
    mountTimeRef.current = Date.now();
    onVerified(null);
  };

  return (
    <div
      className="st-surface-inset px-3.5 py-3 flex items-center justify-between gap-3"
      role="region"
      aria-label="Human verification check"
    >
      <div className="flex items-center gap-3 min-w-0">
        {status === 'idle' && (
          <button
            type="button"
            role="checkbox"
            aria-checked="false"
            aria-label={label}
            onClick={startVerification}
            className="w-7 h-7 rounded-md border-2 border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900 hover:border-[var(--st-accent)] transition-colors flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-2"
          />
        )}

        {status === 'verifying' && (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--st-accent-soft)' }}
            aria-label="Verifying browser session"
          >
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: 'var(--st-accent-text)' }}
            />
          </div>
        )}

        {status === 'verified' && (
          <div
            className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0"
            role="checkbox"
            aria-checked="true"
            aria-label="Verification complete"
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        )}

        <div className="min-w-0" aria-live="polite">
          <p className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100 leading-tight">
            {status === 'idle' && label}
            {status === 'verifying' && 'Verifying...'}
            {status === 'verified' && 'Success! Human verified'}
          </p>
          {status === 'verified' && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:underline mt-0.5 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Re-verify</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloudflare Turnstile-inspired right security brand badge */}
      <div className="flex flex-col items-end shrink-0 text-right select-none">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
          <span>Turnstile</span>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
          SurgeShield Bot Check
        </span>
      </div>
    </div>
  );
};
