/**
 * Configuration file watcher
 *
 * Monitors the traceinject.config.json file and syncs changes with the editor.
 */

import * as vscode from 'vscode';
import { ConfigManager } from './config-manager';

export class ConfigWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(private configManager: ConfigManager) {}

  activate(context: vscode.ExtensionContext): void {
    const vscodeConfig = vscode.workspace.getConfiguration('trace-inject');
    const autoSync = vscodeConfig.get<boolean>('autoSync', true);

    if (!autoSync) {
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const configFileName = vscodeConfig.get<string>('configFile', 'traceinject.config.json');
    const pattern = new vscode.RelativePattern(workspaceFolder, configFileName);

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.watcher.onDidChange(
      () => {
        this.debounceConfigChange();
      },
      null,
      context.subscriptions
    );

    this.watcher.onDidCreate(
      () => {
        this.debounceConfigChange();
      },
      null,
      context.subscriptions
    );

    this.watcher.onDidDelete(
      () => {
        vscode.window.showWarningMessage('TraceInject configuration file was deleted');
      },
      null,
      context.subscriptions
    );

    context.subscriptions.push(this.watcher);
  }

  private debounceConfigChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        await this.configManager.initialize();
        vscode.window.showInformationMessage('TraceInject configuration updated');
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to reload configuration: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, 500);
  }

  deactivate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (this.watcher) {
      this.watcher.dispose();
    }
  }
}
