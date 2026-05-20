export interface FilteredLine {
  lineNumber: number;
  text: string;
}

const ANSI_REGEX = new RegExp(
  [
    '\\x1b\\[[0-9;?]*[a-zA-Z]',       // CSI sequences (including DEC private like \x1b[?2004l)
    '\\x1b\\][^\\x07\\x1b]*(?:\\x07|\\x1b\\\\)', // OSC sequences (BEL or ST terminated)
    '\\x1b\\][^\\n]*',                  // unterminated OSC (catch remaining on same line)
    '\\x1b[()][A-Z0-9]',               // charset selection
    '\\x1b[>=<]',                       // keypad / VT52 modes
    '\\x1b[78DEHM]',                    // single-char escape commands
    '\\x1b#[0-9]',                      // line attrs
    '\\x07',                            // standalone BEL
    '\\x0d',                            // carriage return
    '[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1a]', // remaining C0 control chars (keep \\n and \\t)
  ].join('|'),
  'g'
);

export function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

export function isJunkLine(text: string): boolean {
  const stripped = text.trim();
  return stripped.length === 0;
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
    const plain = stripAnsi(lines[i]);
    if (regex.test(plain)) {
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
