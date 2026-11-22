import React, { useState } from 'react';
import {
  ArrowRight,
  Blocks,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Package,
  Palette,
  Puzzle,
  Search,
  Server,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { ServerListing, TOOLS_CATALOG, ToolCategory } from '../data/catalog';
import { THEME_PRESETS, ThemePreset, ThemeStyleId } from '../utils/themePresets';
import { PlayerActivityChart } from './PlayerActivityChart';
import { ToolIcon } from './ToolIcon';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onSelectCategory: (cat: ToolCategory) => void;
  onSearchSubmit: (q: string) => void;
  activeTheme: ThemePreset;
  onSelectTheme: (id: ThemeStyleId) => void;
  servers?: ServerListing[];
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectCategory,
  onSearchSubmit,
  activeTheme,
  onSelectTheme,
  servers = [],
}) => {
  const [heroSearch, setHeroSearch] = useState('');

  const totalToolCount = TOOLS_CATALOG.length;
  const featuredTools = TOOLS_CATALOG.filter((t) => t.featured);
  const recentlyAdded = TOOLS_CATALOG.filter((t) => t.recentlyAdded);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(heroSearch);
  };

  const linkNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <div className="bg-hero-grid">
      {/* Section 1: Minevex-Style Split Hero + Live Player Activity Chart */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12"
        style={{ borderBottom: '1px solid var(--st-border)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-5">
            <a
              href="/assistant"
              onClick={(e) => linkNav(e, '/assistant')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              style={{
                backgroundColor: 'var(--st-surface)',
                borderColor: 'var(--st-border)',
                color: 'var(--st-text-secondary)',
              }}
            >
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'var(--st-accent)',
                  color: 'var(--st-accent-on)',
                }}
              >
                New
              </span>
              <span>Meet Surge AI, your Minecraft server developer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <h1
              className="text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.08] tracking-tight st-display"
              style={{ color: 'var(--st-text)' }}
            >
              All your Minecraft{' '}
              <span className={`bg-gradient-to-r ${activeTheme.heroGradientClass} bg-clip-text text-transparent block sm:inline`}>
                tools &amp; servers.
              </span>
            </h1>

            <p className="text-[15px] leading-relaxed max-w-xl" style={{ color: 'var(--st-text-muted)' }}>
              Calculate resources, explore seeds, build TAB animations and check Spark reports. SurgeTrix puts the tools players and server owners actually use in one fast, polished place.
            </p>

            <form
              role="search"
              onSubmit={handleHeroSearch}
              className="flex items-center st-surface-inset p-1.5 pl-3.5 max-w-lg"
            >
              <Search className="w-4 h-4 mr-2.5 shrink-0" style={{ color: 'var(--st-text-muted)' }} aria-hidden="true" />
              <input
                type="search"
                role="combobox"
                aria-label="Search tools, servers, plugins, guides"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search tools, servers, plugins, guides"
                className="w-full bg-transparent text-sm focus:outline-none min-w-0"
                style={{ color: 'var(--st-text)' }}
              />
              <button
                type="submit"
                className="ml-2 px-4 py-2 st-btn-primary text-[13px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="/tools"
                onClick={(e) => linkNav(e, '/tools')}
                className="inline-flex items-center gap-2 px-5 py-2.5 st-btn-primary text-sm font-semibold whitespace-nowrap"
              >
                <span>Explore tools</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/advanced-tools"
                onClick={(e) => linkNav(e, '/advanced-tools')}
                className="inline-flex items-center gap-2 px-5 py-2.5 st-btn-secondary text-sm font-semibold whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" style={{ color: 'var(--st-accent-text)' }} />
                <span>Advanced tools</span>
              </a>
            </div>

            {/* 3 KPI Tiles matching minevex.site */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-lg tabular-nums">
              <div className="st-card p-3.5">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--st-text)' }}>
                  {totalToolCount}+
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
                  Free tools
                </div>
              </div>
              <div className="st-card p-3.5">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--st-text)' }}>
                  {servers.length}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
                  {servers.length === 1 ? 'Server' : 'Servers'}
                </div>
              </div>
              <div className="st-card p-3.5">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--st-text)' }}>
                  24/7
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
                  Available
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Player Activity Card */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span
                className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider"
                style={{ color: 'var(--st-accent-text)' }}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Live Player Activity</span>
              </span>
              <a
                href="/servers"
                onClick={(e) => linkNav(e, '/servers')}
                className="font-medium hover:underline inline-flex items-center gap-1"
                style={{ color: 'var(--st-text-muted)' }}
              >
                <span>All servers</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>

            <div className="st-card p-5 shadow-xl">
              <PlayerActivityChart
                title="Player activity over time"
                subtitle="Example of live server monitoring in SurgeTrix."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Quick Directory Cards + Design Styles */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6"
        style={{ borderBottom: '1px solid var(--st-border)' }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Tools', desc: `${totalToolCount} free calculators`, path: '/tools', icon: Wrench },
            { label: 'Advanced Tools', desc: 'TAB, Spark & LuckPerms', path: '/advanced-tools', icon: Sparkles },
            { label: 'Servers', desc: 'Community server list', path: '/servers', icon: Server },
            { label: 'Plugin', desc: 'Paper & Velocity extensions', path: '/plugin', icon: Puzzle },
            { label: 'Mods', desc: 'Fabric & NeoForge mods', path: '/mods', icon: Blocks },
            { label: 'Resources', desc: 'Packs, apps & tools', path: '/resources', icon: Package },
          ].map((tile) => {
            const Icon = tile.icon;
            return (
              <a
                key={tile.label}
                href={tile.path}
                onClick={(e) => linkNav(e, tile.path)}
                className="p-4 st-card st-card-interactive block"
              >
                <div
                  className="w-8 h-8 flex items-center justify-center mb-2.5"
                  style={{
                    borderRadius: 'var(--st-radius)',
                    backgroundColor: 'var(--st-accent-soft)',
                    color: 'var(--st-accent-text)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                  {tile.label}
                </p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--st-text-muted)' }}>
                  {tile.desc}
                </p>
              </a>
            );
          })}
        </div>

        {/* Compact Style Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--st-text-secondary)' }}>
            <Palette className="w-3.5 h-3.5" style={{ color: 'var(--st-accent-text)' }} />
            <span>Style Preset:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 max-w-3xl">
            {THEME_PRESETS.map((preset) => {
              const active = preset.id === activeTheme.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectTheme(preset.id)}
                  aria-pressed={active}
                  className="flex items-center gap-2.5 px-3 py-2 text-left transition-all cursor-pointer"
                  style={{
                    borderRadius: 'var(--st-radius)',
                    backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface)',
                    border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: preset.swatches[1] }}
                  />
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--st-text)' }}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Featured Servers (Minevex Empty/Live Card) */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-4"
        style={{ borderBottom: '1px solid var(--st-border)' }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--st-text)' }}>
              Featured servers
            </h2>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
              Community listings and free custom duckdns.org server addresses.
            </p>
          </div>
          <a
            href="/servers"
            onClick={(e) => linkNav(e, '/servers')}
            className="text-xs sm:text-sm font-semibold inline-flex items-center gap-1 whitespace-nowrap"
            style={{ color: 'var(--st-accent-text)' }}
          >
            <span>All servers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {servers.length === 0 ? (
          <div className="st-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--st-text)' }}>
                No servers listed yet. Yours could be the first.
              </p>
              <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                Claim a free duckdns.org address and publish your Minecraft server from your Dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <a
                href="/dashboard/domains"
                onClick={(e) => linkNav(e, '/dashboard/domains')}
                className="inline-flex items-center gap-1.5 px-4 py-2 st-btn-secondary text-xs font-semibold"
              >
                <span>Create Free Domain</span>
              </a>
              <a
                href="/dashboard/servers"
                onClick={(e) => linkNav(e, '/dashboard/servers')}
                className="inline-flex items-center gap-1.5 px-4 py-2 st-btn-primary text-xs font-semibold"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>List your server</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {servers.slice(0, 4).map((srv) => (
              <div key={srv.id} className="st-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: 'var(--st-text)' }}>
                    {srv.name}
                  </div>
                  <div className="text-xs font-mono truncate mt-0.5" style={{ color: 'var(--st-accent-text)' }}>
                    {srv.ip}
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div className="text-xs font-semibold" style={{ color: srv.status === 'Online' ? 'var(--st-success)' : 'var(--st-text-muted)' }}>
                    {srv.status}
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--st-text-muted)' }}>
                    {srv.playersOnline}/{srv.maxPlayers}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Featured Tools & Categories */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6"
        style={{ borderBottom: '1px solid var(--st-border)' }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--st-text)' }}>
              Popular Minecraft tools
            </h2>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
              Instant calculators, server utilities, and YAML/JSON tools.
            </p>
          </div>
          <a
            href="/tools"
            onClick={(e) => linkNav(e, '/tools')}
            className="text-xs sm:text-sm font-semibold inline-flex items-center gap-1 whitespace-nowrap"
            style={{ color: 'var(--st-accent-text)' }}
          >
            <span>Browse all {totalToolCount}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {featuredTools.slice(0, 6).map((tool) => (
            <a
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              onClick={(e) => linkNav(e, `/tools/${tool.slug}`)}
              className="group p-4 st-card st-card-interactive flex items-start gap-3.5"
            >
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  borderRadius: 'var(--st-radius)',
                  backgroundColor: 'var(--st-accent-soft)',
                  border: '1px solid var(--st-border-strong)',
                  color: 'var(--st-accent-text)',
                }}
              >
                <ToolIcon iconKey={tool.iconKey} className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14.5px] font-semibold truncate" style={{ color: 'var(--st-text)' }}>
                    {tool.name}
                  </span>
                  <ChevronRight
                    className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform"
                    style={{ color: 'var(--st-text-muted)' }}
                  />
                </div>
                <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--st-text-muted)' }}>
                  {tool.description}
                </p>
              </div>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {(
            ['Minecraft Tools', 'Server Owner Tools', 'Player Utilities', 'Developer Utilities'] as ToolCategory[]
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className="text-left p-3.5 st-card st-card-interactive flex items-center justify-between gap-2 cursor-pointer"
            >
              <span className="text-xs font-semibold truncate" style={{ color: 'var(--st-text)' }}>
                {cat}
              </span>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--st-accent-text)' }}>
                {TOOLS_CATALOG.filter((t) => t.category === cat).length}
              </span>
            </button>
          ))}
        </div>

        {recentlyAdded.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentlyAdded.slice(0, 4).map((tool) => (
              <a
                key={tool.slug}
                href={`/tools/${tool.slug}`}
                onClick={(e) => linkNav(e, `/tools/${tool.slug}`)}
                className="p-3.5 st-surface-inset flex items-center justify-between gap-2 hover:border-[var(--st-border-strong)] transition-colors"
              >
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--st-text-secondary)' }}>
                  {tool.name}
                </span>
                <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--st-success)' }}>
                  New
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Section 5: EVERY TOOL, EVERY PLAN (Exact Minevex Card) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="st-card p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--st-accent-text)' }}
            >
              Every Tool, Every Plan
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: 'var(--st-text)' }}>
              Everything SurgeTrix makes is yours to use.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--st-text-muted)' }}>
              Every account, including Free, gets full access to all tools and every feature. Paid plans simply raise your daily usage allowance and add account benefits like more saved configurations and storage.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="/pricing"
                onClick={(e) => linkNav(e, '/pricing')}
                className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-primary text-xs font-semibold"
              >
                <span>Compare plans</span>
              </a>
              <a
                href="/advanced-tools"
                onClick={(e) => linkNav(e, '/advanced-tools')}
                className="inline-flex items-center gap-2 px-4 py-2.5 st-btn-secondary text-xs font-semibold"
              >
                <span>Browse all tools</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-6 st-surface-inset p-5 space-y-3">
            <p className="text-xs font-semibold" style={{ color: 'var(--st-text)' }}>
              Daily tool allowances
            </p>
            <ul className="divide-y text-sm" style={{ borderColor: 'var(--st-border)' }}>
              {[
                { tier: 'Free', allowance: '15 Normal · 10 Advanced' },
                { tier: 'Plus', allowance: '50 Normal · 25 Advanced' },
                { tier: 'Pro', allowance: '120 Normal · 75 Advanced' },
                { tier: 'Business', allowance: '400 Normal · 200 Advanced' },
              ].map((row) => (
                <li
                  key={row.tier}
                  className="py-2.5 flex items-center justify-between gap-4"
                  style={{ borderColor: 'var(--st-border)' }}
                >
                  <span className="font-semibold" style={{ color: 'var(--st-text)' }}>
                    {row.tier}
                  </span>
                  <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--st-text-muted)' }}>
                    {row.allowance}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px]" style={{ color: 'var(--st-text-muted)' }}>
              Allowances reset at 00:00 UTC. Manage servers, duckdns.org addresses, and saved configs from your Dashboard.
            </p>
          </div>
        </div>

        {/* Community Board CTA Bar */}
        <div className="st-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{
                borderRadius: 'var(--st-radius)',
                backgroundColor: 'var(--st-accent-soft)',
                color: 'var(--st-accent-text)',
              }}
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--st-text)' }}>
                Help decide what we build next.
              </p>
              <p className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                Vote on the next tool or feature in the community board.
              </p>
            </div>
          </div>
          <a
            href="/community"
            onClick={(e) => linkNav(e, '/community')}
            className="inline-flex items-center gap-1.5 px-4 py-2 st-btn-secondary text-xs font-semibold"
          >
            <span>Go to Community</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
};
