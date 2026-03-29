import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export interface GitStatus {
  branch: string;
  status: 'clean' | 'modified' | 'untracked';
  ahead: number;
  behind: number;
  lastCommit?: string;
  untrackedFiles: string[];
  modifiedFiles: string[];
  stagedFiles: string[];
}

export interface GitCommit {
  hash: string;
  author: string;
  message: string;
  date: Date;
  files: string[];
}

export interface GitWorkflowChange {
  type: 'workflow_created' | 'workflow_modified' | 'workflow_deleted';
  workflowId: string;
  workflowName: string;
  filePath: string;
  commitHash?: string;
  timestamp: Date;
  author: string;
}

export interface GitHook {
  name: string;
  content: string;
  enabled: boolean;
  description: string;
}

export interface GitAuditEntry {
  timestamp: Date;
  action: string;
  details: any;
  user: string;
  commitHash?: string;
}

export class GitIntegrationManager {
  private gitExtension: any;
  private repository: any;
  private auditLog: GitAuditEntry[] = [];
  private workflowChanges: GitWorkflowChange[] = [];
  private disposables: vscode.Disposable[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initializes Git integration
   */
  async initialize(): Promise<void> {
    try {
      this.gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      if (!this.gitExtension) {
        throw new Error('Git extension not found');
      }

      const git = this.gitExtension.getAPI(1);
      if (git.repositories.length === 0) {
        throw new Error('No Git repositories found');
      }

      this.repository = git.repositories[0];
      this.isInitialized = true;

      // Set up event listeners
      this.setupEventListeners();

      // Load audit log
      this.loadAuditLog();

      console.log('Git integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Git integration:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Gets current Git status
   */
  async getGitStatus(): Promise<GitStatus> {
    if (!this.isInitialized || !this.repository) {
      return {
        branch: 'unknown',
        status: 'clean',
        ahead: 0,
        behind: 0,
        untrackedFiles: [],
        modifiedFiles: [],
        stagedFiles: [],
      };
    }

    const state = this.repository.state;

    // Get file status
    const untrackedFiles = state.untrackedChanges.map(
      (change: any) => change.uri.fsPath
    );
    const modifiedFiles = state.workingTreeChanges.map(
      (change: any) => change.uri.fsPath
    );
    const stagedFiles = state.indexChanges.map(
      (change: any) => change.uri.fsPath
    );

    // Determine overall status
    let status: 'clean' | 'modified' | 'untracked' = 'clean';
    if (modifiedFiles.length > 0 || stagedFiles.length > 0) {
      status = 'modified';
    } else if (untrackedFiles.length > 0) {
      status = 'untracked';
    }

    return {
      branch: state.HEAD?.name || 'unknown',
      status,
      ahead: state.HEAD?.ahead || 0,
      behind: state.HEAD?.behind || 0,
      lastCommit: state.HEAD?.commit,
      untrackedFiles,
      modifiedFiles,
      stagedFiles,
    };
  }

  /**
   * Gets recent commits
   */
  async getRecentCommits(limit: number = 10): Promise<GitCommit[]> {
    if (!this.isInitialized || !this.repository) {
      return [];
    }

    try {
      // This is a simplified implementation
      // In a real implementation, you'd use git log command
      const commits: GitCommit[] = [];

      // For now, return mock data structure
      // Real implementation would parse git log output
      return commits;
    } catch (error) {
      console.error('Failed to get recent commits:', error);
      return [];
    }
  }

  /**
   * Creates a commit with workflow changes
   */
  async createWorkflowCommit(
    message: string,
    files: string[],
    author?: string
  ): Promise<string | null> {
    if (!this.isInitialized || !this.repository) {
      throw new Error('Git integration not initialized');
    }

    try {
      // Stage files
      for (const file of files) {
        await this.repository.add(file);
      }

      // Create commit
      const commitHash = await this.repository.commit(message, {
        author: author
          ? { name: author, email: `${author}@helix.ai` }
          : undefined,
      });

      // Log the commit
      this.logAuditEntry(
        'workflow_commit',
        {
          message,
          files,
          commitHash,
          author,
        },
        author || 'Unknown'
      );

      // Track workflow changes
      files.forEach(file => {
        const workflowChange: GitWorkflowChange = {
          type: this.detectWorkflowChangeType(file),
          workflowId: this.extractWorkflowId(file),
          workflowName: this.extractWorkflowName(file),
          filePath: file,
          commitHash,
          timestamp: new Date(),
          author: author || 'Unknown',
        };
        this.workflowChanges.push(workflowChange);
      });

      return commitHash;
    } catch (error) {
      console.error('Failed to create workflow commit:', error);
      throw error;
    }
  }

  /**
   * Sets up auto-commit for workflow changes
   */
  async setupAutoCommit(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Git integration not initialized');
    }

    // This would set up a file watcher for workflow files
    // and automatically commit changes
    const workflowFiles = await this.findWorkflowFiles();

    for (const file of workflowFiles) {
      const watcher = vscode.workspace.createFileSystemWatcher(file);

      watcher.onDidChange(async () => {
        await this.handleWorkflowChange(file, 'modified');
      });

      watcher.onDidCreate(async () => {
        await this.handleWorkflowChange(file, 'created');
      });

      watcher.onDidDelete(async () => {
        await this.handleWorkflowChange(file, 'deleted');
      });

      this.disposables.push(watcher);
    }
  }

  /**
   * Sets up Git hooks for validation
   */
  async setupGitHooks(): Promise<void> {
    if (!this.isInitialized || !this.repository) {
      throw new Error('Git integration not initialized');
    }

    const hooks: GitHook[] = [
      {
        name: 'pre-commit',
        content: this.generatePreCommitHook(),
        enabled: true,
        description: 'Validates workflow files before commit',
      },
      {
        name: 'post-commit',
        content: this.generatePostCommitHook(),
        enabled: true,
        description: 'Logs workflow changes after commit',
      },
    ];

    for (const hook of hooks) {
      await this.installGitHook(hook);
    }
  }

  /**
   * Gets workflow change history
   */
  getWorkflowChangeHistory(): GitWorkflowChange[] {
    return [...this.workflowChanges];
  }

  /**
   * Gets audit log
   */
  getAuditLog(): GitAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Exports Git integration data
   */
  exportData(): string {
    return JSON.stringify(
      {
        auditLog: this.auditLog,
        workflowChanges: this.workflowChanges,
        exportTime: new Date(),
      },
      null,
      2
    );
  }

  /**
   * Imports Git integration data
   */
  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.auditLog) {
        this.auditLog = parsed.auditLog;
      }
      if (parsed.workflowChanges) {
        this.workflowChanges = parsed.workflowChanges;
      }
    } catch (error) {
      console.error('Failed to import Git integration data:', error);
    }
  }

