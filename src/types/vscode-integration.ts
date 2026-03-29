// VSCode Integration Types
import * as vscode from 'vscode';

export interface VSCodeCommand {
  command: string;
  title: string;
  category?: string;
}

export interface VSCodeStatusBarItem {
  text: string;
  tooltip?: string;
  command?: string;
  alignment: vscode.StatusBarAlignment;
  priority?: number;
}

export interface VSCodeTreeViewItem {
  label: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  command?: vscode.Command;
  contextValue?: string;
  iconPath?:
    | vscode.Uri
    | { light: vscode.Uri; dark: vscode.Uri }
    | vscode.ThemeIcon;
}

export interface VSCodeQuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  alwaysShow?: boolean;
}

export interface VSCodeNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  options?: {
    modal?: boolean;
    detail?: string;
    actions?: VSCodeCommand[];
  };
}

export interface VSCodeDebugConfig {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface VSCodeWorkspaceFolder {
  uri: vscode.Uri;
  name: string;
  index: number;
}

export interface VSCodeDocumentChange {
  document: vscode.TextDocument;
  contentChanges: readonly vscode.TextDocumentContentChangeEvent[];
}

export interface VSCodeConfigurationChangeEvent {
  affectsConfiguration: (
    section: string,
    scope?: vscode.ConfigurationScope | null
  ) => boolean;
}

export interface VSCodeExtensionContext {
  subscriptions: vscode.Disposable[];
  workspaceState: vscode.Memento;
  globalState: vscode.Memento;
  extensionUri: vscode.Uri;
}

export interface VSCodeWebviewOptions {
  enableScripts?: boolean;
  localResourceRoots?: readonly vscode.Uri[];
  portMapping?: readonly vscode.WebviewPortMapping[];
}

export interface VSCodeWebviewMessage {
  command: string;
  data?: any;
}

export interface VSCodeCommandPalette {
  showCommandPalette: () => Thenable<vscode.QuickPickItem | undefined>;
}

export interface VSCodeStatusBar {
  createStatusBarItem: (
    alignment?: vscode.StatusBarAlignment,
    priority?: number
  ) => vscode.StatusBarItem;
}

export interface VSCodeTreeView {
  createTreeView: <T>(
    viewId: string,
    options: {
      treeDataProvider: vscode.TreeDataProvider<T>;
      showCollapseAll?: boolean;
      canSelectMany?: boolean;
    }
  ) => vscode.TreeView<T>;
}

export interface VSCodeTerminal {
  createTerminal: (
    name?: string,
    shellPath?: string,
    shellArgs?: string[]
  ) => vscode.Terminal;
  activeTerminal?: vscode.Terminal;
  terminals: readonly vscode.Terminal[];
}

export interface VSCodeTerminalOptions {
  name?: string;
  shellPath?: string;
  shellArgs?: string[];
  cwd?: string;
  env?: { [key: string]: string };
  strictEnv?: boolean;
  hideFromUser?: boolean;
  isTransient?: boolean;
}

export interface VSCodeLanguageClient {
  start(): Thenable<void>;
  stop(): Thenable<void>;
  sendRequest: <R>(type: string, params?: any) => Thenable<R>;
  onNotification: <P>(type: string, handler: (params: P) => void) => void;
}

export interface VSCodeLanguageServer {
  start(): Thenable<void>;
  stop(): Thenable<void>;
}

export interface VSCodeCompletionItem {
  label: string | vscode.CompletionItemLabel;
  kind?: vscode.CompletionItemKind;
  detail?: string;
  documentation?: string | vscode.MarkdownString;
  insertText?: string | vscode.SnippetString;
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
  commitCharacters?: string[];
}

export interface VSCodeHover {
  contents: vscode.MarkdownString | vscode.MarkedString | vscode.MarkedString[];
  range?: vscode.Range;
}

export interface VSCodeSignatureHelp {
  signatures: vscode.SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface VSCodeDefinition {
  uri: vscode.Uri;
  range: vscode.Range;
}

export interface VSCodeReference {
  uri: vscode.Uri;
  range: vscode.Range;
}

export interface VSCodeDiagnostic {
  range: vscode.Range;
  message: string;
  severity: vscode.DiagnosticSeverity;
  code?: string | number;
  source?: string;
  relatedInformation?: vscode.DiagnosticRelatedInformation[];
}

export interface VSCodeCodeAction {
  title: string;
  command?: vscode.Command;
  edit?: vscode.WorkspaceEdit;
  diagnostics?: vscode.Diagnostic[];
  kind?: vscode.CodeActionKind;
}

export interface VSCodeCodeLens {
  range: vscode.Range;
  command?: vscode.Command;
  isResolved?: boolean;
}

export interface VSCodeDocumentSymbol {
  name: string;
  detail?: string;
  kind: vscode.SymbolKind;
  range: vscode.Range;
  selectionRange: vscode.Range;
  children?: vscode.DocumentSymbol[];
}

export interface VSCodeWorkspaceSymbol {
  name: string;
  kind: vscode.SymbolKind;
  location: vscode.Location;
}

export interface VSCodeFormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
  [key: string]: boolean | number | string;
}

export interface VSCodeTextEdit {
  range: vscode.Range;
  newText: string;
}

export interface VSCodeWorkspaceEdit {
  createFile?: vscode.Uri;
  deleteFile?: vscode.Uri;
  renameFile?: { oldUri: vscode.Uri; newUri: vscode.Uri };
  edits?: vscode.TextEdit[];
}

export interface VSCodeFileSystem {
  stat(uri: vscode.Uri): Thenable<vscode.FileStat>;
  readDirectory(uri: vscode.Uri): Thenable<[string, vscode.FileType][]>;
  createDirectory(uri: vscode.Uri): Thenable<void>;
  readFile(uri: vscode.Uri): Thenable<Uint8Array>;
  writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void>;
  delete(
    uri: vscode.Uri,
    options?: { recursive?: boolean; useTrash?: boolean }
  ): Thenable<void>;
  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options?: { overwrite?: boolean }
  ): Thenable<void>;
}

