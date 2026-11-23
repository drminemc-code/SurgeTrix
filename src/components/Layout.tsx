import React, { useEffect, useRef, useState } from 'react';
import {
  Blocks,
  BookOpen,
  ChevronDown,
  Crown,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Palette,
  Puzzle,
  Search,
  Server,
  Shield,
  Sparkles,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { SurgeTrixLogo } from './SurgeTrixLogo';
import { THEME_PRESETS, ThemePreset, ThemeStyleId } from '../utils/themePresets';
import { isOwnerUser } from '../utils/pluginMarketplace';

export interface LayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (q: string) => void;
  user: { username: string; plan: string; email?: string; emailVerified?: boolean } | null;
  onLogout: () => void;
  activeTheme: ThemePreset;
  onSelectTheme: (id: ThemeStyleId) => void;
  children: React.ReactNode;
}

const SIDEBAR_NAV_ITEMS = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Ask AI', path: '/assistant', icon: Sparkles },
  { label: 'Tools', path: '/tools', icon: Wrench },
  { label: 'Advanced Tools', path: '/advanced-tools', icon: Sparkles },
  { label: 'Servers', path: '/servers', icon: Server },
  { label: 'Plugin', path: '/plugin', icon: Puzzle },
  { label: 'Mods', path: '/mods', icon: Blocks },
  { label: 'Resources', path: '/resources', icon: Package },
  { label: 'Guides', path: '/guides', icon: BookOpen },
  { label: 'Community', path: '/community', icon: MessageSquare },
  { label: 'Bash Protect', path: '/bash/', icon: Shield },
  { label: 'Pricing', path: '/pricing', icon: Crown },
];

