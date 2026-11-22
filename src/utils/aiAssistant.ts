export const MAX_AI_PROMPT_LENGTH = 2000;
export const MAX_AI_HISTORY_TURNS = 12;

export interface AiChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface GeminiHistoryEntry {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface ReplyBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

export interface SuggestedSurgeTool {
  label: string;
  path: string;
}

export function validateAiPrompt(
  rawPrompt: unknown
): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof rawPrompt !== 'string') {
    return { ok: false, error: 'Prompt must be a non-empty text string.' };
  }
  const trimmed = rawPrompt.trim();
  if (!trimmed) {
    return { ok: false, error: 'Please enter a question before sending.' };
  }
  if (trimmed.length > MAX_AI_PROMPT_LENGTH) {
    return {
      ok: false,
      error: `Prompt is too long (${trimmed.length} characters). Keep questions under ${MAX_AI_PROMPT_LENGTH} characters.`,
    };
  }
  return { ok: true, text: trimmed };
}

export function normalizeChatHistory(rawHistory: unknown): GeminiHistoryEntry[] {
  if (!Array.isArray(rawHistory)) return [];

  const sanitized: GeminiHistoryEntry[] = [];
  for (const item of rawHistory) {
    if (!item || typeof item !== 'object') continue;
    const roleRaw = (item as { role?: unknown }).role;
    const textRaw = (item as { text?: unknown }).text;
    if (typeof textRaw !== 'string') continue;
    const text = textRaw.trim().slice(0, 4000);
    if (!text) continue;

    if (roleRaw === 'user') {
      sanitized.push({ role: 'user', parts: [{ text }] });
    } else if (roleRaw === 'assistant' || roleRaw === 'model') {
      sanitized.push({ role: 'model', parts: [{ text }] });
    }
  }

  // Gemini chat history should start with a user turn and alternate cleanly.
  const firstUserIndex = sanitized.findIndex((entry) => entry.role === 'user');
  const fromFirstUser = firstUserIndex >= 0 ? sanitized.slice(firstUserIndex) : [];

  const alternating: GeminiHistoryEntry[] = [];
  for (const entry of fromFirstUser) {
    const prev = alternating[alternating.length - 1];
    if (!prev || prev.role !== entry.role) {
      alternating.push(entry);
    }
  }

  return alternating.slice(-MAX_AI_HISTORY_TURNS);
}

export function parseAssistantReply(rawText: string): ReplyBlock[] {
  const source = rawText.replace(/\r\n/g, '\n').trim();
  if (!source) return [];

  const blocks: ReplyBlock[] = [];
  const fenceRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(source)) !== null) {
    const before = source.slice(lastIndex, match.index).trim();
    if (before) {
      blocks.push({ type: 'text', content: before });
    }
    const language = match[1]?.trim() || undefined;
    const code = match[2].replace(/\n+$/, '');
    if (code) {
      blocks.push({ type: 'code', content: code, language });
    }
    lastIndex = fenceRegex.lastIndex;
  }

  const trailing = source.slice(lastIndex).trim();
  if (trailing) {
    blocks.push({ type: 'text', content: trailing });
  }

  return blocks.length > 0 ? blocks : [{ type: 'text', content: source }];
}

const TOOL_PATTERNS: Array<{ keywords: string[]; tool: SuggestedSurgeTool }> = [
  {
    keywords: ['luckperms', 'permission', 'rank', 'lp group', 'meta setprefix'],
    tool: { label: 'Open Permissions & LuckPerms Helper →', path: '/tools/permissions' },
  },
  {
    keywords: ['spark', 'tps', 'mspt', 'tick lag', 'profiler'],
    tool: { label: 'Open Spark Profiler Analyzer →', path: '/tools/spark-analyzer' },
  },
  {
    keywords: ['aikar', 'jvm flag', 'g1gc', '-xmx', 'startup script'],
    tool: { label: 'Open JVM Startup Flags Generator →', path: '/tools/jvm-flags' },
  },
  {
    keywords: ['motd', 'server.properties', 'gradient', 'minimessage'],
    tool: { label: 'Open MOTD Generator →', path: '/tools/motd' },
  },
  {
    keywords: ['nether', 'portal', 'overworld', '8:1'],
    tool: { label: 'Open Nether Coordinate Calculator →', path: '/tools/nether' },
  },
  {
    keywords: ['yaml', 'indentation', 'tab config', 'bukkit.yml', 'paper-global'],
    tool: { label: 'Open YAML Validator →', path: '/tools/yaml-validator' },
  },
  {
    keywords: ['placeholderapi', 'papi', 'tab plugin', 'scoreboard'],
    tool: { label: 'Open TAB Placeholder Studio →', path: '/tools/tab-placeholders' },
  },
  {
    keywords: ['whitelist', 'uuid', 'offline uuid'],
    tool: { label: 'Open Whitelist & UUID Generator →', path: '/tools/uuid' },
  },
];

export function detectMatchingSurgeTrixTool(
  prompt: string,
  reply?: string
): SuggestedSurgeTool | undefined {
  const haystack = `${prompt}\n${reply ?? ''}`.toLowerCase();
  for (const entry of TOOL_PATTERNS) {
    if (entry.keywords.some((kw) => haystack.includes(kw))) {
      return entry.tool;
    }
  }
  return undefined;
}

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string };

export function parseInlineTokens(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: line.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'text', value: line.slice(lastIndex) });
  }
  return tokens;
}

export type MarkdownLine =
  | { type: 'heading'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'divider' }
  | { type: 'paragraph'; text: string }
  | { type: 'blank' };

export function parseMarkdownLines(text: string): MarkdownLine[] {
  return text.split('\n').map((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) return { type: 'blank' };
    if (/^-{3,}$/.test(trimmed)) return { type: 'divider' };
    const headingMatch = /^#{1,4}\s+(.+)$/.exec(trimmed);
    if (headingMatch) return { type: 'heading', text: headingMatch[1] };
    const bulletMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bulletMatch) return { type: 'bullet', text: bulletMatch[1] };
    return { type: 'paragraph', text: trimmed };
  });
}

