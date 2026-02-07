/**
 * CodeLens provider for captured variables
 *
 * Shows CodeLens above tracepoints displaying captured variables and metadata.
 */

import * as vscode from 'vscode';
import { ConfigManager, TracepointDefinition } from './config-manager';

export class CodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor(private configManager: ConfigManager) {
    this.configManager.onConfigChange(() => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const filePath = document.uri.fsPath;
    const tracepoints = this.configManager.getTracepointsForFile(filePath);

    return tracepoints
      .filter((tp): tp is TracepointDefinition & { lineNumber: number } => tp.lineNumber !== undefined)
      .map((tp) => {
        const range = new vscode.Range(tp.lineNumber - 1, 0, tp.lineNumber - 1, 0);

        const captures = tp.captureExpressions?.length || 0;
        const title = `${tp.type} • ${captures} capture${captures !== 1 ? 's' : ''}`;

        const command: vscode.Command = {
          title,
          command: 'trace-inject.viewConfig',
          arguments: [tp.id],
        };

        return new vscode.CodeLens(range, command);
      });
  }

  resolveCodeLens(
    codeLens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): vscode.CodeLens {
    return codeLens;
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}
