export interface FilteredLine {
  lineNumber: number;
  text: string;
}

const SHARED_ESCAPE_PATTERNS = [
  '\\x1b\\][^\\x07\\x1b]*(?:\\x07|\\x1b\\\\)',
  '\\x1b\\][^\\n]*',
  '\\x1b[()][A-Z0-9]',
  '\\x1b[>=<]',
  '\\x1b[78DEHM]',
  '\\x1b#[0-9]',
  '\\x07',
  '\\x0d',
  '[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1a]',
];

const ANSI_REGEX = new RegExp(
  ['\\x1b\\[[0-9;?]*[a-zA-Z]', ...SHARED_ESCAPE_PATTERNS].join('|'),
  'g'
);

const NON_VISUAL_REGEX = new RegExp(
  ['\\x1b\\[[0-9;?]*[A-Za-ln-z]', ...SHARED_ESCAPE_PATTERNS].join('|'),
  'g'
);

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

export function stripNonVisual(text: string): string {
  return text.replace(NON_VISUAL_REGEX, '');
}

export function isJunkLine(text: string): boolean {
  return stripAnsi(text).trim().length === 0;
}

export function filterLines(
  lines: string[],
  pattern: string,
  isRegex: boolean,
  isCaseSensitive: boolean,
  contextLines: number
): FilteredLine[] {
  if (!pattern) {
    return lines.map((text, i) => ({ lineNumber: i + 1, text }));
  }

  let regex: RegExp;
  try {
    const flags = isCaseSensitive ? '' : 'i';
    regex = isRegex
      ? new RegExp(pattern, flags)
      : new RegExp(escapeRegex(pattern), flags);
  } catch {
    return [];
  }

  const directMatches = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(stripAnsi(lines[i]))) {
      directMatches.add(i);
    }
  }

  if (contextLines <= 0) {
    return [...directMatches]
      .sort((a, b) => a - b)
      .map(i => ({ lineNumber: i + 1, text: lines[i] }));
  }

  const withContext = new Set<number>();
  for (const idx of directMatches) {
    const start = Math.max(0, idx - contextLines);
    const end = Math.min(lines.length - 1, idx + contextLines);
    for (let i = start; i <= end; i++) {
      withContext.add(i);
    }
  }

  return [...withContext]
    .sort((a, b) => a - b)
    .map(i => ({ lineNumber: i + 1, text: lines[i] }));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
