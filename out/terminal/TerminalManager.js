"use strict";
/**
 * Helix VS Code Extension - Terminal Manager
 * Controls terminal integration and command execution
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalManager = void 0;
const vscode = __importStar(require("vscode"));
const events_1 = require("events");
class TerminalManager extends events_1.EventEmitter {
    constructor(context) {
        super();
        this.eventEmitter = new vscode.EventEmitter();
        /**
         * Event fired when settings change
         */
        this.onDidChangeSettings = this.eventEmitter.event;
        this.context = context;
        this.settings = this.getDefaultSettings();
        this.loadSettings();
    }
    static getInstance(context) {
        if (!TerminalManager.instance) {
            if (!context) {
                throw new Error('TerminalManager requires ExtensionContext on first initialization');
            }
            TerminalManager.instance = new TerminalManager(context);
        }
        return TerminalManager.instance;
    }
    /**
     * Get default terminal settings
     */
    getDefaultSettings() {
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
    loadSettings() {
        try {
            const storageKey = 'terminalSettings';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                this.settings = stored;
            }
        }
        catch (error) {
            console.error('Failed to load terminal settings:', error);
        }
    }
    /**
     * Save settings to storage
     */
    saveSettings() {
        try {
            const storageKey = 'terminalSettings';
            this.context.globalState.update(storageKey, this.settings);
            this.eventEmitter.fire(this.settings);
        }
        catch (error) {
            console.error('Failed to save terminal settings:', error);
        }
    }
    /**
     * Get current terminal settings
     */
    getSettings() {
        return { ...this.settings };
    }
    /**
     * Update terminal settings
     */
    updateSettings(updates) {
        Object.assign(this.settings, updates);
        this.saveSettings();
    }
    /**
     * Execute command
     */
    async executeCommand(command) {
        if (this.settings.useInlineTerminal) {
            return await this.executeInInlineTerminal(command);
        }
        else {
            return await this.executeInVSCodeTerminal(command);
        }
    }
    /**
     * Execute command in inline terminal (background)
     */
    async executeInInlineTerminal(command) {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            const options = {
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
        }
        catch (error) {
            const processedOutput = this.processOutput(error.message || String(error));
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
    async executeInVSCodeTerminal(command) {
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
    processOutput(output) {
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
    collapseProgressBars(output) {
        // Remove ANSI escape codes for progress bars
        // This is a simplified version - full implementation would need more sophisticated regex
        // Remove carriage returns and partial progress updates
        const lines = output.split('\n');
        const filteredLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            // Skip lines that look like progress bar updates
            if (this.isProgressBarLine(line)) {
                // Keep only the last progress bar line in a sequence
                if (i === lines.length - 1 ||
                    !this.isProgressBarLine(lines[i + 1] ?? '')) {
                    filteredLines.push(line);
                }
            }
            else {
                filteredLines.push(line);
            }
        }
        return filteredLines.join('\n');
    }
    /**
     * Check if line looks like a progress bar
     */
    isProgressBarLine(line) {
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
    async generateTerminalCommand(prompt, context) {
        // This would call the backend to generate a terminal command
        // For now, return a placeholder
        return `echo "Generated command for: ${prompt}"`;
    }
    /**
     * Execute multiple commands in sequence
     */
    async executeCommands(commands) {
        const results = [];
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
    createInteractiveTerminal() {
        return vscode.window.createTerminal('Helix Interactive');
    }
    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
    }
}
exports.TerminalManager = TerminalManager;
//# sourceMappingURL=TerminalManager.js.map