  /**
   * Clears audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
    this.saveAuditLog();
  }

  /**
   * Gets Git statistics
   */
  getGitStatistics(): {
    totalCommits: number;
    workflowCommits: number;
    totalWorkflowChanges: number;
    autoCommitsEnabled: boolean;
    lastCommitTime?: Date;
  } {
    const totalCommits = this.auditLog.filter(
      entry => entry.action === 'commit'
    ).length;
    const workflowCommits = this.auditLog.filter(
      entry => entry.action === 'workflow_commit'
    ).length;

    const lastCommit = this.auditLog.find(entry => entry.action === 'commit');
    return {
      totalCommits,
      workflowCommits,
      totalWorkflowChanges: this.workflowChanges.length,
      autoCommitsEnabled: this.disposables.length > 0,
      ...(lastCommit && { lastCommitTime: lastCommit.timestamp }),
    };
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  private setupEventListeners(): void {
    if (!this.repository) return;

    // Listen for Git state changes
    this.disposables.push(
      this.repository.state.onDidChange(() => {
        this.logAuditEntry(
          'git_status_change',
          {
            status: this.repository.state,
          },
          'System'
        );
      })
    );

    // Listen for branch changes
    this.disposables.push(
      this.repository.state.onDidChange(() => {
        if (this.repository.state.HEAD?.name) {
          this.logAuditEntry(
            'branch_change',
            {
              branch: this.repository.state.HEAD.name,
            },
            'System'
          );
        }
      })
    );
  }

  private async handleWorkflowChange(
    filePath: string,
    changeType: 'created' | 'modified' | 'deleted'
  ): Promise<void> {
    try {
      const message = `Auto-commit: ${changeType} workflow file ${path.basename(
        filePath
      )}`;
      const commitHash = await this.createWorkflowCommit(
        message,
        [filePath],
        'Helix VSCode Extension'
      );

      console.log(
        `Auto-commit created for ${changeType} workflow: ${commitHash}`
      );
    } catch (error) {
      console.error(`Failed to auto-commit ${changeType} workflow:`, error);
    }
  }

  private detectWorkflowChangeType(
    filePath: string
  ): GitWorkflowChange['type'] {
    // Simple detection based on file existence and content
    if (fs.existsSync(filePath)) {
      return 'workflow_modified';
    }
    return 'workflow_deleted';
  }

  private extractWorkflowId(filePath: string): string {
    // Extract workflow ID from file path or content
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName;
  }

  private extractWorkflowName(filePath: string): string {
    // Extract workflow name from file path or content
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.replace(/[_-]/g, ' ');
  }

  private async findWorkflowFiles(): Promise<string[]> {
    // Find all workflow-related files in the workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    const pattern = '**/*.{workflow,spiral,json,yaml,yml}';
    const files = await vscode.workspace.findFiles(pattern);

    return files.map(file => file.fsPath);
  }

  private generatePreCommitHook(): string {
    return `#!/bin/sh
# Helix VSCode Extension Pre-commit Hook
# Validates workflow files before commit

echo "Validating workflow files..."

# Check for workflow syntax errors
for file in $(git diff --cached --name-only | grep -E '\\.(workflow|spiral|json|yaml|yml)$'); do
    if [ -f "$file" ]; then
        echo "Checking $file..."
        # Add validation logic here
    fi
done

echo "Workflow validation complete."
`;
  }

  private generatePostCommitHook(): string {
    return `#!/bin/sh
# Helix VSCode Extension Post-commit Hook
# Logs workflow changes

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log --format=%B -n 1 $COMMIT_HASH)

echo "Commit $COMMIT_HASH: $COMMIT_MESSAGE" >> helix-workflow-audit.log
`;
  }

  private async installGitHook(hook: GitHook): Promise<void> {
    if (!this.repository) return;

    const gitDir = this.repository.rootUri.fsPath;
    const hookPath = path.join(gitDir, '.git', 'hooks', hook.name);

    try {
      fs.writeFileSync(hookPath, hook.content, { mode: 0o755 });
      console.log(`Git hook ${hook.name} installed successfully`);
    } catch (error) {
      console.error(`Failed to install Git hook ${hook.name}:`, error);
    }
  }

  private logAuditEntry(action: string, details: any, user: string): void {
    const entry: GitAuditEntry = {
      timestamp: new Date(),
      action,
      details,
      user,
    };

    this.auditLog.push(entry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    this.saveAuditLog();
  }

  private saveAuditLog(): void {
    try {
      const auditDir = path.join(
        vscode.workspace.rootPath || '',
        '.helix',
        'git-audit'
      );
      if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
      }

      const auditFile = path.join(auditDir, 'audit-log.json');
      fs.writeFileSync(auditFile, JSON.stringify(this.auditLog, null, 2));
    } catch (error) {
      console.error('Failed to save audit log:', error);
    }
  }

  private loadAuditLog(): void {
    try {
      const auditDir = path.join(
        vscode.workspace.rootPath || '',
        '.helix',
        'git-audit'
      );
      const auditFile = path.join(auditDir, 'audit-log.json');

      if (fs.existsSync(auditFile)) {
        const data = fs.readFileSync(auditFile, 'utf8');
        this.auditLog = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load audit log:', error);
      this.auditLog = [];
    }
  }
}

// =============================================================================
// Standalone Git Helper Functions
// =============================================================================
// These functions use child_process.execFile with the git binary path obtained
// from VS Code's built-in git extension API for safe subprocess execution.

/**
 * Resolves the path to the git binary from VS Code's git extension.
 * Falls back to 'git' (on PATH) if the extension is unavailable.
 */
function getGitBinaryPath(): string {
  try {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (gitExtension) {
      const api = gitExtension.getAPI(1);
      if (api?.git?.path) {
        return api.git.path as string;
      }
    }
  } catch (err) {
    console.warn('Could not resolve git path from VS Code extension:', err);
  }
  return 'git';
}

/**
 * Resolves the workspace root directory (cwd for git commands).
 * Throws if no workspace folder is open.
 */
function getWorkspaceCwd(): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error('No workspace folder open');
  }
  return folder.uri.fsPath;
}