export const Layout: React.FC<LayoutProps> = ({
  currentPath,
  onNavigate,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  user,
  onLogout,
  activeTheme,
  onSelectTheme,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [cookieChoice, setCookieChoice] = useState<string | null>(() => {
    try {
      return localStorage.getItem('surgetrix_cookie_choice');
    } catch {
      return null;
    }
  });
  const stylePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!styleMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (stylePopoverRef.current && !stylePopoverRef.current.contains(e.target as Node)) {
        setStyleMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStyleMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [styleMenuOpen]);

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setStyleMenuOpen(false);
    onNavigate(path);
  };

  const handleCookieSave = (choice: 'accepted' | 'essential') => {
    try {
      localStorage.setItem('surgetrix_cookie_choice', choice);
    } catch {
      // ignore storage failure
    }
    setCookieChoice(choice);
  };

  const isActive = (itemPath: string) => {
    const normalizedItem = itemPath.replace(/\/+$/, '') || '/';
    const normalizedCurrent = currentPath.replace(/\/+$/, '') || '/';
    if (normalizedItem === '/') return normalizedCurrent === '/';
    return (
      normalizedCurrent === normalizedItem ||
      normalizedCurrent.startsWith(normalizedItem + '/')
    );
  };

  const handleTopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchQuery);
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--st-bg)', color: 'var(--st-text)' }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg st-btn-primary"
      >
        Skip to content
      </a>

      {/* Persistent Left Sidebar (Minevex Shell) */}
      <aside
        aria-label="Sidebar"
        className="hidden lg:flex lg:flex-col w-60 shrink-0 sticky top-0 h-screen overflow-y-auto px-3 py-4"
        style={{
          backgroundColor: 'var(--st-sidebar)',
          borderRight: '1px solid var(--st-border)',
        }}
      >
        <div className="px-2 pb-4">
          <a
            href="/"
            aria-label="SurgeTrix home"
            onClick={(e) => handleLinkClick(e, '/')}
            className="inline-flex items-center rounded-md focus-visible:outline-2"
          >
            <SurgeTrixLogo size={26} />
          </a>
        </div>

        <nav aria-label="Main" className="flex-1 space-y-0.5">
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] font-medium transition-colors rounded-lg"
                style={{
                  backgroundColor: active ? 'var(--st-accent-soft)' : 'transparent',
                  color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                }}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}

          <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--st-border)' }}>
            <p
              className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--st-text-muted)' }}
            >
              Account
            </p>
            <a
              href="/dashboard"
              onClick={(e) => handleLinkClick(e, '/dashboard')}
              className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] font-medium transition-colors rounded-lg"
              style={{
                backgroundColor: isActive('/dashboard') && !isActive('/dashboard/servers') && !isActive('/dashboard/owner') ? 'var(--st-accent-soft)' : 'transparent',
                color: isActive('/dashboard') && !isActive('/dashboard/servers') && !isActive('/dashboard/owner') ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
              }}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Dashboard</span>
            </a>
            <a
              href="/dashboard/servers"
              onClick={(e) => handleLinkClick(e, '/dashboard/servers')}
              className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] font-medium transition-colors rounded-lg"
              style={{
                backgroundColor: isActive('/dashboard/servers') ? 'var(--st-accent-soft)' : 'transparent',
                color: isActive('/dashboard/servers') ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
              }}
            >
              <Server className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>My Servers &amp; IP</span>
            </a>
            {isOwnerUser(user) && (
              <a
                href="/owner-dashboard"
                onClick={(e) => handleLinkClick(e, '/owner-dashboard')}
                className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] font-semibold transition-colors rounded-lg"
                style={{
                  backgroundColor:
                    isActive('/owner-dashboard') || isActive('/dashboard/owner')
                      ? 'var(--st-accent-soft)'
                      : 'transparent',
                  color: 'var(--st-accent-text)',
                }}
              >
                <Shield className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Owner Dashboard</span>
              </a>
            )}
            {user ? (
              <div className="mt-1 space-y-1">
                <a
                  href="/login"
                  onClick={(e) => handleLinkClick(e, '/login')}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] font-medium rounded-lg"
                  style={{ color: 'var(--st-text-secondary)' }}
                >
                  <User className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{user.username}</span>
                </a>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg text-left cursor-pointer"
                  style={{ color: 'var(--st-text-muted)' }}
                >
                  <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <a
                href="/login"
                onClick={(e) => handleLinkClick(e, '/login')}
                className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] font-medium transition-colors rounded-lg"
                style={{
                  backgroundColor: isActive('/login') ? 'var(--st-accent-soft)' : 'transparent',
                  color: isActive('/login') ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                }}
              >
                <User className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Login</span>
              </a>
            )}
          </div>
        </nav>

        <div className="pt-4 mt-4">
          <a
            href="/pricing"
            onClick={(e) => handleLinkClick(e, '/pricing')}
            className="block p-3.5 rounded-xl border transition-colors"
            style={{
              backgroundColor: 'var(--st-surface)',
              borderColor: 'var(--st-border)',
            }}
          >
            <span className="block text-xs font-bold" style={{ color: 'var(--st-text)' }}>
              SurgeTrix Plus
            </span>
            <span className="block text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--st-text-muted)' }}>
              Higher daily allowances and cloud-saved configs.
            </span>
          </a>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Search & Quick Actions Header */}
        <header
          className="sticky top-0 z-40 backdrop-blur-md"
          style={{
            backgroundColor: 'var(--st-header)',
            borderBottom: '1px solid var(--st-border)',
          }}
        >
          <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            {/* Mobile Brand & Drawer Toggle */}
            <div className="flex items-center gap-2.5 lg:hidden shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                className="p-2 rounded-lg shrink-0 cursor-pointer"
                style={{ color: 'var(--st-text)' }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <a
                href="/"
                aria-label="SurgeTrix home"
                onClick={(e) => handleLinkClick(e, '/')}
                className="rounded-md focus-visible:outline-2 shrink-0"
              >
                <SurgeTrixLogo size={24} />
              </a>
            </div>

            {/* Global Search Bar (Minevex Top Header Style) */}
            <form
              role="search"
              onSubmit={handleTopSearchSubmit}
              className="hidden sm:flex items-center flex-1 max-w-lg st-surface-inset p-1 pl-3.5"
            >
              <Search className="w-4 h-4 mr-2 shrink-0" style={{ color: 'var(--st-text-muted)' }} aria-hidden="true" />
              <input
                type="search"
                role="combobox"
                aria-label="Search tools, servers, plugins and guides"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search SurgeTrix..."
                className="w-full bg-transparent text-xs sm:text-sm focus:outline-none min-w-0"
                style={{ color: 'var(--st-text)' }}
              />
              <button
                type="submit"
                className="ml-2 px-3.5 py-1.5 st-btn-primary text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            {/* Right Controls */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {/* Compact Style Switcher */}
              <div className="relative" ref={stylePopoverRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={styleMenuOpen}
                  aria-label="Switch visual style"
                  onClick={() => setStyleMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 st-btn-secondary text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeTheme.swatches[1] }}
                  />
                  <span className="hidden md:inline">{activeTheme.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>

                {styleMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Design styles"
                    className="absolute right-0 mt-2 w-60 st-card p-2 shadow-2xl z-50 space-y-1"
                  >
                    <div
                      className="px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--st-text-muted)' }}
                    >
                      <Palette className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                      <span>Design Style</span>
                    </div>
                    {THEME_PRESETS.map((preset) => {
                      const selected = preset.id === activeTheme.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selected}
                          onClick={() => {
                            onSelectTheme(preset.id);
                            setStyleMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors cursor-pointer"
                          style={{
                            borderRadius: 'var(--st-radius)',
                            backgroundColor: selected ? 'var(--st-accent-soft)' : 'transparent',
                            color: 'var(--st-text)',
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: preset.swatches[1] }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold leading-tight">
                              {preset.name}
                            </span>
                            <span className="block text-[11px] leading-tight" style={{ color: 'var(--st-text-muted)' }}>
                              {preset.subtitle}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <a
                href="/assistant"
                onClick={(e) => handleLinkClick(e, '/assistant')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 st-btn-secondary text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
                <span>Ask Surge AI</span>
              </a>

              {user ? (
                <a
                  href="/dashboard"
                  onClick={(e) => handleLinkClick(e, '/dashboard')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 st-btn-primary text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{user.username}</span>
                </a>
              ) : (
                <a
                  href="/login"
                  onClick={(e) => handleLinkClick(e, '/login')}
                  className="inline-flex items-center justify-center px-4 py-2 st-btn-primary text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  Login
                </a>
              )}
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div
              className="lg:hidden px-4 py-4 space-y-3"
              style={{
                backgroundColor: 'var(--st-sidebar)',
                borderTop: '1px solid var(--st-border)',
              }}
            >
              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  onSearchSubmit(searchQuery);
                }}
                className="flex items-center st-surface-inset p-1 pl-3"
              >
                <Search className="w-4 h-4 mr-2 shrink-0" style={{ color: 'var(--st-text-muted)' }} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search tools, servers, mods..."
                  className="w-full bg-transparent text-xs focus:outline-none min-w-0"
                  style={{ color: 'var(--st-text)' }}
                />
                <button
                  type="submit"
                  className="ml-2 px-3 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                >
                  Search
                </button>
              </form>

              <nav aria-label="Mobile navigation" className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SIDEBAR_NAV_ITEMS.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={(e) => handleLinkClick(e, item.path)}
                      className="px-3 py-2 text-xs font-medium rounded-lg"
                      style={{
                        backgroundColor: active ? 'var(--st-accent-soft)' : 'transparent',
                        color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                      }}
                    >
                      {item.label}
                    </a>
                  );
                })}
                <a
                  href="/dashboard"
                  onClick={(e) => handleLinkClick(e, '/dashboard')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg"
                  style={{ color: 'var(--st-accent-text)' }}
                >
                  Dashboard
                </a>
                <a
                  href="/dashboard/servers"
                  onClick={(e) => handleLinkClick(e, '/dashboard/servers')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg"
                  style={{ color: 'var(--st-accent-text)' }}
                >
                  My Servers &amp; IP
                </a>
                {isOwnerUser(user) && (
                  <a
                    href="/owner-dashboard"
                    onClick={(e) => handleLinkClick(e, '/owner-dashboard')}
                    className="px-3 py-2 text-xs font-semibold rounded-lg"
                    style={{ color: 'var(--st-accent-text)' }}
                  >
                    Owner Dashboard
                  </a>
                )}
              </nav>
            </div>
          )}
        </header>

        {/* Announcement Strip */}
        {announcementVisible && (
          <div
            role="status"
            className="px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-xs"
            style={{
              backgroundColor: 'var(--st-surface)',
              borderBottom: '1px solid var(--st-border)',
            }}
          >
            <p className="flex items-center gap-2 truncate" style={{ color: 'var(--st-text-secondary)' }}>
              <Megaphone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--st-accent-text)' }} aria-hidden="true" />
              <span className="font-semibold" style={{ color: 'var(--st-text)' }}>
                Updated Workspace
              </span>
              <span style={{ color: 'var(--st-text-muted)' }}>
                — Server List, DuckDNS domains &amp; 40 Minecraft tools live now
              </span>
            </p>
            <button
              type="button"
              onClick={() => setAnnouncementVisible(false)}
              aria-label="Dismiss announcement"
              className="p-1 rounded-md shrink-0 cursor-pointer"
              style={{ color: 'var(--st-text-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content */}
        <main id="main" className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer
          className="mt-16"
          style={{
            backgroundColor: 'var(--st-sidebar)',
            borderTop: '1px solid var(--st-border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
              <div className="col-span-2">
                <a
                  href="/"
                  aria-label="SurgeTrix home"
                  onClick={(e) => handleLinkClick(e, '/')}
                  className="inline-block mb-3"
                >
                  <SurgeTrixLogo size={26} />
                </a>
                <p className="text-[13.5px] leading-relaxed max-w-sm" style={{ color: 'var(--st-text-muted)' }}>
                  Everything Minecraft. One place. Free tools for players, server owners, and plugin developers.
                </p>
              </div>

              <div>
                <h3
                  className="text-[11px] font-semibold tracking-wider uppercase mb-3.5"
                  style={{ color: 'var(--st-text-muted)' }}
                >
                  Product
                </h3>
                <ul className="space-y-2 text-[13px]" style={{ color: 'var(--st-text-secondary)' }}>
                  {[
                    { label: 'Home', path: '/' },
                    { label: 'Tools', path: '/tools' },
                    { label: 'Guides', path: '/guides' },
                    { label: 'Pricing', path: '/pricing' },
                    { label: 'Servers', path: '/servers' },
                    { label: 'Plugin', path: '/plugin' },
                    { label: 'Mods', path: '/mods' },
                    { label: 'Resources', path: '/resources' },
                  ].map((l) => (
                    <li key={l.label}>
                      <a href={l.path} onClick={(e) => handleLinkClick(e, l.path)} className="hover:underline">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3
                  className="text-[11px] font-semibold tracking-wider uppercase mb-3.5"
                  style={{ color: 'var(--st-text-muted)' }}
                >
                  Learn
                </h3>
                <ul className="space-y-2 text-[13px]" style={{ color: 'var(--st-text-secondary)' }}>
                  {[
                    { label: 'Dashboard', path: '/dashboard' },
                    { label: 'Guides', path: '/guides' },
                    { label: 'Changelog', path: '/changelogs' },
                    { label: 'Community', path: '/community' },
                    { label: 'Ask AI', path: '/assistant' },
                    { label: 'Bash Protect', path: '/bash/' },
                  ].map((l) => (
                    <li key={l.label}>
                      <a href={l.path} onClick={(e) => handleLinkClick(e, l.path)} className="hover:underline">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3
                  className="text-[11px] font-semibold tracking-wider uppercase mb-3.5"
                  style={{ color: 'var(--st-text-muted)' }}
                >
                  Developers &amp; Legal
                </h3>
                <ul className="space-y-2 text-[13px]" style={{ color: 'var(--st-text-secondary)' }}>
                  {[
                    { label: 'API Docs', path: '/developers/docs' },
                    { label: 'API Keys', path: '/developers/api-keys' },
                    { label: 'Privacy Policy', path: '/privacy' },
                    { label: 'Terms of Service', path: '/terms' },
                    { label: 'Contact', path: '/contact' },
                  ].map((l) => (
                    <li key={l.label}>
                      <a href={l.path} onClick={(e) => handleLinkClick(e, l.path)} className="hover:underline">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              className="mt-10 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12.5px]"
              style={{
                borderTop: '1px solid var(--st-border)',
                color: 'var(--st-text-muted)',
              }}
            >
              <p>
                SurgeTrix is an independent Minecraft community project and is not affiliated with Mojang or Microsoft.
              </p>
              <button
                type="button"
                onClick={() => setCookieChoice(null)}
                className="underline underline-offset-4 cursor-pointer"
                style={{ color: 'var(--st-text-secondary)' }}
              >
                Cookie settings
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Cookie Consent Dialog */}
      {cookieChoice === null && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm st-card p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                Your privacy choices
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--st-text-muted)' }}>
                We use essential storage to keep you signed in and remember your design theme.{' '}
                <a
                  href="/privacy"
                  onClick={(e) => handleLinkClick(e, '/privacy')}
                  className="hover:underline"
                  style={{ color: 'var(--st-accent-text)' }}
                >
                  Privacy Policy
                </a>
                .
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCookieSave('accepted')}
                  className="px-3.5 py-1.5 st-btn-primary text-xs font-semibold cursor-pointer"
                >
                  Accept analytics
                </button>
                <button
                  type="button"
                  onClick={() => handleCookieSave('essential')}
                  className="px-3.5 py-1.5 st-btn-secondary text-xs font-medium cursor-pointer"
                >
                  Reject non-essential
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCookieSave('essential')}
              aria-label="Close and reject"
              className="p-1 rounded-md cursor-pointer"
              style={{ color: 'var(--st-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
