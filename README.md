# Terminal Filter for VS Code

Terminal output filtering for VS Code. Type a pattern and only matching lines are shown.

The extension captures terminal output via the Shell Integration API and displays it in a dedicated **Terminal Filter** panel with real-time filtering, regex support, and match highlighting.

## Usage

1. Open the **Terminal Filter** panel from the bottom panel tabs
2. Run commands in the integrated terminal
3. Type a filter pattern — only matching lines are shown with their original line numbers

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+Shift+F` (Mac) / `Ctrl+Shift+F` (Win/Linux) | Focus the filter panel (when terminal is focused) |
| `Escape` | Clear the filter pattern |

### Filter bar controls

- **`.*`** — Toggle regex mode
- **`Aa`** — Toggle case sensitivity
- **Trash icon** — Clear the captured output buffer

## Commands

- `Terminal Filter: Focus Terminal Filter` — Open and focus the filter panel
- `Terminal Filter: Clear Captured Output` — Clear the output buffer
- `Terminal Filter: Clear Filter Pattern` — Reset the filter

## Settings

| Setting | Default | Description |
|---|---|---|
| `terminalFilter.defaultRegex` | `false` | Start in regex mode |
| `terminalFilter.defaultCaseSensitive` | `false` | Case-sensitive matching by default |
| `terminalFilter.maxBufferLines` | `50000` | Maximum lines kept in the capture buffer |
| `terminalFilter.contextLines` | `0` | Lines of context to show around matches |

## Requirements

- VS Code 1.100+
- Shell integration must be enabled in the terminal (enabled by default in modern VS Code with bash/zsh)

## Limitations

- Only captures output from commands executed **after** the extension activates — previous terminal history is not available
- Shell integration must be supported by your shell for output capture to work

## Install from source

```sh
npm install
npm run compile
vsce package --allow-missing-repository
code --install-extension vscode-terminal-filter-0.1.0.vsix
```

## Development

```sh
npm install
npm run watch
```

Press **F5** in VS Code to launch the Extension Development Host.

## License

MIT
