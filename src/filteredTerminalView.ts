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

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightMatches(text, pattern, isRgx, caseSensitive) {
    if (!pattern) return escapeHtml(text);
    try {
      const flags = 'g' + (caseSensitive ? '' : 'i');
      const re = isRgx ? new RegExp(pattern, flags) : new RegExp(pattern.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), flags);
      const escaped = escapeHtml(text);
      const escapedPattern = isRgx ? pattern : pattern.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
      const highlightRe = new RegExp(escapedPattern, flags);
      return escaped.replace(highlightRe, '<mark>$&</mark>');
    } catch {
      return escapeHtml(text);
    }
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
      const div = document.createElement('div');
      div.className = 'line';
      const numSpan = document.createElement('span');
      numSpan.className = 'line-number';
      numSpan.textContent = String(line.lineNumber);
      const textSpan = document.createElement('span');
      textSpan.className = 'line-text';
      textSpan.innerHTML = highlightMatches(line.text, pattern, isRgx, caseSensitive);
      div.appendChild(numSpan);
      div.appendChild(textSpan);
      fragment.appendChild(div);
    }
    const existing = outputEl.querySelectorAll('.line');
    existing.forEach(el => el.remove());
    outputEl.appendChild(fragment);
    if (autoScroll) {
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  let lastLines = [];
  let lastPattern = '';
  let lastIsRegex = false;
  let lastCaseSensitive = false;

  window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
      case 'setLines':
        lastLines = msg.lines;
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
          const div = document.createElement('div');
          div.className = 'line';
          const numSpan = document.createElement('span');
          numSpan.className = 'line-number';
          numSpan.textContent = String(line.lineNumber);
          const textSpan = document.createElement('span');
          textSpan.className = 'line-text';
          textSpan.innerHTML = highlightMatches(line.text, currentPattern, isRegex, caseSensitive);
          div.appendChild(numSpan);
          div.appendChild(textSpan);
          outputEl.appendChild(div);
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
