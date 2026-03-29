import * as vscode from 'vscode';
import {
  VSCodeCommand,
  VSCodeQuickPickItem,
  VSCodeStatusBarItem,
} from '../types/vscode-integration';

export interface VSCodeIntegrationOptions {
  enableCommandRegistration: boolean;
  enableStatusBarManagement: boolean;
  enableTreeViewCreation: boolean;
  enableTerminalManagement: boolean;
  enableLanguageFeatures: boolean;
  enableFileSystemAccess: boolean;
}

export class VSCodeIntegration {
  private context: vscode.ExtensionContext;
  private options: VSCodeIntegrationOptions;
  private disposables: vscode.Disposable[] = [];

  constructor(
    context: vscode.ExtensionContext,
    options?: Partial<VSCodeIntegrationOptions>
  ) {
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
  registerCommands(commands: VSCodeCommand[]): void {
    if (!this.options.enableCommandRegistration) return;

    commands.forEach(command => {
      const disposable = vscode.commands.registerCommand(
        command.command,
        async (...args: any[]) => {
          try {
            // This would be implemented by the calling extension
            console.log(`Command ${command.command} executed with args:`, args);
          } catch (error) {
            console.error(`Error executing command ${command.command}:`, error);
            vscode.window.showErrorMessage(
              `Command failed: ${command.command}`
            );
          }
        }
      );

      this.context.subscriptions.push(disposable);
      this.disposables.push(disposable);
    });
  }

  /**
   * Creates and manages status bar items
   */
  createStatusBarItem(options: VSCodeStatusBarItem): vscode.StatusBarItem {
    if (!this.options.enableStatusBarManagement) {
      throw new Error('Status bar management is disabled');
    }

    const statusBarItem = vscode.window.createStatusBarItem(
      options.alignment,
      options.priority
    );
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
  createTreeView<T>(
    viewId: string,
    options: {
      treeDataProvider: vscode.TreeDataProvider<T>;
      showCollapseAll?: boolean;
      canSelectMany?: boolean;
    }
  ): vscode.TreeView<T> {
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
  async showQuickPick(
    items: VSCodeQuickPickItem[],
    options?: {
      placeHolder?: string;
      canPickMany?: boolean;
    }
  ): Promise<VSCodeQuickPickItem | VSCodeQuickPickItem[] | undefined> {
    const quickPick = vscode.window.createQuickPick<VSCodeQuickPickItem>();

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
          resolve(selection as VSCodeQuickPickItem[]);
        } else {
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
  async showInputBox(options?: {
    prompt?: string;
    placeHolder?: string;
    value?: string;
    validateInput?: (value: string) => string | null | Promise<string | null>;
  }): Promise<string | undefined> {
    const inputBoxOptions: any = {};
    if (options?.prompt) inputBoxOptions.prompt = options.prompt;
    if (options?.placeHolder) inputBoxOptions.placeHolder = options.placeHolder;
    if (options?.value) inputBoxOptions.value = options.value;
    if (options?.validateInput)
      inputBoxOptions.validateInput = options.validateInput;

    return vscode.window.showInputBox(inputBoxOptions);
  }

  /**
   * Creates terminal instances
   */
  createTerminal(options: {
    name?: string;
    shellPath?: string;
    shellArgs?: string[];
    cwd?: string;
    env?: { [key: string]: string };
  }): vscode.Terminal {
    if (!this.options.enableTerminalManagement) {
      throw new Error('Terminal management is disabled');
    }

    const terminalOptions: any = {
      name: options.name || 'Helix Terminal',
    };

    if (options.shellPath) terminalOptions.shellPath = options.shellPath;
    if (options.shellArgs) terminalOptions.shellArgs = options.shellArgs;
    if (options.cwd) terminalOptions.cwd = options.cwd;
    if (options.env) terminalOptions.env = options.env;

    const terminal = vscode.window.createTerminal(terminalOptions);

    this.context.subscriptions.push(terminal);
    this.disposables.push(terminal);

    return terminal;
  }

  /**
   * Shows terminal output
   */
  showTerminalOutput(terminal: vscode.Terminal, output: string): void {
    terminal.show();
    terminal.sendText(output);
  }

  /**
   * Registers language providers
   */
  registerLanguageProviders(): void {
    if (!this.options.enableLanguageFeatures) return;

    // Completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: '*' },
      {
        provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position
        ) {
          const linePrefix = document
            .lineAt(position)
            .text.substr(0, position.character);
          if (!linePrefix.endsWith('helix.')) {
            return undefined;
          }

          return [
            new vscode.CompletionItem(
              'helix.analyzeCode',
              vscode.CompletionItemKind.Function
            ),
            new vscode.CompletionItem(
              'helix.generateTests',
              vscode.CompletionItemKind.Function
            ),
            new vscode.CompletionItem(
              'helix.refactorCode',
              vscode.CompletionItemKind.Function
            ),
          ];
        },
      },
      '.' // trigger character
    );

    this.context.subscriptions.push(completionProvider);
    this.disposables.push(completionProvider);

    // Hover provider
    const hoverProvider = vscode.languages.registerHoverProvider(
      { scheme: 'file', language: '*' },
      {
        provideHover(document: vscode.TextDocument, position: vscode.Position) {
          const range = document.getWordRangeAtPosition(position);
          const word = document.getText(range);

          if (word === 'helix') {
            const hover = new vscode.Hover(
              'Helix VSCode Extension\nProvides AI-powered development assistance'
            );
            return hover;
          }

          return undefined;
        },
      }
    );

    this.context.subscriptions.push(hoverProvider);
    this.disposables.push(hoverProvider);

    // Definition provider
    const definitionProvider = vscode.languages.registerDefinitionProvider(
      { scheme: 'file', language: '*' },
      {
        provideDefinition(
          document: vscode.TextDocument,
          position: vscode.Position
        ) {
          const range = document.getWordRangeAtPosition(position);
          const word = document.getText(range);

          if (word === 'helix') {
            return new vscode.Location(document.uri, position);
          }

          return undefined;
        },
      }
    );

    this.context.subscriptions.push(definitionProvider);
    this.disposables.push(definitionProvider);
  }

  /**
   * Registers file system providers
   */
  registerFileSystemProvider(
    scheme: string,
    provider: vscode.FileSystemProvider
  ): void {
    if (!this.options.enableFileSystemAccess) {
      throw new Error('File system access is disabled');
    }

    const disposable = vscode.workspace.registerFileSystemProvider(
      scheme,
      provider
    );
    this.context.subscriptions.push(disposable);
    this.disposables.push(disposable);
  }

  /**
   * Creates webview panels
   */
  createWebviewPanel(
    viewType: string,
    title: string,
    showOptions:
      | vscode.ViewColumn
      | { viewColumn: vscode.ViewColumn; preserveFocus?: boolean },
    options?: vscode.WebviewPanelOptions & vscode.WebviewOptions
  ): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      showOptions,
      options
    );

    this.context.subscriptions.push(panel);
    this.disposables.push(panel);

    return panel;
  }

