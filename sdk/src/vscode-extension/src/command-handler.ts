/**
 * Command handler for VS Code commands
 *
 * Handles all TraceInject commands registered in the command palette and menus.
 */

import * as vscode from 'vscode';
import { ConfigManager } from './config-manager';
import { GutterDecorations } from './gutter-decorations';

export class CommandHandler {
  constructor(
    private configManager: ConfigManager,
    private gutterDecorations: GutterDecorations
  ) {}

  registerCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.commands.registerCommand('trace-inject.addTracepoint', this.addTracepoint, this),
      vscode.commands.registerCommand('trace-inject.removeTracepoint', this.removeTracepoint, this),
      vscode.commands.registerCommand('trace-inject.toggleTracepoint', this.toggleTracepoint, this),
      vscode.commands.registerCommand('trace-inject.viewConfig', this.viewConfig, this),
      vscode.commands.registerCommand('trace-inject.syncConfig', this.syncConfig, this)
    );
  }

  private async addTracepoint(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const line = editor.selection.active.line;
    const filePath = editor.document.uri.fsPath;

    // Check if tracepoint already exists at this line
    if (this.configManager.getTracepointAtLine(filePath, line)) {
      vscode.window.showWarningMessage('Tracepoint already exists at this line');
      return;
    }

    // Ask for tracepoint type
    const type = await vscode.window.showQuickPick(['before', 'after', 'entry', 'exit'], {
      placeHolder: 'Select tracepoint type',
    });

    if (!type) {
      return;
    }

    const tracepoint = this.configManager.addTracepoint(filePath, line, type as 'before' | 'after' | 'entry' | 'exit');

    // Ask for capture expressions
    const captureInput = await vscode.window.showInputBox({
      placeHolder: 'Enter comma-separated variable names to capture (optional)',
      prompt: 'Variables to capture',
    });

    if (captureInput) {
      tracepoint.captureExpressions = captureInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    // Ask for description
    const description = await vscode.window.showInputBox({
      placeHolder: 'Enter tracepoint description (optional)',
      prompt: 'Description',
    });

    if (description) {
      tracepoint.description = description;
    }

    await this.configManager.saveConfig(this.configManager.getConfig());
    this.gutterDecorations.refreshDecorations(editor);

    vscode.window.showInformationMessage(`Tracepoint added at line ${line + 1}`);
  }

  private async removeTracepoint(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const line = editor.selection.active.line;
    const filePath = editor.document.uri.fsPath;

    const tracepoint = this.configManager.getTracepointAtLine(filePath, line);
    if (!tracepoint) {
      vscode.window.showErrorMessage('No tracepoint at this line');
      return;
    }

    this.configManager.removeTracepoint(tracepoint.id);
    await this.configManager.saveConfig(this.configManager.getConfig());
    this.gutterDecorations.refreshDecorations(editor);

    vscode.window.showInformationMessage(`Tracepoint removed from line ${line + 1}`);
  }

  private async toggleTracepoint(filePath: string, line: number, id: string): Promise<void> {
    const editor = vscode.window.visibleTextEditors.find(
      (ed) => ed.document.uri.fsPath === filePath
    );

    if (!editor) {
      return;
    }

    const tracepoint = this.configManager.getTracepointAtLine(filePath, line);

    if (tracepoint) {
      // Remove tracepoint
      this.configManager.removeTracepoint(id);
      await this.configManager.saveConfig(this.configManager.getConfig());
      vscode.window.showInformationMessage(`Tracepoint removed from line ${line + 1}`);
    } else {
      // Add tracepoint
      this.configManager.addTracepoint(filePath, line, 'before');
      await this.configManager.saveConfig(this.configManager.getConfig());
      vscode.window.showInformationMessage(`Tracepoint added at line ${line + 1}`);
    }

    this.gutterDecorations.refreshDecorations(editor);
  }

  private async viewConfig(tracepointId?: string): Promise<void> {
    const config = this.configManager.getConfig();
    const configPath = this.configManager.getConfigFilePath();

    if (!configPath) {
      vscode.window.showErrorMessage('No configuration file found');
      return;
    }

    const document = await vscode.workspace.openTextDocument(configPath);
    const editor = await vscode.window.showTextDocument(document);

    if (tracepointId && config.tracepoints) {
      const tracepoint = config.tracepoints.find((tp) => tp.id === tracepointId);
      if (tracepoint && tracepoint.lineNumber !== undefined) {
        const line = Math.max(0, tracepoint.lineNumber - 1);
        editor.revealRange(
          new vscode.Range(line, 0, line, 0),
          vscode.TextEditorRevealType.InCenter
        );
      }
    }
  }

  private async syncConfig(): Promise<void> {
    try {
      await this.configManager.initialize();
      vscode.window.showInformationMessage('Configuration synced successfully');
      this.gutterDecorations.refreshAllDecorations();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to sync configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
