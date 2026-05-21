import * as vscode from 'vscode';

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      'terminalFilter.status',
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = 'terminalFilter.filter';
    this.item.name = 'Terminal Filter';
  }

  update(matchCount: number, totalLines: number): void {
    this.item.text = `$(filter) ${matchCount}/${totalLines}`;
    this.item.tooltip = `Terminal Filter: showing ${matchCount} of ${totalLines} lines. Click to focus.`;
    this.item.show();
  }

  hide(): void {
    this.item.hide();
  }

  dispose(): void {
    this.item.dispose();
  }
}