export interface VSCodeFileWatcher {
  onDidChange: vscode.Event<vscode.Uri>;
  onDidCreate: vscode.Event<vscode.Uri>;
  onDidDelete: vscode.Event<vscode.Uri>;
  dispose(): void;
}

export interface VSCodeFileSystemProvider {
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]>;
  stat(uri: vscode.Uri): vscode.ProviderResult<vscode.FileStat>;
  readDirectory(
    uri: vscode.Uri
  ): vscode.ProviderResult<[string, vscode.FileType][]>;
  createDirectory(uri: vscode.Uri): vscode.ProviderResult<void>;
  readFile(uri: vscode.Uri): vscode.ProviderResult<Uint8Array>;
  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): vscode.ProviderResult<void>;
  delete(
    uri: vscode.Uri,
    options: { recursive: boolean }
  ): vscode.ProviderResult<void>;
  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): vscode.ProviderResult<void>;
}

export interface VSCodeTask {
  definition: VSCodeTaskDefinition;
  name: string;
  source: string;
  scope?: vscode.WorkspaceFolder | vscode.TaskScope;
  execution?:
    | vscode.ProcessExecution
    | vscode.ShellExecution
    | vscode.CustomExecution;
  problemMatchers?: string[];
  group?: vscode.TaskGroup;
  presentationOptions?: vscode.TaskPresentationOptions;
  runOptions?: vscode.RunOptions;
}

export interface VSCodeTaskDefinition {
  type: string;
  [key: string]: any;
}

export interface VSCodeTaskExecution {
  task: vscode.Task;
}

export interface VSCodeTaskProvider {
  provideTasks: (
    token: vscode.CancellationToken
  ) => vscode.ProviderResult<vscode.Task[]>;
  resolveTask: (
    task: vscode.Task,
    token: vscode.CancellationToken
  ) => vscode.ProviderResult<vscode.Task>;
}

