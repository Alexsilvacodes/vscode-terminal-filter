import * as vscode from 'vscode';
import { stripNonVisual, isJunkLine } from './filterEngine';

export class TerminalCapture {
  private buffers = new Map<vscode.Terminal, string[]>();
  private maxLines: number;
  private disposables: vscode.Disposable[] = [];

  private _onDidReceiveLines = new vscode.EventEmitter<{
    terminal: vscode.Terminal;
  }>();
  readonly onDidReceiveLines = this._onDidReceiveLines.event;

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

    const clean = stripNonVisual(data);
    const rawLines = clean.split('\n');

    const startsWithNewline = data.startsWith('\n') || data.startsWith('\r\n');

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (i === 0 && !startsWithNewline && buffer.length > 0) {
        buffer[buffer.length - 1] += line;
      } else if (!isJunkLine(line)) {
        buffer.push(line);
      }
    }

    if (buffer.length > this.maxLines) {
      buffer.splice(0, buffer.length - this.maxLines);
    }

    this._onDidReceiveLines.fire({ terminal });
  }

  getBuffer(terminal: vscode.Terminal): string[] {
    return this.buffers.get(terminal) ?? [];
  }

  clearBuffer(terminal?: vscode.Terminal) {
    if (terminal) {
      this.buffers.set(terminal, []);
    } else {
      for (const [t] of this.buffers) {
        this.buffers.set(t, []);
      }
    }
  }

  updateMaxLines(maxLines: number) {
    this.maxLines = maxLines;
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
    this._onDidReceiveLines.dispose();
    this.buffers.clear();
  }
}
