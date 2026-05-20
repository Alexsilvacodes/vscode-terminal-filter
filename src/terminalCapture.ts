import * as vscode from 'vscode';
import { stripAnsi, isJunkLine } from './filterEngine';

export class TerminalCapture {
  private buffers = new Map<vscode.Terminal, string[]>();
  private maxLines: number;
  private disposables: vscode.Disposable[] = [];

  private _onDidReceiveLines = new vscode.EventEmitter<{
    terminal: vscode.Terminal;
    lines: string[];
    startIndex: number;
  }>();
  readonly onDidReceiveLines = this._onDidReceiveLines.event;

  private _onDidClear = new vscode.EventEmitter<vscode.Terminal>();
  readonly onDidClear = this._onDidClear.event;

  constructor(maxLines: number) {
    this.maxLines = maxLines;

    this.disposables.push(
      vscode.window.onDidStartTerminalShellExecution(async (e) => {
        this.captureExecution(e.terminal, e.execution);
      })
    );

    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        this.buffers.delete(terminal);
      })
    );
  }

  private async captureExecution(
    terminal: vscode.Terminal,
    execution: vscode.TerminalShellExecution
  ) {
    const stream = execution.read();
    for await (const data of stream) {
      this.processData(terminal, data);
    }
  }

  private processData(terminal: vscode.Terminal, data: string) {
    if (!this.buffers.has(terminal)) {
      this.buffers.set(terminal, []);
    }
    const buffer = this.buffers.get(terminal)!;
    const startIndex = buffer.length;

    const clean = stripAnsi(data);
    const rawLines = clean.split('\n');

    const incoming: string[] = [];
    for (const line of rawLines) {
      if (!isJunkLine(line)) {
        incoming.push(line);
      }
    }

    if (incoming.length === 0) {
      return;
    }

    if (buffer.length > 0 && !data.startsWith('\n') && !data.startsWith('\r\n')) {
      buffer[buffer.length - 1] += incoming[0];
      incoming.shift();
    }

    buffer.push(...incoming);

    if (buffer.length > this.maxLines) {
      const excess = buffer.length - this.maxLines;
      buffer.splice(0, excess);
    }

    this._onDidReceiveLines.fire({
      terminal,
      lines: incoming,
      startIndex,
    });
  }

  getBuffer(terminal: vscode.Terminal): string[] {
    return this.buffers.get(terminal) ?? [];
  }

  clearBuffer(terminal?: vscode.Terminal) {
    if (terminal) {
      this.buffers.set(terminal, []);
      this._onDidClear.fire(terminal);
    } else {
      for (const [t] of this.buffers) {
        this.buffers.set(t, []);
        this._onDidClear.fire(t);
      }
    }
  }

  updateMaxLines(maxLines: number) {
    this.maxLines = maxLines;
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
    this._onDidReceiveLines.dispose();
    this._onDidClear.dispose();
    this.buffers.clear();
  }
}
