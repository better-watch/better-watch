/**
 * Gutter decorations for tracepoints
 *
 * Displays gutter icons and decorations for active tracepoints in the editor.
 */

import * as vscode from 'vscode';
import { ConfigManager, TracepointDefinition } from './config-manager';

export class GutterDecorations {
  private decorationType: vscode.TextEditorDecorationType;
  private activeDecorations = new Map<string, vscode.Range[]>();

  constructor(private configManager: ConfigManager) {

    this.decorationType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this.getIconPath(),
      gutterIconSize: 'contain',
      backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
      overviewRulerColor: new vscode.ThemeColor('editorOverviewRuler.infoForeground'),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    // Listen for config changes
    this.configManager.onConfigChange(() => {
      this.refreshAllDecorations();
    });
  }

  activate(context: vscode.ExtensionContext): void {
    // Refresh decorations when files are opened
    vscode.workspace.onDidOpenTextDocument(() => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        this.refreshDecorations(editor);
      }
    }, null, context.subscriptions);

    // Refresh decorations on text changes
    vscode.workspace.onDidChangeTextDocument((e) => {
      const editor = vscode.window.visibleTextEditors.find(
        (ed) => ed.document === e.document
      );
      if (editor) {
        this.refreshDecorations(editor);
      }
    }, null, context.subscriptions);

    // Initial refresh
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.refreshDecorations(editor);
    }
  }

  refreshDecorations(editor: vscode.TextEditor): void {
    const filePath = editor.document.uri.fsPath;
    const tracepoints = this.configManager.getTracepointsForFile(filePath);

    const ranges: vscode.DecorationOptions[] = tracepoints
      .filter((tp): tp is TracepointDefinition & { lineNumber: number } => tp.lineNumber !== undefined)
      .map((tp) => ({
        range: new vscode.Range(tp.lineNumber - 1, 0, tp.lineNumber - 1, 0),
        hoverMessage: new vscode.MarkdownString(this.getHoverText(tp)),
        command: {
          title: 'Toggle Tracepoint',
          command: 'trace-inject.toggleTracepoint',
          arguments: [filePath, tp.lineNumber - 1, tp.id],
        },
      }));

    editor.setDecorations(this.decorationType, ranges);
  }

  refreshAllDecorations(): void {
    vscode.window.visibleTextEditors.forEach((editor) => {
      this.refreshDecorations(editor);
    });
  }

  private getHoverText(tp: TracepointDefinition): string {
    let text = `**Tracepoint** (${tp.type})\n`;
    if (tp.description) {
      text += `- ${tp.description}\n`;
    }
    if (tp.captureExpressions && tp.captureExpressions.length > 0) {
      text += `- Captures: ${tp.captureExpressions.join(', ')}\n`;
    }
    text += `\n[Toggle Tracepoint](command:trace-inject.toggleTracepoint)`;
    return text;
  }

  private getIconPath(): string {
    // SVG icon as data URI for a circle with a dot
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
    </svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  dispose(): void {
    this.decorationType.dispose();
  }
}