  /**
   * Shows information messages
   */
  showInfoMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
  }

  /**
   * Shows warning messages
   */
  showWarningMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(message, ...items);
  }

  /**
   * Shows error messages
   */
  showErrorMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message, ...items);
  }

  /**
   * Shows input boxes with validation
   */
  async showValidatedInputBox(
    prompt: string,
    validate: (value: string) => string | null | Promise<string | null>
  ): Promise<string | undefined> {
    return vscode.window.showInputBox({
      prompt,
      validateInput: validate,
    });
  }

  /**
   * Shows progress indicators
   */
  async withProgress<T>(
    options: vscode.ProgressOptions,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Thenable<T>
  ): Promise<T> {
    return vscode.window.withProgress(options, task);
  }

  /**
   * Shows quick picks with custom actions
   */
  async showActionableQuickPick<T>(
    items: vscode.QuickPickItem[],
    actionHandler: (item: vscode.QuickPickItem) => void
  ): Promise<void> {
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
  createFileSystemWatcher(pattern: string): vscode.FileSystemWatcher {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.context.subscriptions.push(watcher);
    this.disposables.push(watcher);
    return watcher;
  }

  /**
   * Gets workspace configuration
   */
  getConfiguration(
    section?: string,
    scope?: vscode.ConfigurationScope | null
  ): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section, scope);
  }

  /**
   * Sets workspace configuration
   */
  async setConfiguration(
    section: string,
    value: any,
    scope?: vscode.ConfigurationTarget,
    global?: boolean
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    await config.update(
      section,
      value,
      scope || vscode.ConfigurationTarget.Workspace
    );
  }

  /**
   * Gets active text editor
   */
  getActiveTextEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }

  /**
   * Gets all text editors
   */
  getTextEditors(): readonly vscode.TextEditor[] {
    return vscode.window.visibleTextEditors;
  }

  /**
   * Opens text documents
   */
  async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    return vscode.workspace.openTextDocument(uri);
  }

  /**
   * Shows text documents
   */
  async showTextDocument(
    document: vscode.TextDocument,
    column?: vscode.ViewColumn,
    preserveFocus?: boolean
  ): Promise<vscode.TextEditor> {
    return vscode.window.showTextDocument(document, column, preserveFocus);
  }

  /**
   * Creates output channels
   */
  createOutputChannel(name: string): vscode.OutputChannel {
    const channel = vscode.window.createOutputChannel(name);
    this.context.subscriptions.push(channel);
    this.disposables.push(channel);
    return channel;
  }

  /**
   * Shows diff editors
   */
  async showDiff(
    left: vscode.Uri,
    right: vscode.Uri,
    title?: string
  ): Promise<vscode.TextEditor | undefined> {
    return vscode.commands.executeCommand<vscode.TextEditor>(
      'vscode.diff',
      left,
      right,
      title || 'Helix Diff'
    );
  }

  /**
   * Executes commands
   */
  async executeCommand<T = any>(
    command: string,
    ...rest: any[]
  ): Promise<T | undefined> {
    return vscode.commands.executeCommand<T>(command, ...rest);
  }

  /**
   * Registers tree data providers
   */
  registerTreeDataProvider<T>(
    viewId: string,
    treeDataProvider: vscode.TreeDataProvider<T>
  ): vscode.Disposable {
    const disposable = vscode.window.registerTreeDataProvider(
      viewId,
      treeDataProvider
    );
    this.context.subscriptions.push(disposable);
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Creates diagnostic collections
   */
  createDiagnosticCollection(name?: string): vscode.DiagnosticCollection {
    const collection = vscode.languages.createDiagnosticCollection(name);
    this.context.subscriptions.push(collection);
    this.disposables.push(collection);
    return collection;
  }

  /**
   * Registers code actions
   */
  registerCodeActions(
    selector: vscode.DocumentSelector,
    provider: vscode.CodeActionProvider
  ): vscode.Disposable {
    const disposable = vscode.languages.registerCodeActionsProvider(
      selector,
      provider
    );
    this.context.subscriptions.push(disposable);
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Registers code lenses
   */
  registerCodeLenses(
    selector: vscode.DocumentSelector,
    provider: vscode.CodeLensProvider
  ): vscode.Disposable {
    const disposable = vscode.languages.registerCodeLensProvider(
      selector,
      provider
    );
    this.context.subscriptions.push(disposable);
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Registers document symbols
   */
  registerDocumentSymbols(
    selector: vscode.DocumentSelector,
    provider: vscode.DocumentSymbolProvider
  ): vscode.Disposable {
    const disposable = vscode.languages.registerDocumentSymbolProvider(
      selector,
      provider
    );
    this.context.subscriptions.push(disposable);
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Registers references
   */
  registerReferences(
    selector: vscode.DocumentSelector,
    provider: vscode.ReferenceProvider
  ): vscode.Disposable {
    const disposable = vscode.languages.registerReferenceProvider(
      selector,
      provider
    );
    this.context.subscriptions.push(disposable);
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Registers rename functionality
   */
  registerRename(
    selector: vscode.DocumentSelector,
    provider: vscode.RenameProvider
  ): vscode.Disposable {
    const disposable = vscode.languages.registerRenameProvider(
      selector,
      provider
    );
    this.context.subscriptions.push(disposable);
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Disposes all resources
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  /**
   * Gets VSCode version information
   */
  getVSCodeVersion(): string {
    return vscode.version;
  }

  /**
   * Gets extension path
   */
  getExtensionPath(): string {
    return this.context.extensionPath;
  }

  /**
   * Gets global storage path
   */
  getGlobalStoragePath(): string {
    return this.context.globalStorageUri.fsPath;
  }

  /**
   * Gets workspace storage path
   */
  getWorkspaceStoragePath(): string {
    return this.context.storageUri?.fsPath || '';
  }

  /**
   * Sets context values
   */
  async setContext(key: string, value: any): Promise<void> {
    await vscode.commands.executeCommand('setContext', key, value);
  }

  /**
   * Gets context values
   */
  getContext(key: string): any {
    // This would need to be implemented based on how context values are stored
    return undefined;
  }

  /**
   * Creates decorators
   */
  createTextEditorDecorationType(
    options: vscode.DecorationRenderOptions
  ): vscode.TextEditorDecorationType {
    const decoration = vscode.window.createTextEditorDecorationType(options);
    this.context.subscriptions.push(decoration);
    this.disposables.push(decoration);
    return decoration;
  }

  /**
   * Shows file dialogs
   */
  async showOpenDialog(
    options?: vscode.OpenDialogOptions
  ): Promise<vscode.Uri[] | undefined> {
    return vscode.window.showOpenDialog(options);
  }

  /**
   * Shows save dialogs
   */
  async showSaveDialog(
    options?: vscode.SaveDialogOptions
  ): Promise<vscode.Uri | undefined> {
    return vscode.window.showSaveDialog(options);
  }

  /**
   * Gets workspace folders
   */
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
    return vscode.workspace.workspaceFolders;
  }

  /**
   * Gets workspace root path
   */
  getWorkspaceRootPath(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0]!.uri.fsPath : undefined;
  }

  /**
   * Checks if file exists
   */
  async fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads file content
   */
  async readFile(uri: vscode.Uri): Promise<string> {
    const data = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(data).toString('utf8');
  }

  /**
   * Writes file content
   */
  async writeFile(uri: vscode.Uri, content: string): Promise<void> {
    const data = Buffer.from(content, 'utf8');
    await vscode.workspace.fs.writeFile(uri, data);
  }

  /**
   * Creates directories
   */
  async createDirectory(uri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.createDirectory(uri);
  }

  /**
   * Deletes files
   */
  async deleteFile(
    uri: vscode.Uri,
    options?: { recursive?: boolean; useTrash?: boolean }
  ): Promise<void> {
    await vscode.workspace.fs.delete(uri, options);
  }

  /**
   * Renames files
   */
  async renameFile(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options?: { overwrite?: boolean }
  ): Promise<void> {
    await vscode.workspace.fs.rename(oldUri, newUri, options);
  }

  /**
   * Gets file stats
   */
  async getFileStats(uri: vscode.Uri): Promise<vscode.FileStat> {
    return vscode.workspace.fs.stat(uri);
  }

  /**
   * Reads directory
   */
  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    return vscode.workspace.fs.readDirectory(uri);
  }
}
