import * as vscode from 'vscode';

export class FilteredTerminalView implements vscode.WebviewViewProvider {
  public static readonly viewType = 'terminalFilter.filteredView';

  private _view?: vscode.WebviewView;
  private _isRegex = false;
  private _isCaseSensitive = false;

  private _onFilterChange = new vscode.EventEmitter<{
    pattern: string;
    isRegex: boolean;
    isCaseSensitive: boolean;
  }>();
  readonly onFilterChange = this._onFilterChange.event;

  private _onClearBuffer = new vscode.EventEmitter<void>();
  readonly onClearBuffer = this._onClearBuffer.event;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'filterChange':
          this._onFilterChange.fire({
            pattern: message.pattern,
            isRegex: this._isRegex,
            isCaseSensitive: this._isCaseSensitive,
          });
          break;
        case 'toggleRegex':
          this._isRegex = !this._isRegex;
          this._postMessage({ type: 'stateUpdate', isRegex: this._isRegex, isCaseSensitive: this._isCaseSensitive });
          this._onFilterChange.fire({
            pattern: message.currentPattern ?? '',
            isRegex: this._isRegex,
            isCaseSensitive: this._isCaseSensitive,
          });
          break;
        case 'toggleCase':
          this._isCaseSensitive = !this._isCaseSensitive;
          this._postMessage({ type: 'stateUpdate', isRegex: this._isRegex, isCaseSensitive: this._isCaseSensitive });
          this._onFilterChange.fire({
            pattern: message.currentPattern ?? '',
            isRegex: this._isRegex,
            isCaseSensitive: this._isCaseSensitive,
          });
          break;
        case 'clearBuffer':
          this._onClearBuffer.fire();
          break;
      }
    });
  }

  setLines(lines: Array<{ lineNumber: number; text: string }>, matchCount: number, totalLines: number): void {
    this._postMessage({
      type: 'setLines',
      lines,
      matchCount,
      totalLines,
    });
  }

  appendLines(lines: Array<{ lineNumber: number; text: string }>, matchCount: number, totalLines: number): void {
    this._postMessage({
      type: 'appendLines',
      lines,
      matchCount,
      totalLines,
    });
  }

  clear(): void {
    this._postMessage({ type: 'clear' });
  }

  updateMatchInfo(matchCount: number, totalLines: number): void {
    this._postMessage({ type: 'matchInfo', matchCount, totalLines });
  }

  setTerminalName(name: string): void {
    this._postMessage({ type: 'terminalName', name });
  }

  focusInput(): void {
    if (this._view) {
      this._view.show(true);
      this._postMessage({ type: 'focusInput' });
    }
  }

  setDefaults(isRegex: boolean, isCaseSensitive: boolean): void {
    this._isRegex = isRegex;
    this._isCaseSensitive = isCaseSensitive;
    this._postMessage({ type: 'stateUpdate', isRegex, isCaseSensitive });
  }

  get isRegex(): boolean {
    return this._isRegex;
  }

  get isCaseSensitive(): boolean {
    return this._isCaseSensitive;
  }

  private _postMessage(message: unknown): void {
    this._view?.webview.postMessage(message);
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-terminal-fontFamily, var(--vscode-editor-font-family, 'Menlo, Monaco, Courier New, monospace'));
    font-size: var(--vscode-terminal-fontSize, var(--vscode-editor-font-size, 12px));
    color: var(--vscode-terminal-foreground, var(--vscode-foreground));
    background: var(--vscode-terminal-background, var(--vscode-panel-background));
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--vscode-terminal-background, var(--vscode-panel-background));
    border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-widget-border, transparent));
    flex-shrink: 0;
  }

  .filter-input {
    flex: 1;
    min-width: 0;
    padding: 3px 6px;
    border: 1px solid var(--vscode-input-border, transparent);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-family: var(--vscode-terminal-fontFamily, var(--vscode-editor-font-family, monospace));
    font-size: var(--vscode-terminal-fontSize, var(--vscode-editor-font-size, 12px));
    border-radius: 2px;
    outline: none;
  }
  .filter-input:focus {
    border-color: var(--vscode-focusBorder);
  }
  .filter-input::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }
  .filter-input.invalid {
    border-color: var(--vscode-inputValidation-errorBorder, #f44);
  }

  .toggle-btn {
    padding: 2px 6px;
    border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-input-border, #555));
    background: transparent;
    color: var(--vscode-terminal-foreground, var(--vscode-foreground));
    font-family: var(--vscode-terminal-fontFamily, monospace);
    font-size: 11px;
    border-radius: 2px;
    cursor: pointer;
    opacity: 0.6;
    min-width: 24px;
    text-align: center;
    line-height: 1.4;
  }
  .toggle-btn:hover { opacity: 0.85; }
  .toggle-btn.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
    opacity: 1;
  }

  .clear-btn {
    padding: 2px 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--vscode-terminal-foreground, var(--vscode-foreground));
    font-size: 13px;
    border-radius: 2px;
    cursor: pointer;
    opacity: 0.6;
    line-height: 1.4;
  }
  .clear-btn:hover { opacity: 1; }

  .info {
    font-size: 11px;
    color: var(--vscode-terminal-foreground, var(--vscode-foreground));
    opacity: 0.7;
    white-space: nowrap;
    min-width: 50px;
    text-align: right;
  }

  .terminal-name {
    font-size: 10px;
    color: var(--vscode-terminal-foreground, var(--vscode-foreground));
    opacity: 0.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .output {
    flex: 1;
    overflow-y: auto;
    overflow-x: auto;
    padding: 4px 0;
    background: var(--vscode-terminal-background, var(--vscode-panel-background));
    color: var(--vscode-terminal-foreground, var(--vscode-foreground));
    font-size: var(--vscode-terminal-fontSize, var(--vscode-editor-font-size, 12px));
    line-height: var(--vscode-terminal-lineHeight, 1.4);
  }

  .line {
    display: flex;
    padding: 0 8px;
    white-space: pre;
  }
  .line:hover {
    background: var(--vscode-terminal-hoverBackground, var(--vscode-list-hoverBackground, rgba(255,255,255,0.04)));
  }
  .line-number {
    color: var(--vscode-terminal-ansiWhite, var(--vscode-editorLineNumber-foreground, #858585));
    opacity: 0.5;
    min-width: 48px;
    text-align: right;
    padding-right: 12px;
    user-select: none;
    flex-shrink: 0;
  }
  .line-text {
    flex: 1;
    min-width: 0;
  }
  mark {
    background: var(--vscode-terminal-findMatchHighlightBackground, var(--vscode-editor-findMatchHighlightBackground, rgba(255,238,0,0.3)));
    color: inherit;
    border-radius: 1px;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--vscode-terminal-foreground, var(--vscode-foreground));
    opacity: 0.5;
    font-size: 12px;
    text-align: center;
    padding: 20px;
  }
</style>
</head>
<body>
<div class="toolbar">
  <input
    class="filter-input"
    id="filterInput"
    type="text"
    placeholder="Filter terminal output..."
    spellcheck="false"
    autocomplete="off"
  />
  <button class="toggle-btn" id="regexBtn" title="Use Regular Expression">.*</button>
  <button class="toggle-btn" id="caseBtn" title="Match Case">Aa</button>
  <button class="clear-btn" id="clearBtn" title="Clear captured output">&#x1F5D1;</button>
  <span class="terminal-name" id="terminalName"></span>
  <span class="info" id="matchInfo"></span>
</div>
<div class="output" id="output">
  <div class="empty-state" id="emptyState">
    Run commands in the terminal to capture output.<br/>
    Shell integration must be enabled.
  </div>
</div>
<script>
(function() {
  const vscode = acquireVsCodeApi();
  const filterInput = document.getElementById('filterInput');
  const regexBtn = document.getElementById('regexBtn');
  const caseBtn = document.getElementById('caseBtn');
  const clearBtn = document.getElementById('clearBtn');
  const terminalNameEl = document.getElementById('terminalName');
  const matchInfoEl = document.getElementById('matchInfo');
  const outputEl = document.getElementById('output');
  const emptyStateEl = document.getElementById('emptyState');

  let debounceTimer = null;
  let isRegex = false;
  let currentPattern = '';
  let autoScroll = true;

  // ANSI color code -> CSS variable mapping
  const FG = {
    30:'var(--vscode-terminal-ansiBlack)',31:'var(--vscode-terminal-ansiRed)',
    32:'var(--vscode-terminal-ansiGreen)',33:'var(--vscode-terminal-ansiYellow)',
    34:'var(--vscode-terminal-ansiBlue)',35:'var(--vscode-terminal-ansiMagenta)',
    36:'var(--vscode-terminal-ansiCyan)',37:'var(--vscode-terminal-ansiWhite)',
    90:'var(--vscode-terminal-ansiBrightBlack)',91:'var(--vscode-terminal-ansiBrightRed)',
    92:'var(--vscode-terminal-ansiBrightGreen)',93:'var(--vscode-terminal-ansiBrightYellow)',
    94:'var(--vscode-terminal-ansiBrightBlue)',95:'var(--vscode-terminal-ansiBrightMagenta)',
    96:'var(--vscode-terminal-ansiBrightCyan)',97:'var(--vscode-terminal-ansiBrightWhite)',
  };
  const BG = {
    40:'var(--vscode-terminal-ansiBlack)',41:'var(--vscode-terminal-ansiRed)',
    42:'var(--vscode-terminal-ansiGreen)',43:'var(--vscode-terminal-ansiYellow)',
    44:'var(--vscode-terminal-ansiBlue)',45:'var(--vscode-terminal-ansiMagenta)',
    46:'var(--vscode-terminal-ansiCyan)',47:'var(--vscode-terminal-ansiWhite)',
    100:'var(--vscode-terminal-ansiBrightBlack)',101:'var(--vscode-terminal-ansiBrightRed)',
    102:'var(--vscode-terminal-ansiBrightGreen)',103:'var(--vscode-terminal-ansiBrightYellow)',
    104:'var(--vscode-terminal-ansiBrightBlue)',105:'var(--vscode-terminal-ansiBrightMagenta)',
    106:'var(--vscode-terminal-ansiBrightCyan)',107:'var(--vscode-terminal-ansiBrightWhite)',
  };

  function color256(n) {
    if (n < 8) return FG[n + 30];
    if (n < 16) return FG[n - 8 + 90];
    if (n < 232) {
      n -= 16;
      const r = Math.floor(n / 36) * 51;
      const g = Math.floor((n % 36) / 6) * 51;
      const b = (n % 6) * 51;
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    const v = (n - 232) * 10 + 8;
    return 'rgb(' + v + ',' + v + ',' + v + ')';
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildStyle(fg, bg, bold, dim, italic, underline) {
    let s = '';
    if (fg) s += 'color:' + fg + ';';
    if (bg) s += 'background-color:' + bg + ';';
    if (bold) s += 'font-weight:bold;';
    if (dim) s += 'opacity:0.7;';
    if (italic) s += 'font-style:italic;';
    if (underline) s += 'text-decoration:underline;';
    return s;
  }

  var RE_SPECIAL = /[-\\/\\\\^$*+?.()|[\\]{}]/g;
  function escapeRegexStr(s) {
    return s.replace(RE_SPECIAL, '\\\\$&');
  }

  function highlightText(html, pattern, isRgx, caseSensitive) {
    if (!pattern) return html;
    try {
      const flags = 'g' + (caseSensitive ? '' : 'i');
      const escaped = isRgx ? pattern : escapeRegexStr(pattern);
      return html.replace(new RegExp(escaped, flags), '<mark>$&</mark>');
    } catch { return html; }
  }

  // Parse ANSI SGR codes into styled HTML, with optional match highlighting
  function ansiToHtml(raw, pattern, isRgx, caseSensitive) {
    const SGR = /\\x1b\\[([0-9;]*)m/g;
    let result = '';
    let last = 0;
    let fg = null, bg = null, bold = false, dim = false, italic = false, underline = false;

    let m;
    while ((m = SGR.exec(raw)) !== null) {
      const before = raw.substring(last, m.index);
      if (before) {
        const html = highlightText(escapeHtml(before), pattern, isRgx, caseSensitive);
        const style = buildStyle(fg, bg, bold, dim, italic, underline);
        result += style ? '<span style="' + style + '">' + html + '</span>' : html;
      }
      last = SGR.lastIndex;

      const params = m[1] ? m[1].split(';').map(Number) : [0];
      let i = 0;
      while (i < params.length) {
        const p = params[i];
        if (p === 0) { fg = null; bg = null; bold = false; dim = false; italic = false; underline = false; }
        else if (p === 1) bold = true;
        else if (p === 2) dim = true;
        else if (p === 3) italic = true;
        else if (p === 4) underline = true;
        else if (p === 22) { bold = false; dim = false; }
        else if (p === 23) italic = false;
        else if (p === 24) underline = false;
        else if (p >= 30 && p <= 37) fg = FG[p];
        else if (p === 38) {
          if (params[i+1] === 5 && i+2 < params.length) { fg = color256(params[i+2]); i += 2; }
          else if (params[i+1] === 2 && i+4 < params.length) { fg = 'rgb('+params[i+2]+','+params[i+3]+','+params[i+4]+')'; i += 4; }
        }
        else if (p === 39) fg = null;
        else if (p >= 40 && p <= 47) bg = BG[p];
        else if (p === 48) {
          if (params[i+1] === 5 && i+2 < params.length) { bg = color256(params[i+2]); i += 2; }
          else if (params[i+1] === 2 && i+4 < params.length) { bg = 'rgb('+params[i+2]+','+params[i+3]+','+params[i+4]+')'; i += 4; }
        }
        else if (p === 49) bg = null;
        else if (p >= 90 && p <= 97) fg = FG[p];
        else if (p >= 100 && p <= 107) bg = BG[p];
        i++;
      }
    }

    const tail = raw.substring(last);
    if (tail) {
      const html = highlightText(escapeHtml(tail), pattern, isRgx, caseSensitive);
      const style = buildStyle(fg, bg, bold, dim, italic, underline);
      result += style ? '<span style="' + style + '">' + html + '</span>' : html;
    }

    return result;
  }

  function renderLineHtml(text, pattern, isRgx, caseSensitive) {
    if (/\\x1b\\[/.test(text)) {
      return ansiToHtml(text, pattern, isRgx, caseSensitive);
    }
    return highlightText(escapeHtml(text), pattern, isRgx, caseSensitive);
  }

  outputEl.addEventListener('scroll', () => {
    const atBottom = outputEl.scrollHeight - outputEl.scrollTop - outputEl.clientHeight < 30;
    autoScroll = atBottom;
  });

  filterInput.addEventListener('input', () => {
    currentPattern = filterInput.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (isRegex && currentPattern) {
        try {
          new RegExp(currentPattern);
          filterInput.classList.remove('invalid');
        } catch {
          filterInput.classList.add('invalid');
          return;
        }
      } else {
        filterInput.classList.remove('invalid');
      }
      vscode.postMessage({ type: 'filterChange', pattern: currentPattern });
    }, 150);
  });

  filterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      filterInput.value = '';
      currentPattern = '';
      filterInput.classList.remove('invalid');
      vscode.postMessage({ type: 'filterChange', pattern: '' });
    }
  });

  regexBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'toggleRegex', currentPattern });
  });

  caseBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'toggleCase', currentPattern });
  });

  clearBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'clearBuffer' });
  });

  function makeLine(line, pattern, isRgx, caseSensitive) {
    const div = document.createElement('div');
    div.className = 'line';
    const numSpan = document.createElement('span');
    numSpan.className = 'line-number';
    numSpan.textContent = String(line.lineNumber);
    const textSpan = document.createElement('span');
    textSpan.className = 'line-text';
    textSpan.innerHTML = renderLineHtml(line.text, pattern, isRgx, caseSensitive);
    div.appendChild(numSpan);
    div.appendChild(textSpan);
    return div;
  }

  function renderLines(lines, pattern, isRgx, caseSensitive) {
    if (lines.length === 0) {
      emptyStateEl.style.display = 'flex';
      emptyStateEl.textContent = pattern ? 'No matching lines.' : 'Run commands in the terminal to capture output.';
      const existing = outputEl.querySelectorAll('.line');
      existing.forEach(el => el.remove());
      return;
    }
    emptyStateEl.style.display = 'none';
    const fragment = document.createDocumentFragment();
    for (const line of lines) {
      fragment.appendChild(makeLine(line, pattern, isRgx, caseSensitive));
    }
    const existing = outputEl.querySelectorAll('.line');
    existing.forEach(el => el.remove());
    outputEl.appendChild(fragment);
    if (autoScroll) {
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
      case 'setLines':
        renderLines(msg.lines, currentPattern, isRegex, caseBtn.classList.contains('active'));
        if (msg.matchCount !== undefined) {
          matchInfoEl.textContent = msg.totalLines > 0 ? msg.matchCount + ' / ' + msg.totalLines : '';
        }
        break;
      case 'appendLines':
        if (msg.lines.length === 0) break;
        emptyStateEl.style.display = 'none';
        const caseSensitive = caseBtn.classList.contains('active');
        for (const line of msg.lines) {
          outputEl.appendChild(makeLine(line, currentPattern, isRegex, caseSensitive));
        }
        if (autoScroll) {
          outputEl.scrollTop = outputEl.scrollHeight;
        }
        if (msg.matchCount !== undefined) {
          matchInfoEl.textContent = msg.totalLines > 0 ? msg.matchCount + ' / ' + msg.totalLines : '';
        }
        break;
      case 'clear':
        const allLines = outputEl.querySelectorAll('.line');
        allLines.forEach(el => el.remove());
        emptyStateEl.style.display = 'flex';
        emptyStateEl.textContent = 'Run commands in the terminal to capture output.';
        matchInfoEl.textContent = '';
        break;
      case 'stateUpdate':
        isRegex = msg.isRegex;
        regexBtn.classList.toggle('active', msg.isRegex);
        caseBtn.classList.toggle('active', msg.isCaseSensitive);
        break;
      case 'matchInfo':
        matchInfoEl.textContent = msg.totalLines > 0 ? msg.matchCount + ' / ' + msg.totalLines : '';
        break;
      case 'terminalName':
        terminalNameEl.textContent = msg.name;
        terminalNameEl.title = msg.name;
        break;
      case 'focusInput':
        filterInput.focus();
        filterInput.select();
        break;
    }
  });

  filterInput.focus();
})();
</script>
</body>
</html>`;
  }

  dispose(): void {
    this._onFilterChange.dispose();
    this._onClearBuffer.dispose();
  }
}
