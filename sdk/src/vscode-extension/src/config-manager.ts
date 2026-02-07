/**
 * Configuration manager for TraceInject VS Code Extension
 *
 * Handles loading, caching, and managing tracepoint configurations.
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TracepointDefinition {
  id: string;
  type: 'before' | 'after' | 'entry' | 'exit';
  lineNumber?: number;
  functionName?: string;
  functionPath?: string;
  captureExpressions?: string[];
  captureConfig?: Record<string, unknown>;
  includeAsync?: boolean;
  includeGenerators?: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface TraceInjectionConfig {
  version?: string;
  tracepoints?: TracepointDefinition[];
  parser?: Record<string, unknown>;
  capture?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export class ConfigManager {
  private config: TraceInjectionConfig = { tracepoints: [] };
  private configFilePath: string = '';
  private onConfigChanged = new vscode.EventEmitter<TraceInjectionConfig>();
  readonly onConfigChange = this.onConfigChanged.event;

  constructor(private context: vscode.ExtensionContext) {}

  async initialize(): Promise<void> {
    await this.findAndLoadConfig();
  }

  private async findAndLoadConfig(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const vscodeConfig = vscode.workspace.getConfiguration('trace-inject');
    const configFileName = vscodeConfig.get<string>('configFile', 'traceinject.config.json');

    const configPath = path.join(workspaceFolder.uri.fsPath, configFileName);

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(content) as TraceInjectionConfig;
      this.configFilePath = configPath;
      this.onConfigChanged.fire(this.config);
    } catch (error) {
      // Config file doesn't exist or is invalid - start with empty config
      this.config = { tracepoints: [] };
    }
  }

  async saveConfig(config: TraceInjectionConfig): Promise<void> {
    if (!this.configFilePath) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder open');
      }

      const vscodeConfig = vscode.workspace.getConfiguration('trace-inject');
      const configFileName = vscodeConfig.get<string>('configFile', 'traceinject.config.json');
      this.configFilePath = path.join(workspaceFolder.uri.fsPath, configFileName);
    }

    await fs.writeFile(this.configFilePath, JSON.stringify(config, null, 2), 'utf-8');
    this.config = config;
    this.onConfigChanged.fire(config);
  }

  getConfig(): TraceInjectionConfig {
    return this.config;
  }

  getTracepoints(): TracepointDefinition[] {
    return this.config.tracepoints || [];
  }

  getTracepointsForFile(filePath: string): TracepointDefinition[] {
    const fileUri = vscode.Uri.file(filePath);
    return this.getTracepoints().filter(
      (tp) => tp.metadata?.filePath === fileUri.fsPath || tp.metadata?.file === filePath
    );
  }

  getTracepointAtLine(filePath: string, lineNumber: number): TracepointDefinition | undefined {
    return this.getTracepointsForFile(filePath).find((tp) => tp.lineNumber === lineNumber + 1);
  }

  addTracepoint(filePath: string, lineNumber: number, type: 'before' | 'after' | 'entry' | 'exit' = 'before'): TracepointDefinition {
    const id = `tp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tracepoint: TracepointDefinition = {
      id,
      type,
      lineNumber: lineNumber + 1,
      metadata: {
        filePath,
        createdAt: new Date().toISOString(),
      },
    };

    if (!this.config.tracepoints) {
      this.config.tracepoints = [];
    }

    this.config.tracepoints.push(tracepoint);
    return tracepoint;
  }

  removeTracepoint(id: string): boolean {
    if (!this.config.tracepoints) {
      return false;
    }

    const index = this.config.tracepoints.findIndex((tp) => tp.id === id);
    if (index >= 0) {
      this.config.tracepoints.splice(index, 1);
      return true;
    }

    return false;
  }

  updateTracepoint(id: string, updates: Partial<TracepointDefinition>): boolean {
    const tracepoint = this.config.tracepoints?.find((tp) => tp.id === id);
    if (!tracepoint) {
      return false;
    }

    Object.assign(tracepoint, updates);
    return true;
  }

  getConfigFilePath(): string {
    return this.configFilePath;
  }

  dispose(): void {
    this.onConfigChanged.dispose();
  }
}
