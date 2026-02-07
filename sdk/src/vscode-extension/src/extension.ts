/**
 * TraceInject VS Code Extension
 *
 * Main extension entry point for VS Code integration with tracepoint management,
 * visualization, and configuration synchronization.
 */

import * as vscode from 'vscode';
import { ConfigManager } from './config-manager';
import { GutterDecorations } from './gutter-decorations';
import { HoverProvider } from './hover-provider';
import { CodeLensProvider } from './codelens-provider';
import { CommandHandler } from './command-handler';
import { ConfigWatcher } from './config-watcher';

let configManager: ConfigManager;
let gutterDecorations: GutterDecorations;
let hoverProvider: HoverProvider;
let codeLensProvider: CodeLensProvider;
let commandHandler: CommandHandler;
let configWatcher: ConfigWatcher;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Initialize the configuration manager
    configManager = new ConfigManager(context);
    await configManager.initialize();

    // Initialize gutter decorations
    gutterDecorations = new GutterDecorations(configManager);
    gutterDecorations.activate(context);

    // Initialize hover provider
    const config = vscode.workspace.getConfiguration('trace-inject');
    if (config.get<boolean>('enableHover', true)) {
      hoverProvider = new HoverProvider(configManager);
      context.subscriptions.push(
        vscode.languages.registerHoverProvider(
          [
            { scheme: 'file', language: 'javascript' },
            { scheme: 'file', language: 'typescript' },
            { scheme: 'file', language: 'javascriptreact' },
            { scheme: 'file', language: 'typescriptreact' },
          ],
          hoverProvider
        )
      );
    }

    // Initialize CodeLens provider
    if (config.get<boolean>('enableCodeLens', true)) {
      codeLensProvider = new CodeLensProvider(configManager);
      context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
          [
            { scheme: 'file', language: 'javascript' },
            { scheme: 'file', language: 'typescript' },
            { scheme: 'file', language: 'javascriptreact' },
            { scheme: 'file', language: 'typescriptreact' },
          ],
          codeLensProvider
        )
      );
    }

    // Initialize command handler
    commandHandler = new CommandHandler(configManager, gutterDecorations);
    commandHandler.registerCommands(context);

    // Initialize config watcher
    configWatcher = new ConfigWatcher(configManager);
    configWatcher.activate(context);

    // Refresh decorations when editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        gutterDecorations.refreshDecorations(editor);
      }
    }, null, context.subscriptions);

    // Update context key for supported languages
    updateContextKey();
    vscode.window.onDidChangeActiveTextEditor(() => {
      updateContextKey();
    }, null, context.subscriptions);

    vscode.window.showInformationMessage('TraceInject extension activated');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to activate TraceInject extension: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

export function deactivate(): void {
  if (configWatcher) {
    configWatcher.deactivate();
  }
}

function updateContextKey(): void {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const isSupported = [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
    ].includes(editor.document.languageId);
    vscode.commands.executeCommand('setContext', 'trace-inject.supportedLanguages', isSupported);
  }
}
