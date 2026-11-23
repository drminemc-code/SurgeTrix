import React, { useEffect, useState } from 'react';

interface PluginLogoProps {
  name: string;
  iconUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PluginLogoProps['size']>, string> = {
  sm: 'w-9 h-9 rounded-lg text-xs',
  md: 'w-11 h-11 rounded-lg text-sm',
  lg: 'w-14 h-14 rounded-xl text-base',
  xl: 'w-16 h-16 rounded-xl text-xl',
};

export const PluginLogo: React.FC<PluginLogoProps> = ({
  name,
  iconUrl,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [iconUrl]);

  const cleanUrl = typeof iconUrl === 'string' ? iconUrl.trim() : '';
  const initials = (name.trim() || 'PL').slice(0, 2).toUpperCase();
  const sizeClass = SIZE_CLASSES[size];

  if (cleanUrl && !imgFailed) {
    return (
      <div
        className={`${sizeClass} overflow-hidden shrink-0 flex items-center justify-center ${className}`}
        style={{
          backgroundColor: 'var(--st-surface-inset)',
          border: '1px solid var(--st-border-strong)',
        }}
      >
        <img
          src={cleanUrl}
          alt={`${name || 'Plugin'} icon`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center font-bold shrink-0 select-none ${className}`}
      style={{
        backgroundColor: 'var(--st-accent-soft)',
        color: 'var(--st-accent-text)',
        border: '1px solid var(--st-border-strong)',
      }}
      aria-label={`${name || 'Plugin'} monogram`}
    >
      {initials}
    </div>
  );
};
