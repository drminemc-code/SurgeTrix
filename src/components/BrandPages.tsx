import React, { useState } from 'react';
import { AlertCircle, Check, Loader2, RotateCcw, Send, Shield, Sparkles } from 'lucide-react';
import { BASH_PROTECT_MODULES, PRICING_TIERS } from '../data/catalog';
import { CopyButton } from './tools/TextAndServerTools';
import {
  detectMatchingSurgeTrixTool,
  parseAssistantReply,
  parseInlineTokens,
  parseMarkdownLines,
  validateAiPrompt,
} from '../utils/aiAssistant';

const BASH_SETUP_SNIPPET = `# Bash Protect by SurgeTrix — Discord Setup Commands
/bash setup log-channel:#mod-logs
/bash antiraid mode:strict threshold:5/10s
/bash link-filter block-invites:true block-scams:true
/bash verify role:@Verified method:turnstile`;

export const BashProtectPage: React.FC = () => {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <div className="st-card p-8 sm:p-12 space-y-6">
        <div
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--st-success)' }}
        >
          <Shield className="w-4 h-4" />
          <span>Bash Protect by SurgeTrix</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          The crow never sleeps.
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Bash Protect is an all-in-one security and moderation bot that helps defend your Discord community against raids, scams, malicious links and unwanted content.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(BASH_SETUP_SNIPPET).catch(() => {});
              setShowSetup((prev) => !prev);
            }}
            className="px-5 py-2.5 st-btn-primary text-sm font-semibold cursor-pointer"
          >
            {showSetup ? 'Setup Commands Copied' : 'Add Bot & Copy Setup'}
          </button>
          <span className="px-5 py-2.5 st-btn-secondary text-sm font-semibold">
            Security without compromise.
          </span>
        </div>

        {showSetup && (
          <div className="st-surface-inset p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--st-accent-text)' }}>
                Recommended Bash Protect Slash Config (Copied to clipboard)
              </span>
              <CopyButton text={BASH_SETUP_SNIPPET} label="Copy Config" />
            </div>
            <pre className="text-xs font-mono text-emerald-400 overflow-x-auto">{BASH_SETUP_SNIPPET}</pre>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BASH_PROTECT_MODULES.map((mod) => (
          <div key={mod.title} className="st-card p-5 space-y-2">
            <Shield className="w-5 h-5" style={{ color: 'var(--st-accent-text)' }} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{mod.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {mod.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PricingPage: React.FC<{
  onNavigate: (path: string) => void;
  user?: { username: string; plan: string } | null;
}> = ({ onNavigate, user }) => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pricing
          </h1>
          <p className="text-[15px] text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            Everything you need to run a server is free. Paid plans are for people who save a lot, monitor several servers or work in a team.
          </p>
        </div>

        <div className="inline-flex items-center p-1 st-card shrink-0">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              billing === 'monthly' ? 'st-btn-primary' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling('annual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              billing === 'annual' ? 'st-btn-primary' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Annual (Save 20%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PRICING_TIERS.map((tier) => {
          const price = billing === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
          return (
            <div
              key={tier.id}
              className="st-card p-6 flex flex-col justify-between gap-6"
              style={
                tier.highlighted
                  ? { borderColor: 'var(--st-border-strong)' }
                  : undefined
              }
            >
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tier.name}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{tier.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1 tabular-nums">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    ${price}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/month</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        className="w-3.5 h-3.5 shrink-0 mt-0.5"
                        style={{ color: 'var(--st-success)' }}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(user ? '/dashboard/settings' : '/signup')}
                className={`w-full py-2.5 px-4 text-xs font-semibold cursor-pointer ${
                  tier.highlighted ? 'st-btn-primary' : 'st-btn-secondary'
                }`}
              >
                {user && user.plan.toLowerCase() === tier.name.toLowerCase()
                  ? `Active (${tier.name})`
                  : user
                  ? `Open ${tier.name} in Dashboard`
                  : tier.cta}
              </button>
            </div>
          );
        })}
      </div>

      <section className="st-card p-6 overflow-x-auto">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Compare plans</h2>
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.08]">
            <tr>
              <th className="py-3 pr-4">Allowance</th>
              <th className="py-3 px-4">Free</th>
              <th className="py-3 px-4">Plus</th>
              <th className="py-3 px-4">Pro</th>
              <th className="py-3 px-4">Business</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06] text-slate-700 dark:text-slate-300">
            <tr>
              <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">Daily Normal Tools</td>
              {PRICING_TIERS.map((t) => (
                <td key={t.id} className="py-3 px-4 font-mono">{t.normalAllowance}</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">Daily Advanced Tools</td>
              {PRICING_TIERS.map((t) => (
                <td key={t.id} className="py-3 px-4 font-mono">{t.advancedAllowance}</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">Saved Configs</td>
              {PRICING_TIERS.map((t) => (
                <td key={t.id} className="py-3 px-4">{t.savedConfigs}</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">Storage</td>
              {PRICING_TIERS.map((t) => (
                <td key={t.id} className="py-3 px-4 font-mono">{t.storage}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
};

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  toolLink?: { label: string; path: string };
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: 'assistant',
  text: 'Ask Surge AI anything about SurgeTrix tools, Paper/Purpur flags, LuckPerms permissions, TAB YAML, or Minecraft commands.',
};

export const AssistantPage: React.FC<{ onNavigate: (path: string) => void }> = ({
  onNavigate,
}) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  const handleSend = async (textToSend?: string) => {
    if (isLoading) return;
    const raw = textToSend ?? prompt;
    const validation = validateAiPrompt(raw);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const question = validation.text;
    const historyPayload = messages
      .slice(1)
      .map((m) => ({ role: m.role, text: m.text }));

    setError(null);
    setLastFailedPrompt(null);
    if (!textToSend) setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: historyPayload,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        throw new Error(
          data.error || `Request failed with status ${response.status}.`
        );
      }

      const toolLink = detectMatchingSurgeTrixTool(question, data.reply);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply!,
          toolLink,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not reach Surge AI right now.';
      setError(message);
      setLastFailedPrompt(question);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'user' && last.text === question) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      if (!textToSend) setPrompt(question);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    if (isLoading) return;
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    setError(null);
    setLastFailedPrompt(null);
    setPrompt('');
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--st-accent-text)' }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Surge AI</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Minecraft & Server Assistant
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button
              type="button"
              onClick={handleResetChat}
              disabled={isLoading}
              className="px-3.5 py-2 st-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear chat</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('/advanced-tools')}
            className="px-3.5 py-2 st-btn-secondary text-xs font-semibold cursor-pointer"
          >
            Advanced tools
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          'How do I set up a LuckPerms VIP rank?',
          'Best JVM flags to fix Paper TPS lag?',
          'Generate a gradient MOTD example',
          'How do Nether portal coordinates work?',
        ].map((q) => (
          <button
            key={q}
            type="button"
            disabled={isLoading}
            onClick={() => void handleSend(q)}
            className="px-3 py-1.5 st-card st-card-interactive text-xs text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
          {lastFailedPrompt && (
            <button
              type="button"
              onClick={() => void handleSend(lastFailedPrompt)}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="st-card p-5 space-y-4 min-h-[320px]">
        {messages.map((m, idx) => {
          const blocks =
            m.role === 'assistant' ? parseAssistantReply(m.text) : [{ type: 'text' as const, content: m.text }];

          return (
            <div
              key={idx}
              className={`rounded-xl p-4 text-sm ${
                m.role === 'user'
                  ? 'ml-8 text-slate-900 dark:text-white'
                  : 'mr-8 st-surface-inset text-slate-700 dark:text-slate-200'
              }`}
              style={
                m.role === 'user'
                  ? { backgroundColor: 'var(--st-accent-soft)', border: '1px solid var(--st-border-strong)' }
                  : undefined
              }
            >
              <div className="space-y-3">
                {blocks.map((block, bIdx) =>
                  block.type === 'code' ? (
                    <div
                      key={bIdx}
                      className="rounded-lg bg-slate-950 border border-white/[0.08] p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                          {block.language || 'code'}
                        </span>
                        <CopyButton text={block.content} />
                      </div>
                      <pre className="text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                        {block.content}
                      </pre>
                    </div>
                  ) : (
                    <div key={bIdx} className="space-y-1.5 leading-relaxed">
                      {parseMarkdownLines(block.content).map((line, lIdx) => {
                        if (line.type === 'blank') return null;
                        if (line.type === 'divider') {
                          return <hr key={lIdx} className="my-2 border-white/10" />;
                        }
                        const renderTokens = (txt: string) =>
                          parseInlineTokens(txt).map((tok, tIdx) => {
                            if (tok.type === 'bold') {
                              return (
                                <strong key={tIdx} className="font-semibold text-slate-900 dark:text-white">
                                  {tok.value}
                                </strong>
                              );
                            }
                            if (tok.type === 'code') {
                              return (
                                <code
                                  key={tIdx}
                                  className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-white/10 font-mono text-xs text-emerald-300"
                                >
                                  {tok.value}
                                </code>
                              );
                            }
                            return <React.Fragment key={tIdx}>{tok.value}</React.Fragment>;
                          });

                        if (line.type === 'heading') {
                          return (
                            <h4
                              key={lIdx}
                              className="text-sm font-bold text-slate-900 dark:text-white pt-1"
                            >
                              {renderTokens(line.text)}
                            </h4>
                          );
                        }
                        if (line.type === 'bullet') {
                          return (
                            <div key={lIdx} className="flex items-start gap-2 pl-1">
                              <span
                                className="mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: 'var(--st-accent-text)' }}
                              />
                              <p className="flex-1">{renderTokens(line.text)}</p>
                            </div>
                          );
                        }
                        return <p key={lIdx}>{renderTokens(line.text)}</p>;
                      })}
                    </div>
                  )
                )}
              </div>

              {m.toolLink && (
                <button
                  type="button"
                  onClick={() => onNavigate(m.toolLink!.path)}
                  className="mt-3 text-xs font-semibold cursor-pointer block"
                  style={{ color: 'var(--st-accent-text)' }}
                >
                  {m.toolLink.label}
                </button>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div
            aria-live="polite"
            className="mr-8 st-surface-inset rounded-xl p-4 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2.5"
          >
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--st-accent-text)' }} />
            <span>Surge AI is thinking...</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="flex gap-3"
      >
        <input
          type="text"
          aria-label="Ask Surge AI prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          placeholder="Ask Surge anything about SurgeTrix, Paper, LuckPerms, or commands..."
          className="flex-1 px-4 py-3 st-surface-inset text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="px-5 py-3 st-btn-primary text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>{isLoading ? 'Sending...' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
};

export const ChangelogPage: React.FC<{ onNavigate: (path: string) => void }> = ({
  onNavigate,
}) => {
  const releases = [
    {
      version: '2026.11.22 — Workspace & Server List Update',
      date: 'Latest Release',
      items: [
        'Added Dashboard workspace with Overview, My Servers, Custom Server Address builder, Voting & Reward manager, Plugin Workspace, Saved Configs vault, and API Keys.',
        'Launched Minecraft Server List directory with Java/Bedrock/Crossplay edition toggles, category filters, section tabs, and live player counters (ready for owner submissions).',
        'Expanded Minecraft Tools to 40 utilities: Firework Rocket Designer, Redstone & Hopper Clock Calculator, Armor Trim Studio, 3D Distance & Chunk Calculator, Beacon & Conduit Planner, and Banner Pattern Studio.',
        'Upgraded MOTD Generator with an authentic Minecraft Java multiplayer server-list beveled GUI and 5-bar ping preview.',
        'Added Player activity over time chart preview onto Home and Dashboard.',
      ],
    },
    {
      version: '2026.11.21 — Surge AI & Mods Directory',
      date: 'Previous Release',
      items: [
        'Launched Ask Surge AI powered by @google/genai with automatic Markdown & copyable command blocks.',
        'Added Mods directory with Fabric, NeoForge, Forge, and Quilt loader filters plus Apps and Resource Packs.',
        'Introduced 4 selectable visual design styles (Surge Cyber, Obsidian Violet, Emerald Bedrock, Daylight Studio).',
        'Protected Sign In, Sign Up, and community forms with SurgeShield Turnstile verification.',
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--st-accent-text)' }}
          >
            Platform Updates
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mt-1" style={{ color: 'var(--st-text)' }}>
            Changelog
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--st-text-muted)' }}>
            Recent additions across SurgeTrix tools, Dashboard, Server List, and Mods.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/dashboard')}
          className="px-4 py-2 st-btn-primary text-xs font-semibold cursor-pointer"
        >
          Open Dashboard
        </button>
      </div>

      <div className="space-y-5">
        {releases.map((rel) => (
          <section key={rel.version} className="st-card p-6 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold" style={{ color: 'var(--st-text)' }}>
                {rel.version}
              </h2>
              <span className="text-xs font-mono" style={{ color: 'var(--st-accent-text)' }}>
                {rel.date}
              </span>
            </div>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--st-text-secondary)' }}>
              {rel.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--st-success)' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export const StaticInfoPage: React.FC<{ path: string; onNavigate: (path: string) => void }> = ({
  path,
  onNavigate,
}) => {
  const map: Record<string, { title: string; body: string }> = {
    '/privacy': {
      title: 'Privacy Policy',
      body: 'SurgeTrix runs calculators, formatters, and validators locally in your browser. Essential local storage is used only for your optional sign-in state, saved server listings, and community votes.',
    },
    '/terms': {
      title: 'Terms of Service',
      body: 'All SurgeTrix tools are provided free of charge for Minecraft players, server administrators, and developers. SurgeTrix is an independent community project and is not affiliated with Mojang or Microsoft.',
    },
    '/dmca': {
      title: 'DMCA & Copyright',
      body: 'Community-published plugins, mods, and resource packs must respect original author licenses. Contact the SurgeTrix moderation team for takedown inquiries.',
    },
    '/contact': {
      title: 'Contact SurgeTrix',
      body: 'Reach our support team via the Community board or Discord for server verification, plugin submissions, and business tier inquiries.',
    },
    '/developers/docs': {
      title: 'SurgeTrix Developer & Plugin Docs',
      body: 'Integrate your Paper/Purpur server metrics with SurgeTrix Network Health Monitor using standard JSON payloads over HTTPS.',
    },
    '/developers/api-keys': {
      title: 'Developer API Keys',
      body: 'Pro and Business accounts can generate scoped API tokens to push live TPS and player-count snapshots automatically.',
    },
    '/school': {
      title: 'SurgeTrix School',
      body: 'Interactive tutorials for server administration, JVM tuning, LuckPerms hierarchy design, and MiniMessage formatting.',
    },
  };

  const entry = map[path] || {
    title: 'SurgeTrix Information',
    body: 'Explore calculators, formatters, server utilities, and guides across the SurgeTrix platform.',
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{entry.title}</h1>
      <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">{entry.body}</p>
      <button
        type="button"
        onClick={() => onNavigate('/tools')}
        className="px-4 py-2.5 st-btn-primary text-sm font-semibold cursor-pointer"
      >
        Explore SurgeTrix Tools
      </button>
    </div>
  );
};
