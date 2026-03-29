/**
 * Helix VS Code Extension - Project Rules Loader
 * ================================================
 * Loads project-level and global rules files that guide agent behavior.
 * Searches workspace root for rules in priority order:
 *   .helixrules > .helix/rules.md > .cursor/rules
 *
 * Also loads global rules from the user setting `helix.rules.globalRulesPath`
 * (default: ~/.helix/global-rules.md).
 *
 * Hot-reloads on file changes via FileSystemWatcher.
 */

import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

/** Priority-ordered list of project rules file candidates (relative to workspace root). */
const PROJECT_RULES_CANDIDATES = [
  '.helixrules',
  '.helix/rules.md',
  '.cursor/rules',
];

const DEFAULT_GLOBAL_RULES_PATH = path.join(
  os.homedir(),
  '.helix',
  'global-rules.md'
);

export class RulesLoader implements vscode.Disposable {
  private _disposables: vscode.Disposable[] = [];
  private _globalRulesText = '';
  private _projectRulesTexts: { source: string; text: string }[] = [];
  private _statusBarItem: vscode.StatusBarItem | undefined;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Set up file watchers, load initial rules, and create the status bar item.
   */
  initialize(context: vscode.ExtensionContext): void {
    // Load rules immediately
    void this._loadGlobalRules();
    void this._loadProjectRules();

    // Watch for project rules changes in the workspace
    for (const candidate of PROJECT_RULES_CANDIDATES) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
          vscode.workspace.workspaceFolders?.[0] ?? '',
          candidate
        )
      );
      watcher.onDidChange(() => void this._loadProjectRules());
      watcher.onDidCreate(() => void this._loadProjectRules());
      watcher.onDidDelete(() => void this._loadProjectRules());
      this._disposables.push(watcher);
    }

    // Watch for global rules file changes
    const globalPath = this._getGlobalRulesPath();
    if (globalPath) {
      const globalWatcher =
        vscode.workspace.createFileSystemWatcher(globalPath);
      globalWatcher.onDidChange(() => void this._loadGlobalRules());
      globalWatcher.onDidCreate(() => void this._loadGlobalRules());
      globalWatcher.onDidDelete(() => void this._loadGlobalRules());
      this._disposables.push(globalWatcher);
    }

    // React to configuration changes (e.g. user toggles helix.rules.enabled)
    const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('helix.rules')) {
        void this._loadGlobalRules();
        void this._loadProjectRules();
        this._updateStatusBar();
      }
    });
    this._disposables.push(configWatcher);

    // Status bar
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      90
    );
    this._statusBarItem.tooltip = 'Helix project rules';
    this._disposables.push(this._statusBarItem);
    this._updateStatusBar();

    // Push disposables into the extension context so VS Code cleans up on deactivate
    context.subscriptions.push(this);
  }

  /**
   * Returns the combined (global + project) rules text.
   * If `helix.rules.enabled` is false, returns an empty string.
   * Concatenates global rules and all found project rules files.
   */
  getEffectiveRules(): string {
    const config = vscode.workspace.getConfiguration('helix');
    if (!config.get<boolean>('rules.enabled', true)) {
      return '';
    }

    const parts: string[] = [];
    if (this._globalRulesText) {
      parts.push(this._globalRulesText);
    }
    for (const entry of this._projectRulesTexts) {
      parts.push(entry.text);
    }
    return parts.join('\n\n');
  }

  /**
   * Alias for {@link getEffectiveRules} — kept for backwards compatibility.
   */
  getActiveRules(): string {
    return this.getEffectiveRules();
  }

  /**
   * Returns metadata about the active rules for status bar display,
   * or null if no rules are loaded.
   */
  getRulesInfo(): { source: string; lineCount: number } | null {
    const config = vscode.workspace.getConfiguration('helix');
    if (!config.get<boolean>('rules.enabled', true)) {
      return null;
    }

    const combined = this.getEffectiveRules();
    if (!combined) {
      return null;
    }

    const lineCount = combined.split('\n').length;
    const sources: string[] = [];
    if (this._globalRulesText) {
      sources.push('global');
    }
    for (const entry of this._projectRulesTexts) {
      sources.push(entry.source);
    }

    return {
      source: sources.join(' + '),
      lineCount,
    };
  }

  dispose(): void {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private _getGlobalRulesPath(): string {
    const config = vscode.workspace.getConfiguration('helix');
    const configured = config.get<string>('rules.globalRulesPath', '');
    if (configured) {
      // Expand ~ to home directory
      if (configured.startsWith('~')) {
        return path.join(os.homedir(), configured.slice(1));
      }
      return configured;
    }
    return DEFAULT_GLOBAL_RULES_PATH;
  }

  private async _loadGlobalRules(): Promise<void> {
    const globalPath = this._getGlobalRulesPath();
    if (!globalPath) {
      this._globalRulesText = '';
      this._updateStatusBar();
      return;
    }

    try {
      const uri = vscode.Uri.file(globalPath);
      const bytes = await vscode.workspace.fs.readFile(uri);
      this._globalRulesText = Buffer.from(bytes).toString('utf-8').trim();
    } catch {
      // File does not exist or is unreadable — that is fine
      this._globalRulesText = '';
    }
    this._updateStatusBar();
  }

  private async _loadProjectRules(): Promise<void> {
    this._projectRulesTexts = [];

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      this._updateStatusBar();
      return;
    }

    // Try all candidates in priority order — concatenate every file found
    for (const candidate of PROJECT_RULES_CANDIDATES) {
      try {
        const uri = vscode.Uri.joinPath(workspaceFolder.uri, candidate);
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = Buffer.from(bytes).toString('utf-8').trim();
        if (text) {
          this._projectRulesTexts.push({ source: candidate, text });
        }
      } catch {
        // File not found — try next candidate
      }
    }

    this._updateStatusBar();
  }

  private _updateStatusBar(): void {
    if (!this._statusBarItem) {
      return;
    }

    const config = vscode.workspace.getConfiguration('helix');
    const showIndicator = config.get<boolean>('rules.showIndicator', true);
    const enabled = config.get<boolean>('rules.enabled', true);

    if (!showIndicator || !enabled) {
      this._statusBarItem.hide();
      return;
    }

    const info = this.getRulesInfo();
    if (info) {
      this._statusBarItem.text = `$(book) Rules: ${info.lineCount} lines`;
      this._statusBarItem.tooltip = `Helix rules loaded from: ${info.source} (${info.lineCount} lines)`;
      this._statusBarItem.show();
    } else {
      this._statusBarItem.hide();
    }
  }
}
