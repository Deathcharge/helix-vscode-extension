/**
 * Helix VS Code Extension - Terminal Manager
 * Controls terminal integration and command execution
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export interface TerminalSettings {
  useInlineTerminal: boolean;
  outputLimit: number;
  characterLimit: number;
  collapseProgressBars: boolean;
  terminalCommandGeneratorProfile?: string;
}

export interface TerminalCommand {
  id: string;
  command: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface TerminalExecutionResult {
  success: boolean;
  output: string;
  exitCode: number;
  truncated: boolean;
}

export class TerminalManager extends EventEmitter {
  private static instance: TerminalManager;
  private settings: TerminalSettings;
  private context: vscode.ExtensionContext;
  private eventEmitter: vscode.EventEmitter<TerminalSettings> =
    new vscode.EventEmitter<TerminalSettings>();
  private inlineTerminal?: vscode.Terminal;

  private constructor(context: vscode.ExtensionContext) {
    super();
    this.context = context;
    this.settings = this.getDefaultSettings();

    this.loadSettings();
  }

  public static getInstance(
    context?: vscode.ExtensionContext
  ): TerminalManager {
    if (!TerminalManager.instance) {
      if (!context) {
        throw new Error(
          'TerminalManager requires ExtensionContext on first initialization'
        );
      }
      TerminalManager.instance = new TerminalManager(context);
    }
    return TerminalManager.instance;
  }

  /**
   * Get default terminal settings
   */
  private getDefaultSettings(): TerminalSettings {
    return {
      useInlineTerminal: true,
      outputLimit: 2500,
      characterLimit: 50000,
      collapseProgressBars: true,
    };
  }

  /**
   * Load settings from storage
   */
  private loadSettings(): void {
    try {
      const storageKey = 'terminalSettings';
      const stored = this.context.globalState.get<TerminalSettings>(storageKey);
      if (stored) {
        this.settings = stored;
      }
    } catch (error) {
      console.error('Failed to load terminal settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    try {
      const storageKey = 'terminalSettings';
      this.context.globalState.update(storageKey, this.settings);
      this.eventEmitter.fire(this.settings);
    } catch (error) {
      console.error('Failed to save terminal settings:', error);
    }
  }

  /**
   * Get current terminal settings
   */
  public getSettings(): TerminalSettings {
    return { ...this.settings };
  }

  /**
   * Update terminal settings
   */
  public updateSettings(updates: Partial<TerminalSettings>): void {
    Object.assign(this.settings, updates);
    this.saveSettings();
  }

  /**
   * Execute command
   */
  public async executeCommand(
    command: TerminalCommand
  ): Promise<TerminalExecutionResult> {
    if (this.settings.useInlineTerminal) {
      return await this.executeInInlineTerminal(command);
    } else {
      return await this.executeInVSCodeTerminal(command);
    }
  }

  /**
   * Execute command in inline terminal (background)
   */
  private async executeInInlineTerminal(
    command: TerminalCommand
  ): Promise<TerminalExecutionResult> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const options: any = {
        maxBuffer: this.settings.characterLimit * 1024,
        cwd: command.workingDirectory || vscode.workspace.rootPath,
      };

      if (command.environment) {
        options.env = { ...process.env, ...command.environment };
      }

      const { stdout, stderr } = await execAsync(command.command, options);

      // Combine stdout and stderr
      let output = stdout;
      if (stderr) {
        output += '\n' + stderr;
      }

      // Apply truncation
      const processedOutput = this.processOutput(output);

      return {
        success: true,
        output: processedOutput,
        exitCode: 0,
        truncated: processedOutput !== output,
      };
    } catch (error: any) {
      const processedOutput = this.processOutput(
        error.message || String(error)
      );

      return {
        success: false,
        output: processedOutput,
        exitCode: error.code || 1,
        truncated: processedOutput !== error.message,
      };
    }
  }

  /**
   * Execute command in VS Code terminal
   */
  private async executeInVSCodeTerminal(
    command: TerminalCommand
  ): Promise<TerminalExecutionResult> {
    return new Promise(resolve => {
      const terminal = vscode.window.createTerminal({
        name: 'Helix Terminal',
        cwd: command.workingDirectory || vscode.workspace.rootPath,
        env: command.environment,
      });

      // Send command
      terminal.sendText(command.command);

      // Listen for close
      const disposable = vscode.window.onDidCloseTerminal(t => {
        if (t === terminal) {
          disposable.dispose();
          resolve({
            success: true,
            output: 'Command executed in VS Code terminal',
            exitCode: 0,
            truncated: false,
          });
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        disposable.dispose();
        terminal.dispose();
        resolve({
          success: true,
          output: 'Command execution timed out after 60 seconds',
          exitCode: 0,
          truncated: false,
        });
      }, 60000);
    });
  }

  /**
   * Process terminal output (apply limits and collapsing)
   */
  private processOutput(output: string): string {
    let processed = output;

    // Apply character limit
    if (processed.length > this.settings.characterLimit) {
      const half = Math.floor(this.settings.characterLimit / 2);
      processed =
        processed.substring(0, half) +
        '\n... [output truncated to fit character limit] ...\n' +
        processed.substring(-half);
    }

    // Collapse progress bars if enabled
    if (this.settings.collapseProgressBars) {
      processed = this.collapseProgressBars(processed);
    }

    return processed;
  }

  /**
   * Collapse progress bars in output
   */
  private collapseProgressBars(output: string): string {
    // Remove ANSI escape codes for progress bars
    // This is a simplified version - full implementation would need more sophisticated regex

    // Remove carriage returns and partial progress updates
    const lines = output.split('\n');
    const filteredLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';

      // Skip lines that look like progress bar updates
      if (this.isProgressBarLine(line)) {
        // Keep only the last progress bar line in a sequence
        if (
          i === lines.length - 1 ||
          !this.isProgressBarLine(lines[i + 1] ?? '')
        ) {
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    }

    return filteredLines.join('\n');
  }

  /**
   * Check if line looks like a progress bar
   */
  private isProgressBarLine(line: string): boolean {
    // Look for patterns like [====>  ] 75%
    const progressBarPatterns = [
      /\[=*>\s*\]\s*\d+%/,
      /===+>/,
      /^\s*\d+%/,
      /Progress:\s*\d+\/\d+/,
    ];

    return progressBarPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Generate terminal command using AI
   */
  public async generateTerminalCommand(
    prompt: string,
    context?: string
  ): Promise<string> {
    // This would call the backend to generate a terminal command
    // For now, return a placeholder
    return `echo "Generated command for: ${prompt}"`;
  }

  /**
   * Execute multiple commands in sequence
   */
  public async executeCommands(
    commands: TerminalCommand[]
  ): Promise<TerminalExecutionResult[]> {
    const results: TerminalExecutionResult[] = [];

    for (const command of commands) {
      const result = await this.executeCommand(command);
      results.push(result);

      // Stop on failure
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Create a new VS Code terminal for interactive use
   */
  public createInteractiveTerminal(): vscode.Terminal {
    return vscode.window.createTerminal('Helix Interactive');
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
