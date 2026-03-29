/**
 * Helix VS Code Extension - Context Manager
 * Controls what information is included in AI's context window
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ContextSettings {
  openTabsLimit: number;
  workspaceFilesLimit: number;
  gitStatusMaxFiles: number;
  concurrentFileReadsLimit: number;
  showIgnoredFiles: boolean;
  loadSubdirectoryRules: boolean;
  fileReadAutoTruncateThreshold: number;
  allowLargeReadsOnOverflow: boolean;
  maxImageFileSizeMB: number;
  maxTotalImageSizeMB: number;
  includeDiagnostics: boolean;
  maxDiagnosticMessages: number;
  diagnosticsDelayMs: number;
  includeTimeInfo: boolean;
  includeCostInfo: boolean;
  condensingTriggerThreshold: number;
}

export interface WorkspaceContext {
  openTabs: vscode.Uri[];
  workspaceFiles: vscode.Uri[];
  gitStatus?: GitStatusInfo;
  diagnostics: vscode.Diagnostic[];
  timeInfo?: TimeInfo;
}

export interface GitStatusInfo {
  branch: string;
  changedFiles: GitFileChange[];
}

export interface GitFileChange {
  uri: vscode.Uri;
  status: GitFileStatus;
}

export enum GitFileStatus {
  Modified = 'modified',
  Added = 'added',
  Deleted = 'deleted',
  Renamed = 'renamed',
  Conflicted = 'conflicted',
}

export interface TimeInfo {
  currentTime: string;
  timezone: string;
  timestamp: number;
}

export interface FileReadResult {
  content: string;
  truncated: boolean;
  lineCount: number;
}

export class ContextManager {
  private static instance: ContextManager;
  private settings: ContextSettings;
  private context: vscode.ExtensionContext;
  private eventEmitter: vscode.EventEmitter<ContextSettings> =
    new vscode.EventEmitter<ContextSettings>();
  private gitExtension: any;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.settings = this.getDefaultSettings();

    this.loadSettings();
    this.initializeGit();
  }

  public static getInstance(context?: vscode.ExtensionContext): ContextManager {
    if (!ContextManager.instance) {
      if (!context) {
        throw new Error(
          'ContextManager requires ExtensionContext on first initialization'
        );
      }
      ContextManager.instance = new ContextManager(context);
    }
    return ContextManager.instance;
  }

  /**
   * Get default context settings
   */
  private getDefaultSettings(): ContextSettings {
    return {
      openTabsLimit: 100,
      workspaceFilesLimit: 500,
      gitStatusMaxFiles: 0, // 0 = disabled
      concurrentFileReadsLimit: 10,
      showIgnoredFiles: false,
      loadSubdirectoryRules: false,
      fileReadAutoTruncateThreshold: 500,
      allowLargeReadsOnOverflow: false,
      maxImageFileSizeMB: 5,
      maxTotalImageSizeMB: 20,
      includeDiagnostics: false,
      maxDiagnosticMessages: 50,
      diagnosticsDelayMs: 1000,
      includeTimeInfo: false,
      includeCostInfo: false,
      condensingTriggerThreshold: 100,
    };
  }

  /**
   * Load settings from storage
   */
  private loadSettings(): void {
    try {
      const storageKey = 'contextSettings';
      const stored = this.context.globalState.get<ContextSettings>(storageKey);
      if (stored) {
        this.settings = stored;
      }
    } catch (error) {
      console.error('Failed to load context settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    try {
      const storageKey = 'contextSettings';
      this.context.globalState.update(storageKey, this.settings);
      this.eventEmitter.fire(this.settings);
    } catch (error) {
      console.error('Failed to save context settings:', error);
    }
  }

  /**
   * Initialize Git extension
   */
  private initializeGit(): void {
    try {
      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (gitExtension) {
        gitExtension.activate().then((extension: any) => {
          this.gitExtension = extension.getAPI(1);
        });
      }
    } catch (error) {
      console.error('Failed to initialize Git extension:', error);
    }
  }

  /**
   * Get current context settings
   */
  public getSettings(): ContextSettings {
    return { ...this.settings };
  }

  /**
   * Update context settings
   */
  public updateSettings(updates: Partial<ContextSettings>): void {
    Object.assign(this.settings, updates);
    this.saveSettings();
  }

  /**
   * Get workspace context
   */
  public async getWorkspaceContext(): Promise<WorkspaceContext> {
    const context: WorkspaceContext = {
      openTabs: await this.getOpenTabs(),
      workspaceFiles: await this.getWorkspaceFiles(),
      diagnostics: await this.getDiagnostics(),
    };

    if (this.settings.gitStatusMaxFiles > 0) {
      context.gitStatus = await this.getGitStatus();
    }

    if (this.settings.includeTimeInfo) {
      context.timeInfo = this.getTimeInfo();
    }

    return context;
  }

  /**
   * Get open tabs
   */
  private async getOpenTabs(): Promise<vscode.Uri[]> {
    const allTabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
    const uris = allTabs
      .filter(tab => tab.input instanceof vscode.TabInputText)
      .map(tab => (tab.input as vscode.TabInputText).uri)
      .slice(0, this.settings.openTabsLimit);

    return uris;
  }

  /**
   * Get workspace files
   */
  private async getWorkspaceFiles(): Promise<vscode.Uri[]> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }

    const files: vscode.Uri[] = [];

    for (const folder of vscode.workspace.workspaceFolders) {
      const pattern = new vscode.RelativePattern(folder, '**/*');
      const entries = await vscode.workspace.findFiles(
        pattern,
        '**/node_modules/**',
        this.settings.workspaceFilesLimit
      );
      files.push(...entries);
    }

    return files.slice(0, this.settings.workspaceFilesLimit);
  }

  /**
   * Get Git status
   */
  private async getGitStatus(): Promise<GitStatusInfo | undefined> {
    if (!this.gitExtension) {
      return undefined;
    }

    try {
      const repos = this.gitExtension.repositories;
      if (repos.length === 0) {
        return undefined;
      }

      const repo = repos[0];
      const changes = repo.state.workingTreeChanges;
      const changedFiles: GitFileChange[] = [];

      for (const change of changes) {
        if (changedFiles.length >= this.settings.gitStatusMaxFiles) {
          break;
        }

        let status: GitFileStatus;
        switch (change.status) {
          case 1: // Modified
            status = GitFileStatus.Modified;
            break;
          case 2: // Added
            status = GitFileStatus.Added;
            break;
          case 3: // Deleted
            status = GitFileStatus.Deleted;
            break;
          case 4: // Renamed
            status = GitFileStatus.Renamed;
            break;
          case 8: // Conflicted
            status = GitFileStatus.Conflicted;
            break;
          default:
            continue;
        }

        changedFiles.push({
          uri: change.uri,
          status,
        });
      }

      return {
        branch: repo.state.HEAD?.name || 'detached',
        changedFiles,
      };
    } catch (error) {
      console.error('Failed to get Git status:', error);
      return undefined;
    }
  }

  /**
   * Get diagnostics
   */
  private async getDiagnostics(): Promise<vscode.Diagnostic[]> {
    if (!this.settings.includeDiagnostics) {
      return [];
    }

    const allDiagnostics = vscode.languages.getDiagnostics();
    let diagnostics: vscode.Diagnostic[] = [];

    for (const [uri, fileDiagnostics] of allDiagnostics) {
      diagnostics.push(...fileDiagnostics);
    }

    // Sort by severity (errors first)
    diagnostics.sort((a, b) => b.severity - a.severity);

    // Limit to max messages
    return diagnostics.slice(0, this.settings.maxDiagnosticMessages);
  }

  /**
   * Get time info
   */
  private getTimeInfo(): TimeInfo {
    const now = new Date();
    return {
      currentTime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: now.getTime(),
    };
  }

  /**
   * Read file with truncation
   */
  public async readFile(
    uri: vscode.Uri,
    startLine?: number,
    endLine?: number
  ): Promise<FileReadResult> {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf-8');
      const lines = text.split('\n');

      let resultText = text;
      let truncated = false;

      if (startLine !== undefined && endLine !== undefined) {
        resultText = lines.slice(startLine - 1, endLine).join('\n');
      } else if (
        this.settings.fileReadAutoTruncateThreshold > 0 &&
        lines.length > this.settings.fileReadAutoTruncateThreshold
      ) {
        const threshold = this.settings.fileReadAutoTruncateThreshold;
        const firstLines = lines.slice(0, threshold / 2);
        const lastLines = lines.slice(-threshold / 2);

        // Generate line number index
        const index = this.generateLineIndex(lines);

        resultText = [
          ...firstLines,
          `\n... [${lines.length - threshold} lines omitted] ...`,
          index,
          ...lastLines,
        ].join('\n');

        truncated = true;
      }

      return {
        content: resultText,
        truncated,
        lineCount: lines.length,
      };
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  /**
   * Generate line number index for code definitions
   */
  private generateLineIndex(lines: string[]): string {
    const definitions: string[] = [];

    lines.forEach((line, index) => {
      // Look for function, class, interface, type definitions
      const patterns = [
        /^function\s+(\w+)/,
        /^const\s+(\w+)\s*=\s*(?:async\s+)?\(/,
        /^class\s+(\w+)/,
        /^interface\s+(\w+)/,
        /^type\s+(\w+)/,
        /^export\s+(?:async\s+)?function\s+(\w+)/,
        /^export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(/,
        /^def\s+(\w+)/,
        /^class\s+(\w+):/,
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          definitions.push(`  ${index + 1}: ${match[1]}`);
          break;
        }
      }
    });

    if (definitions.length === 0) {
      return '';
    }

    return `Definition index:\n${definitions.slice(0, 50).join('\n')}`;
  }

  /**
   * Read multiple files concurrently
   */
  public async readFiles(
    uris: vscode.Uri[]
  ): Promise<Map<vscode.Uri, FileReadResult>> {
    const results = new Map<vscode.Uri, FileReadResult>();
    const batches = this.chunkArray(
      uris,
      this.settings.concurrentFileReadsLimit
    );

    for (const batch of batches) {
      const promises = batch.map(async uri => {
        try {
          const result = await this.readFile(uri);
          results.set(uri, result);
        } catch (error) {
          console.error(`Failed to read file ${uri.fsPath}:`, error);
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Check if context needs condensing
   */
  public shouldCondenseContext(currentContextPercent: number): boolean {
    return currentContextPercent >= this.settings.condensingTriggerThreshold;
  }

  /**
   * Check if large read is allowed
   */
  public shouldAllowLargeRead(contentSizePercent: number): boolean {
    return this.settings.allowLargeReadsOnOverflow || contentSizePercent < 80;
  }

  /**
   * Check if file should be ignored
   */
  public shouldIgnoreFile(uri: vscode.Uri): boolean {
    if (this.settings.showIgnoredFiles) {
      return false;
    }

    // Check .gitignore
    // Check .helixignore
    // This is a simplified version

    return false;
  }

  /**
   * Chunk array into batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Reset to default settings
   */
  public resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }

  /**
   * Event fired when settings change
   */
  public readonly onDidChangeSettings = this.eventEmitter.event;
}
