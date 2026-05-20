import * as vscode from 'vscode';
import { filterLines, FilteredLine } from './filterEngine';
import { TerminalCapture } from './terminalCapture';
import { FilteredTerminalView } from './filteredTerminalView';
import { StatusBarManager } from './statusBarManager';

let terminalCapture: TerminalCapture;
let filteredView: FilteredTerminalView;
let statusBar: StatusBarManager;
let currentPattern = '';
let trackedTerminal: vscode.Terminal | undefined;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('terminalFilter');

  terminalCapture = new TerminalCapture(
    config.get<number>('maxBufferLines', 50000)
  );
  filteredView = new FilteredTerminalView(context.extensionUri);
  statusBar = new StatusBarManager();

  filteredView.setDefaults(
    config.get<boolean>('defaultRegex', false),
    config.get<boolean>('defaultCaseSensitive', false)
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      FilteredTerminalView.viewType,
      filteredView,
      { webviewOptions: { retainContextWhenHidden: true } }
    ),
    terminalCapture,
    statusBar,
    filteredView
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('terminalFilter.focus', () => {
      vscode.commands.executeCommand('terminalFilter.filteredView.focus');
      filteredView.focusInput();
    }),

    vscode.commands.registerCommand('terminalFilter.clearBuffer', () => {
      terminalCapture.clearBuffer(trackedTerminal);
      filteredView.clear();
      statusBar.hide();
    }),

    vscode.commands.registerCommand('terminalFilter.clearFilter', () => {
      currentPattern = '';
      refreshFilteredOutput();
      statusBar.hide();
    })
  );

  context.subscriptions.push(
    filteredView.onFilterChange(({ pattern, isRegex, isCaseSensitive }) => {
      currentPattern = pattern;
      refreshFilteredOutput();
    })
  );

  context.subscriptions.push(
    filteredView.onClearBuffer(() => {
      terminalCapture.clearBuffer(trackedTerminal);
      filteredView.clear();
      statusBar.hide();
    })
  );

  context.subscriptions.push(
    terminalCapture.onDidReceiveLines(({ terminal }) => {
      if (!trackedTerminal) {
        trackedTerminal = terminal;
        filteredView.setTerminalName(terminal.name);
      }
      if (terminal === trackedTerminal) {
        refreshFilteredOutput();
      }
    })
  );

  context.subscriptions.push(
    terminalCapture.onDidClear(() => {
      filteredView.clear();
      statusBar.hide();
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTerminal((terminal) => {
      if (terminal) {
        trackedTerminal = terminal;
        filteredView.setTerminalName(terminal.name);
        refreshFilteredOutput();
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((terminal) => {
      if (terminal === trackedTerminal) {
        trackedTerminal = vscode.window.activeTerminal ?? undefined;
        if (trackedTerminal) {
          filteredView.setTerminalName(trackedTerminal.name);
        }
        refreshFilteredOutput();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('terminalFilter.maxBufferLines')) {
        const newMax = vscode.workspace
          .getConfiguration('terminalFilter')
          .get<number>('maxBufferLines', 50000);
        terminalCapture.updateMaxLines(newMax);
      }
    })
  );

  if (vscode.window.activeTerminal) {
    trackedTerminal = vscode.window.activeTerminal;
  }
}

function refreshFilteredOutput() {
  if (!trackedTerminal) {
    filteredView.clear();
    statusBar.hide();
    return;
  }

  const buffer = terminalCapture.getBuffer(trackedTerminal);
  if (buffer.length === 0) {
    filteredView.clear();
    statusBar.hide();
    return;
  }

  const config = vscode.workspace.getConfiguration('terminalFilter');
  const contextLines = config.get<number>('contextLines', 0);

  const filtered = filterLines(
    buffer,
    currentPattern,
    filteredView.isRegex,
    filteredView.isCaseSensitive,
    contextLines
  );

  filteredView.setLines(filtered, filtered.length, buffer.length);

  if (currentPattern) {
    statusBar.update(filtered.length, buffer.length);
  } else {
    statusBar.hide();
  }
}

export function deactivate() {}
