import * as vscode from 'vscode';
import { FilteredLine } from './filterEngine';

export class FilteredTerminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number | void>();
  private nameEmitter = new vscode.EventEmitter<string>();
  private _onDidClose = new vscode.EventEmitter<void>();
  readonly onDidClose = this._onDidClose.event;

  private terminal?: vscode.Terminal;

  readonly pty: vscode.Pseudoterminal = {
    onDidWrite: this.writeEmitter.event,
    onDidClose: this.closeEmitter.event,
    onDidChangeName: this.nameEmitter.event,
    open: () => {},
    close: () => {
      this.terminal = undefined;
      this._onDidClose.fire();
    },
  };

  create(parentTerminal: vscode.Terminal, filterPattern: string): void {
    if (this.terminal) {
      return;
    }
    this.terminal = vscode.window.createTerminal({
      name: `Filter: ${filterPattern || '...'}`,
      pty: this.pty,
      location: { parentTerminal },
    });
    this.terminal.show(true);
  }

  isOpen(): boolean {
    return this.terminal !== undefined;
  }

  updateName(filterPattern: string): void {
    this.nameEmitter.fire(`Filter: ${filterPattern || '...'}`);
  }

  writeLines(lines: FilteredLine[]): void {
    if (lines.length === 0) {
      this.writeEmitter.fire('\x1b[2J\x1b[H\x1b[2mNo matching lines.\x1b[0m\r\n');
      return;
    }
    const maxNum = lines[lines.length - 1].lineNumber;
    const pad = String(maxNum).length;
    const parts = ['\x1b[2J\x1b[H'];
    for (const line of lines) {
      const num = String(line.lineNumber).padStart(pad);
      parts.push(`\x1b[2m${num} │\x1b[0m ${line.text}\r\n`);
    }
    this.writeEmitter.fire(parts.join(''));
  }

  showMessage(msg: string): void {
    this.writeEmitter.fire(`\x1b[2J\x1b[H\x1b[2m${msg}\x1b[0m\r\n`);
  }

  close(): void {
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = undefined;
    }
    this.writeEmitter.dispose();
    this.closeEmitter.dispose();
    this.nameEmitter.dispose();
    this._onDidClose.dispose();
  }

  dispose(): void {
    this.close();
  }
}
