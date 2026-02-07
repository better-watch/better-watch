# TraceInject VS Code Extension

VS Code extension for managing tracepoints with visual gutter decorations, hover tooltips, CodeLens, and configuration synchronization.

## Features

- **Gutter Icons**: Visual indicators for active tracepoints in the editor gutter
- **Click to Toggle**: Click gutter icons to quickly add/remove tracepoints
- **Hover Tooltips**: Detailed tracepoint configuration on hover
- **CodeLens**: Display captured variables and metadata above tracepoint lines
- **Command Palette**: Quick access to all TraceInject commands
- **Auto Sync**: Automatically load configuration changes from `traceinject.config.json`
- **Full Configuration Management**: Add, edit, and remove tracepoints directly from the editor

## Installation

1. Build the extension: `npm run build`
2. Package: `vsce package`
3. Install in VS Code: `code --install-extension trace-inject-vscode-*.vsix`

## Usage

### Add a Tracepoint

1. Click in the editor at the desired line
2. Press `Ctrl+Shift+T` (or `Cmd+Shift+T` on macOS)
3. Select the tracepoint type (before, after, entry, exit)
4. Optionally specify variables to capture
5. Optionally add a description

Or use the Command Palette: `TraceInject: Add Tracepoint`

### Remove a Tracepoint

1. Click on the gutter icon of the tracepoint you want to remove
2. The tracepoint will be toggled off

Or use the Command Palette: `TraceInject: Remove Tracepoint`

### View Configuration

Use the Command Palette: `TraceInject: View Configuration`

This opens the `traceinject.config.json` file.

### Sync Configuration

If you manually edit the configuration file, use:
`TraceInject: Sync Configuration`

Or enable auto-sync in settings.

## Configuration

Add to your VS Code settings (`.vscode/settings.json`):

```json
{
  "trace-inject.configFile": "traceinject.config.json",
  "trace-inject.autoSync": true,
  "trace-inject.gutterIconColor": "#007acc",
  "trace-inject.enableCodeLens": true,
  "trace-inject.enableHover": true
}
```

## Keyboard Shortcuts

- `Ctrl+Shift+T` / `Cmd+Shift+T`: Add tracepoint at current line

## Integration with TraceInject Core

The extension integrates with the @trace-inject/core library to:
- Parse TypeScript/JavaScript files
- Inject tracepoint code
- Capture variable values at runtime
- Sync with the configuration API

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run linter
npm run lint
```

## License

MIT