/**
 * Executes a git command using child_process.execFile and returns stdout.
 */
function execGit(args: string[], cwd: string): Promise<string> {
  const gitPath = getGitBinaryPath();
  return new Promise<string>((resolve, reject) => {
    cp.execFile(
      gitPath,
      args,
      { cwd, maxBuffer: 1024 * 256, timeout: 15_000 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr?.trim() || error.message;
          reject(new Error(`git ${args[0]}: ${msg}`));
        } else {
          resolve(stdout);
        }
      }
    );
  });
}

/**
 * Gets the git diff output.
 * @param staged If true, returns only staged changes (--staged). Otherwise unstaged.
 */
export async function getGitDiff(staged?: boolean): Promise<string> {
  const cwd = getWorkspaceCwd();
  const args = staged ? ['diff', '--staged'] : ['diff'];
  return execGit(args, cwd);
}

/**
 * Gets a summary of commits on the current branch that are not on main/master.
 * Tries 'main' first, then falls back to 'master'.
 */
export async function getBranchCommits(): Promise<string> {
  const cwd = getWorkspaceCwd();

  // Detect whether the default branch is 'main' or 'master'
  let baseBranch = 'main';
  try {
    await execGit(['rev-parse', '--verify', 'main'], cwd);
  } catch {
    try {
      await execGit(['rev-parse', '--verify', 'master'], cwd);
      baseBranch = 'master';
    } catch {
      // Neither main nor master exists — fall back to 'main' and let the
      // downstream error surface if it fails.
      baseBranch = 'main';
    }
  }

  const log = await execGit(
    ['log', `${baseBranch}..HEAD`, '--oneline', '--no-decorate'],
    cwd
  );
  const diff = await execGit(['diff', `${baseBranch}...HEAD`], cwd);
  return `Commits (${baseBranch}..HEAD):\n${log}\n\nDiff:\n${diff}`;
}

/**
 * Gets git blame output for a single line of a file.
 * @param filePath Absolute path to the file.
 * @param line 1-based line number.
 */
export async function getGitBlame(
  filePath: string,
  line: number
): Promise<string> {
  const cwd = getWorkspaceCwd();
  // Use workspace-relative path for git blame
  const relativePath = path.relative(cwd, filePath);
  return execGit(['blame', '-L', `${line},${line}`, '--', relativePath], cwd);
}
