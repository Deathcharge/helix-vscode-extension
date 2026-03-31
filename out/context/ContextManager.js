"use strict";
/**
 * Helix VS Code Extension - Context Manager
 * Controls what information is included in AI's context window
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
exports.ContextManager = exports.GitFileStatus = void 0;
const vscode = __importStar(require("vscode"));
var GitFileStatus;
(function (GitFileStatus) {
    GitFileStatus["Modified"] = "modified";
    GitFileStatus["Added"] = "added";
    GitFileStatus["Deleted"] = "deleted";
    GitFileStatus["Renamed"] = "renamed";
    GitFileStatus["Conflicted"] = "conflicted";
})(GitFileStatus || (exports.GitFileStatus = GitFileStatus = {}));
class ContextManager {
    constructor(context) {
        this.eventEmitter = new vscode.EventEmitter();
        /**
         * Event fired when settings change
         */
        this.onDidChangeSettings = this.eventEmitter.event;
        this.context = context;
        this.settings = this.getDefaultSettings();
        this.loadSettings();
        this.initializeGit();
    }
    static getInstance(context) {
        if (!ContextManager.instance) {
            if (!context) {
                throw new Error('ContextManager requires ExtensionContext on first initialization');
            }
            ContextManager.instance = new ContextManager(context);
        }
        return ContextManager.instance;
    }
    /**
     * Get default context settings
     */
    getDefaultSettings() {
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
    loadSettings() {
        try {
            const storageKey = 'contextSettings';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                this.settings = stored;
            }
        }
        catch (error) {
            console.error('Failed to load context settings:', error);
        }
    }
    /**
     * Save settings to storage
     */
    saveSettings() {
        try {
            const storageKey = 'contextSettings';
            this.context.globalState.update(storageKey, this.settings);
            this.eventEmitter.fire(this.settings);
        }
        catch (error) {
            console.error('Failed to save context settings:', error);
        }
    }
    /**
     * Initialize Git extension
     */
    initializeGit() {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (gitExtension) {
                gitExtension.activate().then((extension) => {
                    this.gitExtension = extension.getAPI(1);
                });
            }
        }
        catch (error) {
            console.error('Failed to initialize Git extension:', error);
        }
    }
    /**
     * Get current context settings
     */
    getSettings() {
        return { ...this.settings };
    }
    /**
     * Update context settings
     */
    updateSettings(updates) {
        Object.assign(this.settings, updates);
        this.saveSettings();
    }
    /**
     * Get workspace context
     */
    async getWorkspaceContext() {
        const context = {
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
    async getOpenTabs() {
        const allTabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
        const uris = allTabs
            .filter(tab => tab.input instanceof vscode.TabInputText)
            .map(tab => tab.input.uri)
            .slice(0, this.settings.openTabsLimit);
        return uris;
    }
    /**
     * Get workspace files
     */
    async getWorkspaceFiles() {
        if (!vscode.workspace.workspaceFolders) {
            return [];
        }
        const files = [];
        for (const folder of vscode.workspace.workspaceFolders) {
            const pattern = new vscode.RelativePattern(folder, '**/*');
            const entries = await vscode.workspace.findFiles(pattern, '**/node_modules/**', this.settings.workspaceFilesLimit);
            files.push(...entries);
        }
        return files.slice(0, this.settings.workspaceFilesLimit);
    }
    /**
     * Get Git status
     */
    async getGitStatus() {
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
            const changedFiles = [];
            for (const change of changes) {
                if (changedFiles.length >= this.settings.gitStatusMaxFiles) {
                    break;
                }
                let status;
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
        }
        catch (error) {
            console.error('Failed to get Git status:', error);
            return undefined;
        }
    }
    /**
     * Get diagnostics
     */
    async getDiagnostics() {
        if (!this.settings.includeDiagnostics) {
            return [];
        }
        const allDiagnostics = vscode.languages.getDiagnostics();
        let diagnostics = [];
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
    getTimeInfo() {
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
    async readFile(uri, startLine, endLine) {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const text = Buffer.from(content).toString('utf-8');
            const lines = text.split('\n');
            let resultText = text;
            let truncated = false;
            if (startLine !== undefined && endLine !== undefined) {
                resultText = lines.slice(startLine - 1, endLine).join('\n');
            }
            else if (this.settings.fileReadAutoTruncateThreshold > 0 &&
                lines.length > this.settings.fileReadAutoTruncateThreshold) {
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
        }
        catch (error) {
            console.error('Failed to read file:', error);
            throw error;
        }
    }
    /**
     * Generate line number index for code definitions
     */
    generateLineIndex(lines) {
        const definitions = [];
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
    async readFiles(uris) {
        const results = new Map();
        const batches = this.chunkArray(uris, this.settings.concurrentFileReadsLimit);
        for (const batch of batches) {
            const promises = batch.map(async (uri) => {
                try {
                    const result = await this.readFile(uri);
                    results.set(uri, result);
                }
                catch (error) {
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
    shouldCondenseContext(currentContextPercent) {
        return currentContextPercent >= this.settings.condensingTriggerThreshold;
    }
    /**
     * Check if large read is allowed
     */
    shouldAllowLargeRead(contentSizePercent) {
        return this.settings.allowLargeReadsOnOverflow || contentSizePercent < 80;
    }
    /**
     * Check if file should be ignored
     */
    shouldIgnoreFile(uri) {
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
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
    }
}
exports.ContextManager = ContextManager;
//# sourceMappingURL=ContextManager.js.map