export interface VSCodeDebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    session: vscode.DebugSession,
    executable: vscode.DebugAdapterExecutable | undefined
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor>;
}

export interface VSCodeDebugConfigurationProvider {
  provideDebugConfigurations(
    folder: vscode.WorkspaceFolder | undefined,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration[]>;
  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration>;
  resolveDebugConfigurationWithSubstitutedVariables?(
    folder: vscode.WorkspaceFolder | undefined,
    debugConfiguration: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration>;
}

export interface VSCodeDebugAdapter {
  start(session: vscode.DebugSession): void;
  stop(session: vscode.DebugSession): void;
}

export interface VSCodeDebugAdapterServer {
  port: number;
  host?: string;
}

export interface VSCodeDebugAdapterExecutable {
  command: string;
  args: string[];
  options?: any; // VSCode DebugAdapterExecutable options
}

export interface VSCodeDebugAdapterServerOptions {
  cwd?: string;
  env?: { [key: string]: string };
}

export interface VSCodeDebugAdapterNamedPipeServer {
  path: string;
}

export interface VSCodeDebugAdapterInlineImplementation {
  implementation: vscode.DebugAdapter;
}

export interface VSCodeDebugSession {
  readonly id: string;
  readonly type: string;
  readonly configuration: vscode.DebugConfiguration;
  readonly workspaceFolder?: vscode.WorkspaceFolder;
  customRequest(command: string, args: any): Thenable<any>;
  sendEvent(event: vscode.DebugSessionCustomEvent): void;
}

export interface VSCodeBreakpoint {
  readonly id: string;
  readonly enabled: boolean;
  readonly condition?: string;
  readonly hitCondition?: string;
  readonly logMessage?: string;
}

export interface VSCodeSourceBreakpoint extends vscode.Breakpoint {
  readonly location: vscode.Location;
}

export interface VSCodeFunctionBreakpoint extends vscode.Breakpoint {
  readonly functionName: string;
}

export interface VSCodeDataBreakpoint extends vscode.Breakpoint {
  readonly dataId: string;
  readonly canPersist?: boolean;
}

export interface VSCodeBreakpointLocation {
  uri: vscode.Uri;
  range: vscode.Range;
}

export interface VSCodeDebugConfiguration {
  type: string;
  request: string;
  name: string;
  [key: string]: any;
}

export interface VSCodeDebugConfigurationProviderTriggerKind {
  Initial: 1;
  Dynamic: 2;
  MultipleTargets: 4;
}

export interface VSCodeDebugConsole {
  append(value: string): void;
  appendLine(value: string): void;
}

export interface VSCodeDebugControl {
  startDebugging(
    folder: vscode.WorkspaceFolder | undefined,
    nameOrConfiguration: string | vscode.DebugConfiguration
  ): Thenable<boolean>;
  stopDebugging(session?: vscode.DebugSession): Thenable<void>;
}

export interface VSCodeDebugSessionCustomEvent {
  session: vscode.DebugSession;
  event: string;
  body?: any;
}

export interface VSCodeDebugProtocolBreakpoint {
  id?: number;
  verified: boolean;
  message?: string;
  source?: vscode.DebugProtocolSource;
  line?: number;
  column?: number;
  instructionOffset?: number;
  state?: any;
}

export interface VSCodeDebugAdapterTracker {
  onWillStartSession?(): void;
  onWillReceiveMessage?(message: any): void;
  onDidSendMessage?(message: any): void;
  onWillStopSession?(): void;
  onError?(error: Error): void;
  onExit?(code: number, signal: string): void;
}

export interface VSCodeDebugAdapterTrackerFactory {
  createDebugAdapterTracker(
    session: vscode.DebugSession
  ): vscode.ProviderResult<vscode.DebugAdapterTracker>;
}

export interface VSCodeDebugAdapterDescriptor {
  type: 'server' | 'executable' | 'inline';
  server?: VSCodeDebugAdapterServer;
  executable?: VSCodeDebugAdapterExecutable;
  implementation?: vscode.DebugAdapter;
}
