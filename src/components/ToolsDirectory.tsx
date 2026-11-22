import React, { useState } from 'react';
import { ChevronRight, Search, Sparkles } from 'lucide-react';
import {
  ADVANCED_TOOLS_CATALOG,
  TOOLS_CATALOG,
  ToolCategory,
} from '../data/catalog';
import { ToolIcon } from './ToolIcon';

interface ToolsDirectoryProps {
  onNavigate: (path: string) => void;
  initialCategory?: 'All' | ToolCategory;
  initialFilter?: string;
}

const CATEGORIES: ('All' | ToolCategory)[] = [
  'All',
  'Minecraft Tools',
  'Server Owner Tools',
  'Player Utilities',
  'Developer Utilities',
];

export const ToolsDirectory: React.FC<ToolsDirectoryProps> = ({
  onNavigate,
  initialCategory = 'All',
  initialFilter = '',
}) => {
  const [filterText, setFilterText] = useState(initialFilter);
  const [selectedCategory, setSelectedCategory] = useState<'All' | ToolCategory>(initialCategory);

  const filtered = TOOLS_CATALOG.filter((tool) => {
    const matchesCat = selectedCategory === 'All' || tool.category === selectedCategory;
    const q = filterText.trim().toLowerCase();
    const matchesQuery =
      !q ||
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--st-text)' }}>
          Tools
        </h1>
        <p className="text-[15px] mt-2 max-w-2xl" style={{ color: 'var(--st-text-muted)' }}>
          Free utilities for Minecraft players, server owners and plugin developers. Everything runs in your browser.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="relative max-w-md">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--st-text-muted)' }}
            aria-hidden="true"
          />
          <input
            type="text"
            aria-label="Filter tools"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter tools"
            className="w-full pl-10 pr-4 py-2.5 st-surface-inset text-sm focus:outline-none"
            style={{ color: 'var(--st-text)' }}
          />
        </div>

        <div role="group" aria-label="Category" className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedCategory(cat)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--st-accent-soft)' : 'var(--st-surface)',
                  border: active ? '1px solid var(--st-border-strong)' : '1px solid var(--st-border)',
                  color: active ? 'var(--st-accent-text)' : 'var(--st-text-muted)',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="st-card p-10 text-center">
          <p className="text-base font-medium" style={{ color: 'var(--st-text)' }}>
            No tools matched "{filterText}"
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
            Try clearing your search or switching back to All categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterText('');
              setSelectedCategory('All');
            }}
            className="mt-4 px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tool) => (
            <a
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(`/tools/${tool.slug}`);
              }}
              className="group flex items-center justify-between gap-3.5 p-4 st-card st-card-interactive"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-10 h-10 flex items-center justify-center shrink-0"
                  style={{
                    borderRadius: 'var(--st-radius)',
                    backgroundColor: 'var(--st-accent-soft)',
                    border: '1px solid var(--st-border-strong)',
                    color: 'var(--st-accent-text)',
                  }}
                >
                  <ToolIcon iconKey={tool.iconKey} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14.5px] font-semibold truncate" style={{ color: 'var(--st-text)' }}>
                      {tool.name}
                    </span>
                    {tool.isNew && (
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--st-success)' }}>
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] truncate mt-0.5" style={{ color: 'var(--st-text-muted)' }}>
                    {tool.description}
                  </p>
                </div>
              </div>
              <ChevronRight
                className="w-4 h-4 group-hover:translate-x-0.5 transition-all shrink-0"
                style={{ color: 'var(--st-text-muted)' }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdvancedToolsDirectory: React.FC<{ onNavigate: (path: string) => void }> = ({
  onNavigate,
}) => {
  const featured = ADVANCED_TOOLS_CATALOG.filter((t) => t.featured);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      <div>
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'var(--st-accent-text)' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Pro-Grade Diagnostics</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--st-text)' }}>
          Advanced Tools
        </h1>
        <p className="text-[15px] mt-2 max-w-2xl" style={{ color: 'var(--st-text-muted)' }}>
          Powerful Minecraft utilities built for server owners, developers, and administrators. Every tool is free to use on every plan — plans only change daily usage allowances.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--st-text)' }}>
          Featured
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {featured.map((tool) => (
            <div key={tool.slug} className="st-card p-6 flex flex-col justify-between gap-6">
              <div>
                <span className="text-xs font-medium" style={{ color: 'var(--st-success)' }}>
                  {tool.badge}
                </span>
                <h3 className="text-xl font-bold mt-2" style={{ color: 'var(--st-text)' }}>
                  {tool.name}
                </h3>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--st-text-muted)' }}>
                  {tool.description}
                </p>
              </div>
              <a
                href={`/tools/${tool.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/tools/${tool.slug}`);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 st-btn-primary text-sm font-semibold w-fit"
              >
                <span>Open Tool</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--st-text)' }}>
          All advanced tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ADVANCED_TOOLS_CATALOG.map((tool) => (
            <div key={tool.slug} className="st-card p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--st-text)' }}>
                    {tool.name}
                  </h3>
                  <span className="text-xs" style={{ color: 'var(--st-text-muted)' }}>
                    · {tool.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--st-text-muted)' }}>
                  {tool.description}
                </p>
              </div>
              <a
                href={`/tools/${tool.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/tools/${tool.slug}`);
                }}
                className="px-3.5 py-2 st-btn-secondary text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Open Tool
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
