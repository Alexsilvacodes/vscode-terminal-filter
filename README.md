# Terminal Filter for VS Code

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/alexsilvafdev.vscode-terminal-filter)](https://marketplace.visualstudio.com/items?itemName=alexsilvafdev.vscode-terminal-filter)

Terminal output filtering for VS Code. Type a pattern and only matching lines are shown in a split terminal — like Xcode's console filter.

## Install

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=alexsilvafdev.vscode-terminal-filter), or search for **Terminal Filter** in the Extensions tab.

## Usage

1. Run commands in the integrated terminal
2. Press `Cmd+Shift+L` (Mac) / `Ctrl+Shift+L` (Win/Linux) to open the filter
3. Type a pattern — a split terminal appears showing only matching lines
4. **Enter** — closes the input, keeps the filtered view
5. **Escape** — closes the input and the filtered view

### Filter input controls

- **`.*`** button — Toggle regex mode
- **`Aa`** button — Toggle case sensitivity

## Commands

- `Terminal Filter: Filter Terminal Output` — Open the filter input
- `Terminal Filter: Clear Filter` — Close the filtered view
- `Terminal Filter: Clear Captured Output` — Clear the capture buffer

## Settings

| Setting | Default | Description |
|---|---|---|
| `terminalFilter.defaultRegex` | `false` | Start in regex mode |
| `terminalFilter.defaultCaseSensitive` | `false` | Case-sensitive matching by default |
| `terminalFilter.maxBufferLines` | `50000` | Maximum lines kept in the capture buffer |
| `terminalFilter.contextLines` | `0` | Lines of context to show around matches |

## Requirements

- VS Code 1.100+
- Shell integration must be enabled in the terminal (enabled by default with bash/zsh)

## Install from source

```sh
npm install
npm run compile
vsce package --allow-missing-repository
code --install-extension vscode-terminal-filter-0.3.0.vsix
```

## Development

```sh
npm install
npm run watch
```

Press **F5** in VS Code to launch the Extension Development Host.

## License

MIT
