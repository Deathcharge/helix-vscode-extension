"use strict";
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
exports.VSCodeIntegration = void 0;
const vscode = __importStar(require("vscode"));
class VSCodeIntegration {
    constructor(context, options) {
        this.disposables = [];
        this.context = context;
        this.options = {
            enableCommandRegistration: true,
            enableStatusBarManagement: true,
            enableTreeViewCreation: true,
            enableTerminalManagement: true,
            enableLanguageFeatures: true,
            enableFileSystemAccess: true,
            ...options,
        };
    }
    /**
     * Registers multiple commands at once
     */
    registerCommands(commands) {
        if (!this.options.enableCommandRegistration)
            return;
        commands.forEach(command => {
            const disposable = vscode.commands.registerCommand(command.command, async (...args) => {
                try {
                    // This would be implemented by the calling extension
                    console.log(`Command ${command.command} executed with args:`, args);
                }
                catch (error) {
                    console.error(`Error executing command ${command.command}:`, error);
                    vscode.window.showErrorMessage(`Command failed: ${command.command}`);
                }
            });
            this.context.subscriptions.push(disposable);
            this.disposables.push(disposable);
        });
    }
    /**
     * Creates and manages status bar items
     */
    createStatusBarItem(options) {
        if (!this.options.enableStatusBarManagement) {
            throw new Error('Status bar management is disabled');
        }
        const statusBarItem = vscode.window.createStatusBarItem(options.alignment, options.priority);
        statusBarItem.text = options.text;
        statusBarItem.tooltip = options.tooltip;
        statusBarItem.command = options.command;
        statusBarItem.show();
        this.context.subscriptions.push(statusBarItem);
        this.disposables.push(statusBarItem);
        return statusBarItem;
    }
    /**
     * Creates tree views
     */
    createTreeView(viewId, options) {
        if (!this.options.enableTreeViewCreation) {
            throw new Error('Tree view creation is disabled');
        }
        const treeView = vscode.window.createTreeView(viewId, {
            treeDataProvider: options.treeDataProvider,
            showCollapseAll: options.showCollapseAll ?? false,
            canSelectMany: options.canSelectMany ?? false,
        });
        this.context.subscriptions.push(treeView);
        this.disposables.push(treeView);
        return treeView;
    }
    /**
     * Creates quick pick menus
     */
    async showQuickPick(items, options) {
        const quickPick = vscode.window.createQuickPick();
        if (options?.placeHolder) {
            quickPick.placeholder = options.placeHolder;
        }
        if (options?.canPickMany) {
            quickPick.canSelectMany = true;
        }
        quickPick.items = items;
        return new Promise(resolve => {
            quickPick.onDidChangeSelection(selection => {
                if (options?.canPickMany) {
                    resolve(selection);
                }
                else {
                    resolve(selection[0]);
                }
            });
            quickPick.onDidHide(() => {
                quickPick.dispose();
                resolve(undefined);
            });
            quickPick.show();
        });
    }
    /**
     * Creates input boxes
     */
    async showInputBox(options) {
        const inputBoxOptions = {};
        if (options?.prompt)
            inputBoxOptions.prompt = options.prompt;
        if (options?.placeHolder)
            inputBoxOptions.placeHolder = options.placeHolder;
        if (options?.value)
            inputBoxOptions.value = options.value;
        if (options?.validateInput)
            inputBoxOptions.validateInput = options.validateInput;
        return vscode.window.showInputBox(inputBoxOptions);
    }
    /**
     * Creates terminal instances
     */
    createTerminal(options) {
        if (!this.options.enableTerminalManagement) {
            throw new Error('Terminal management is disabled');
        }
        const terminalOptions = {
            name: options.name || 'Helix Terminal',
        };
        if (options.shellPath)
            terminalOptions.shellPath = options.shellPath;
        if (options.shellArgs)
            terminalOptions.shellArgs = options.shellArgs;
        if (options.cwd)
            terminalOptions.cwd = options.cwd;
        if (options.env)
            terminalOptions.env = options.env;
        const terminal = vscode.window.createTerminal(terminalOptions);
        this.context.subscriptions.push(terminal);
        this.disposables.push(terminal);
        return terminal;
    }
    /**
     * Shows terminal output
     */
    showTerminalOutput(terminal, output) {
        terminal.show();
        terminal.sendText(output);
    }
    /**
     * Registers language providers
     */
    registerLanguageProviders() {
        if (!this.options.enableLanguageFeatures)
            return;
        // Completion provider
        const completionProvider = vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: '*' }, {
            provideCompletionItems(document, position) {
                const linePrefix = document
                    .lineAt(position)
                    .text.substr(0, position.character);
                if (!linePrefix.endsWith('helix.')) {
                    return undefined;
                }
                return [
                    new vscode.CompletionItem('helix.analyzeCode', vscode.CompletionItemKind.Function),
                    new vscode.CompletionItem('helix.generateTests', vscode.CompletionItemKind.Function),
                    new vscode.CompletionItem('helix.refactorCode', vscode.CompletionItemKind.Function),
                ];
            },
        }, '.' // trigger character
        );
        this.context.subscriptions.push(completionProvider);
        this.disposables.push(completionProvider);
        // Hover provider
        const hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file', language: '*' }, {
            provideHover(document, position) {
                const range = document.getWordRangeAtPosition(position);
                const word = document.getText(range);
                if (word === 'helix') {
                    const hover = new vscode.Hover('Helix VSCode Extension\nProvides AI-powered development assistance');
                    return hover;
                }
                return undefined;
            },
        });
        this.context.subscriptions.push(hoverProvider);
        this.disposables.push(hoverProvider);
        // Definition provider
        const definitionProvider = vscode.languages.registerDefinitionProvider({ scheme: 'file', language: '*' }, {
            provideDefinition(document, position) {
                const range = document.getWordRangeAtPosition(position);
                const word = document.getText(range);
                if (word === 'helix') {
                    return new vscode.Location(document.uri, position);
                }
                return undefined;
            },
        });
        this.context.subscriptions.push(definitionProvider);
        this.disposables.push(definitionProvider);
    }
    /**
     * Registers file system providers
     */
    registerFileSystemProvider(scheme, provider) {
        if (!this.options.enableFileSystemAccess) {
            throw new Error('File system access is disabled');
        }
        const disposable = vscode.workspace.registerFileSystemProvider(scheme, provider);
        this.context.subscriptions.push(disposable);
        this.disposables.push(disposable);
    }
    /**
     * Creates webview panels
     */
    createWebviewPanel(viewType, title, showOptions, options) {
        const panel = vscode.window.createWebviewPanel(viewType, title, showOptions, options);
        this.context.subscriptions.push(panel);
        this.disposables.push(panel);
        return panel;
    }
    /**
     * Shows information messages
     */
    showInfoMessage(message, ...items) {
        return vscode.window.showInformationMessage(message, ...items);
    }
    /**
     * Shows warning messages
     */
    showWarningMessage(message, ...items) {
        return vscode.window.showWarningMessage(message, ...items);
    }
    /**
     * Shows error messages
     */
    showErrorMessage(message, ...items) {
        return vscode.window.showErrorMessage(message, ...items);
    }
    /**
     * Shows input boxes with validation
     */
    async showValidatedInputBox(prompt, validate) {
        return vscode.window.showInputBox({
            prompt,
            validateInput: validate,
        });
    }
    /**
     * Shows progress indicators
     */
    async withProgress(options, task) {
        return vscode.window.withProgress(options, task);
    }
    /**
     * Shows quick picks with custom actions
     */
    async showActionableQuickPick(items, actionHandler) {
        const quickPick = vscode.window.createQuickPick();
        quickPick.items = items;
        quickPick.onDidChangeSelection(selection => {
            if (selection[0]) {
                actionHandler(selection[0]);
                quickPick.dispose();
            }
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    }
    /**
     * Registers file watchers
     */
    createFileSystemWatcher(pattern) {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        this.context.subscriptions.push(watcher);
        this.disposables.push(watcher);
        return watcher;
    }
    /**
     * Gets workspace configuration
     */
    getConfiguration(section, scope) {
        return vscode.workspace.getConfiguration(section, scope);
    }
    /**
     * Sets workspace configuration
     */
    async setConfiguration(section, value, scope, global) {
        const config = vscode.workspace.getConfiguration();
        await config.update(section, value, scope || vscode.ConfigurationTarget.Workspace);
    }
    /**
     * Gets active text editor
     */
    getActiveTextEditor() {
        return vscode.window.activeTextEditor;
    }
    /**
     * Gets all text editors
     */
    getTextEditors() {
        return vscode.window.visibleTextEditors;
    }
    /**
     * Opens text documents
     */
    async openTextDocument(uri) {
        return vscode.workspace.openTextDocument(uri);
    }
    /**
     * Shows text documents
     */
    async showTextDocument(document, column, preserveFocus) {
        return vscode.window.showTextDocument(document, column, preserveFocus);
    }
    /**
     * Creates output channels
     */
    createOutputChannel(name) {
        const channel = vscode.window.createOutputChannel(name);
        this.context.subscriptions.push(channel);
        this.disposables.push(channel);
        return channel;
    }
    /**
     * Shows diff editors
     */
    async showDiff(left, right, title) {
        return vscode.commands.executeCommand('vscode.diff', left, right, title || 'Helix Diff');
    }
    /**
     * Executes commands
     */
    async executeCommand(command, ...rest) {
        return vscode.commands.executeCommand(command, ...rest);
    }
    /**
     * Registers tree data providers
     */
    registerTreeDataProvider(viewId, treeDataProvider) {
        const disposable = vscode.window.registerTreeDataProvider(viewId, treeDataProvider);
        this.context.subscriptions.push(disposable);
        this.disposables.push(disposable);
        return disposable;
    }
    /**
     * Creates diagnostic collections
     */
    createDiagnosticCollection(name) {
        const collection = vscode.languages.createDiagnosticCollection(name);
        this.context.subscriptions.push(collection);
        this.disposables.push(collection);
        return collection;
    }
    /**
     * Registers code actions
     */
    registerCodeActions(selector, provider) {
        const disposable = vscode.languages.registerCodeActionsProvider(selector, provider);
        this.context.subscriptions.push(disposable);
        this.disposables.push(disposable);
        return disposable;
    }
    /**
     * Registers code lenses
     */
    registerCodeLenses(selector, provider) {
        const disposable = vscode.languages.registerCodeLensProvider(selector, provider);
        this.context.subscriptions.push(disposable);
        this.disposables.push(disposable);
        return disposable;
    }
    /**
     * Registers document symbols
     */
    registerDocumentSymbols(selector, provider) {
        const disposable = vscode.languages.registerDocumentSymbolProvider(selector, provider);
        this.context.subscriptions.push(disposable);
        this.disposables.push(disposable);
        return disposable;
    }
    /**
     * Registers references
     */
    registerReferences(selector, provider) {
        const disposable = vscode.languages.registerReferenceProvider(selector, provider);
        this.context.subscriptions.push(disposable);
        this.disposables.push(disposable);
        return disposable;
    }
    /**
     * Registers rename functionality
     */
    registerRename(selector, provider) {
        const disposable = vscode.languages.registerRenameProvider(selector, provider);
        this.context.subscriptions.push(disposable);
        this.disposables.push(disposable);
        return disposable;
    }
    /**
     * Disposes all resources
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
    /**
     * Gets VSCode version information
     */
    getVSCodeVersion() {
        return vscode.version;
    }
    /**
     * Gets extension path
     */
    getExtensionPath() {
        return this.context.extensionPath;
    }
    /**
     * Gets global storage path
     */
    getGlobalStoragePath() {
        return this.context.globalStorageUri.fsPath;
    }
    /**
     * Gets workspace storage path
     */
    getWorkspaceStoragePath() {
        return this.context.storageUri?.fsPath || '';
    }
    /**
     * Sets context values
     */
    async setContext(key, value) {
        await vscode.commands.executeCommand('setContext', key, value);
    }
    /**
     * Gets context values
     */
    getContext(key) {
        // This would need to be implemented based on how context values are stored
        return undefined;
    }
    /**
     * Creates decorators
     */
    createTextEditorDecorationType(options) {
        const decoration = vscode.window.createTextEditorDecorationType(options);
        this.context.subscriptions.push(decoration);
        this.disposables.push(decoration);
        return decoration;
    }
    /**
     * Shows file dialogs
     */
    async showOpenDialog(options) {
        return vscode.window.showOpenDialog(options);
    }
    /**
     * Shows save dialogs
     */
    async showSaveDialog(options) {
        return vscode.window.showSaveDialog(options);
    }
    /**
     * Gets workspace folders
     */
    getWorkspaceFolders() {
        return vscode.workspace.workspaceFolders;
    }
    /**
     * Gets workspace root path
     */
    getWorkspaceRootPath() {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }
    /**
     * Checks if file exists
     */
    async fileExists(uri) {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Reads file content
     */
    async readFile(uri) {
        const data = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(data).toString('utf8');
    }
    /**
     * Writes file content
     */
    async writeFile(uri, content) {
        const data = Buffer.from(content, 'utf8');
        await vscode.workspace.fs.writeFile(uri, data);
    }
    /**
     * Creates directories
     */
    async createDirectory(uri) {
        await vscode.workspace.fs.createDirectory(uri);
    }
    /**
     * Deletes files
     */
    async deleteFile(uri, options) {
        await vscode.workspace.fs.delete(uri, options);
    }
    /**
     * Renames files
     */
    async renameFile(oldUri, newUri, options) {
        await vscode.workspace.fs.rename(oldUri, newUri, options);
    }
    /**
     * Gets file stats
     */
    async getFileStats(uri) {
        return vscode.workspace.fs.stat(uri);
    }
    /**
     * Reads directory
     */
    async readDirectory(uri) {
        return vscode.workspace.fs.readDirectory(uri);
    }
}
exports.VSCodeIntegration = VSCodeIntegration;
//# sourceMappingURL=vscode-integration.js.map