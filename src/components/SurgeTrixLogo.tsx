import React from 'react';

interface SurgeTrixLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export const SurgeTrixLogo: React.FC<SurgeTrixLogoProps> = ({
  size = 28,
  showWordmark = true,
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="surgetrix-grad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--st-accent)" />
            <stop offset="55%" stopColor="var(--st-accent-hover)" />
            <stop offset="100%" stopColor="var(--st-success)" />
          </linearGradient>
        </defs>
        <path
          d="M18 2.5L31 10V26L18 33.5L5 26V10L18 2.5Z"
          fill="var(--st-surface)"
          stroke="url(#surgetrix-grad)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M22.5 9.5H14.5L11.5 16.5H17.5L13.5 26.5L24.5 17.5H18.2L22.5 9.5Z"
          fill="url(#surgetrix-grad)"
        />
      </svg>
      {showWordmark && (
        <span
          className="text-[17px] font-bold tracking-tight whitespace-nowrap shrink-0 st-display"
          style={{ color: 'var(--st-text)' }}
        >
          SurgeTrix
        </span>
      )}
    </span>
  );
};
