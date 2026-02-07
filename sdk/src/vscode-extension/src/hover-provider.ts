/**
 * Hover provider for tracepoint configuration
 *
 * Shows detailed tracepoint configuration when hovering over a tracepoint.
 */

import * as vscode from 'vscode';
import { ConfigManager, TracepointDefinition } from './config-manager';

export class HoverProvider implements vscode.HoverProvider {
  constructor(private configManager: ConfigManager) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const filePath = document.uri.fsPath;
    const lineNumber = position.line;

    const tracepoint = this.configManager.getTracepointAtLine(filePath, lineNumber);
    if (!tracepoint) {
      return null;
    }

    const markdown = this.formatTracepointHover(tracepoint);
    return new vscode.Hover(markdown);
  }

  private formatTracepointHover(tp: TracepointDefinition): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;

    md.appendMarkdown(`### TraceInject Tracepoint\n\n`);
    md.appendMarkdown(`**ID:** \`${tp.id}\`\n\n`);
    md.appendMarkdown(`**Type:** \`${tp.type}\`\n\n`);

    if (tp.description) {
      md.appendMarkdown(`**Description:** ${tp.description}\n\n`);
    }

    if (tp.lineNumber) {
      md.appendMarkdown(`**Line:** ${tp.lineNumber}\n\n`);
    }

    if (tp.functionName) {
      md.appendMarkdown(`**Function:** \`${tp.functionName}\`\n\n`);
    }

    if (tp.functionPath) {
      md.appendMarkdown(`**Path:** \`${tp.functionPath}\`\n\n`);
    }

    if (tp.captureExpressions && tp.captureExpressions.length > 0) {
      md.appendMarkdown(`**Captured Variables:**\n\n`);
      tp.captureExpressions.forEach((expr) => {
        md.appendMarkdown(`- \`${expr}\`\n`);
      });
      md.appendMarkdown(`\n`);
    }

    if (tp.includeAsync) {
      md.appendMarkdown(`- Includes async functions\n`);
    }

    if (tp.includeGenerators) {
      md.appendMarkdown(`- Includes generator functions\n`);
    }

    if (Object.keys(tp.metadata || {}).length > 0) {
      md.appendMarkdown(`\n**Metadata:**\n\n`);
      const metadata = tp.metadata || {};
      Object.entries(metadata).forEach(([key, value]) => {
        if (key !== 'filePath' && key !== 'file') {
          md.appendMarkdown(`- **${key}:** ${JSON.stringify(value)}\n`);
        }
      });
    }

    md.appendMarkdown(`\n---\n`);
    md.appendMarkdown(`[Edit](command:trace-inject.viewConfig) | [Remove](command:trace-inject.removeTracepoint)\n`);

    return md;
  }
}
