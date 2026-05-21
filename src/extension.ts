import * as vscode from 'vscode';
import { filterLines, isJunkLine } from './filterEngine';
import { TerminalCapture } from './terminalCapture';
import { FilteredTerminal } from './filteredTerminal';
import { StatusBarManager } from './statusBarManager';

let terminalCapture: TerminalCapture;
let statusBar: StatusBarManager;
let filteredTerminal: FilteredTerminal | undefined;
let trackedTerminal: vscode.Terminal | undefined;
let snapshotBuffer: string[] = [];
let mergedBufferCache: string[] | undefined;
let currentPattern = '';
let isRegex = false;
let isCaseSensitive = false;
let activeInputBox: vscode.InputBox | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let contextLines = 0;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('terminalFilter');

  terminalCapture = new TerminalCapture(
    config.get<number>('maxBufferLines', 50000)
  );
  statusBar = new StatusBarManager();
  isRegex = config.get<boolean>('defaultRegex', false);
  isCaseSensitive = config.get<boolean>('defaultCaseSensitive', false);
  contextLines = config.get<number>('contextLines', 0);

  context.subscriptions.push(terminalCapture, statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand('terminalFilter.filter', async () => {
      if (!vscode.window.activeTerminal) {
        vscode.window.showInformationMessage('No active terminal.');
        return;
      }
      trackedTerminal = vscode.window.activeTerminal;
      await snapshotTerminal();
      ensureFilteredTerminal();
      applyFilter();
      showFilterInput();
    }),

    vscode.commands.registerCommand('terminalFilter.clearFilter', () => {
      clearFilter();
    }),

    vscode.commands.registerCommand('terminalFilter.clearBuffer', () => {
      snapshotBuffer = [];
      mergedBufferCache = undefined;
      terminalCapture.clearBuffer(trackedTerminal);
      if (filteredTerminal?.isOpen()) {
        filteredTerminal.showMessage('Buffer cleared.');
      }
      statusBar.hide();
    })
  );

  context.subscriptions.push(
    terminalCapture.onDidReceiveLines(({ terminal }) => {
      if (terminal !== trackedTerminal || !filteredTerminal?.isOpen()) {
        return;
      }
      mergedBufferCache = undefined;
      scheduleRefresh();
    })
  );

  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((terminal) => {
      if (terminal === trackedTerminal) {
        clearFilter();
        trackedTerminal = undefined;
        snapshotBuffer = [];
        mergedBufferCache = undefined;
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('terminalFilter')) {
        const cfg = vscode.workspace.getConfiguration('terminalFilter');
        terminalCapture.updateMaxLines(cfg.get<number>('maxBufferLines', 50000));
        contextLines = cfg.get<number>('contextLines', 0);
      }
    })
  );

  if (vscode.window.activeTerminal) {
    trackedTerminal = vscode.window.activeTerminal;
  }
}

async function snapshotTerminal(): Promise<void> {
  const savedClipboard = await vscode.env.clipboard.readText();

  await vscode.commands.executeCommand('workbench.action.terminal.selectAll');
  await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
  await vscode.commands.executeCommand('workbench.action.terminal.clearSelection');

  const content = await vscode.env.clipboard.readText();
  await vscode.env.clipboard.writeText(savedClipboard);

  snapshotBuffer = content.split('\n').filter(line => !isJunkLine(line));
  mergedBufferCache = undefined;
}

function getMergedBuffer(): string[] {
  if (mergedBufferCache) return mergedBufferCache;

  if (!trackedTerminal) {
    mergedBufferCache = snapshotBuffer;
    return snapshotBuffer;
  }

  const liveBuffer = terminalCapture.getBuffer(trackedTerminal);
  if (liveBuffer.length === 0) {
    mergedBufferCache = snapshotBuffer;
  } else if (snapshotBuffer.length === 0) {
    mergedBufferCache = liveBuffer;
  } else {
    mergedBufferCache = [...snapshotBuffer, ...liveBuffer];
  }

  return mergedBufferCache;
}

function ensureFilteredTerminal() {
  if (filteredTerminal?.isOpen() || !trackedTerminal) return;

  filteredTerminal = new FilteredTerminal();
  filteredTerminal.onDidClose(() => {
    filteredTerminal = undefined;
    currentPattern = '';
    statusBar.hide();
  });
  filteredTerminal.create(trackedTerminal, currentPattern);
}

function makeButtons(): vscode.QuickInputButton[] {
  const activeColor = new vscode.ThemeColor('focusBorder');
  return [
    {
      iconPath: new vscode.ThemeIcon('regex', isRegex ? activeColor : undefined),
      tooltip: isRegex ? 'Regex (ON)' : 'Regex (OFF)',
    },
    {
      iconPath: new vscode.ThemeIcon('case-sensitive', isCaseSensitive ? activeColor : undefined),
      tooltip: isCaseSensitive ? 'Case Sensitive (ON)' : 'Case Sensitive (OFF)',
    },
  ];
}

function showFilterInput() {
  if (activeInputBox) {
    activeInputBox.dispose();
  }

  const inputBox = vscode.window.createInputBox();
  inputBox.placeholder = 'Filter terminal output...';
  inputBox.value = currentPattern;
  inputBox.ignoreFocusOut = true;
  inputBox.buttons = makeButtons();
  activeInputBox = inputBox;

  inputBox.onDidChangeValue((value) => {
    currentPattern = value;
    scheduleRefresh();
  });

  inputBox.onDidTriggerButton((button) => {
    if (button.tooltip?.includes('Regex')) {
      isRegex = !isRegex;
    } else if (button.tooltip?.includes('Case')) {
      isCaseSensitive = !isCaseSensitive;
    }
    inputBox.buttons = makeButtons();
    applyFilter();
  });

  let accepted = false;

  inputBox.onDidAccept(() => {
    accepted = true;
    inputBox.hide();
  });

  inputBox.onDidHide(() => {
    if (!accepted) {
      clearFilter();
    }
    activeInputBox = undefined;
    inputBox.dispose();
  });

  inputBox.show();
}

function applyFilter() {
  if (!filteredTerminal?.isOpen()) return;

  const buffer = getMergedBuffer();
  const filtered = filterLines(buffer, currentPattern, isRegex, isCaseSensitive, contextLines);

  filteredTerminal.updateName(currentPattern);
  filteredTerminal.writeLines(filtered);

  if (currentPattern) {
    statusBar.update(filtered.length, buffer.length);
  } else {
    statusBar.hide();
  }
}

function scheduleRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    applyFilter();
  }, 100);
}

function clearFilter() {
  currentPattern = '';
  mergedBufferCache = undefined;
  if (filteredTerminal) {
    filteredTerminal.close();
    filteredTerminal = undefined;
  }
  statusBar.hide();
  if (activeInputBox) {
    activeInputBox.hide();
  }
}

export function deactivate() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
}
