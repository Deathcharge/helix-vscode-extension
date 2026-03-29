/**
 * Helix VS Code Extension - MCP (Model Context Protocol) Manager
 * ===============================================================
 * Manages connections to MCP servers configured via `helix.mcp.servers`
 * in VS Code settings. Each server is spawned as a child process using
 * stdio transport, communicating via JSON-RPC 2.0 per the MCP spec.
 *
 * Features:
 *   - Reads server configs from VS Code settings on startup and on change
 *   - Spawns each server as a child process (command + args + env)
 *   - Performs MCP handshake (initialize, initialized, tools/list)
 *   - Tracks per-server status: connecting | connected | error | disconnected
 *   - Auto-reconnects on crash with exponential backoff (max 3 retries)
 *   - Pipes server stderr to the "Helix MCP" output channel
 *   - Exposes aggregated tool lists and tool invocation
 *
 * Protocol reference: https://spec.modelcontextprotocol.io/
 */

import * as cp from 'child_process';
import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export type McpServerStatus =
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected';

export interface McpServerInfo {
  name: string;
  status: McpServerStatus;
  tools: McpTool[];
  error?: string;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
  serverName: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** JSON-RPC 2.0 request envelope. */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: any;
}

/** JSON-RPC 2.0 response envelope. */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

/**
 * Per-server runtime state. Not exposed externally — callers see
 * `McpServerInfo` via `getConnectedServers()`.
 */
interface McpServerState {
  name: string;
  config: McpServerConfig;
  process: cp.ChildProcess | null;
  status: McpServerStatus;
  tools: McpTool[];
  error?: string;
  retryCount: number;
  retryTimeout?: ReturnType<typeof setTimeout>;
  /** Monotonically increasing message ID for JSON-RPC requests. */
  nextId: number;
  /** Pending request callbacks keyed by message ID. */
  pending: Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (reason: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >;
  /** Stdout line buffer (JSON-RPC messages are newline-delimited). */
  stdoutBuffer: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;
/** Per-request timeout in ms (reads from setting, falls back to 30 s). */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const MCP_PROTOCOL_VERSION = '2024-11-05';
const CLIENT_INFO = { name: 'helix-vscode', version: '1.0.0' };

// ---------------------------------------------------------------------------
// McpManager
// ---------------------------------------------------------------------------

export class McpManager implements vscode.Disposable {
  private static instance: McpManager | null = null;

  private servers: Map<string, McpServerState> = new Map();
  private outputChannel: vscode.OutputChannel;
  private configListener: vscode.Disposable;

  /** Fired whenever the set of servers or their statuses change. */
  private readonly _onDidChangeServers = new vscode.EventEmitter<void>();
  public readonly onDidChangeServers = this._onDidChangeServers.event;

  // -- Singleton access -----------------------------------------------------

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Helix MCP');

    this.configListener = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('helix.mcp.servers')) {
        this.log('MCP server configuration changed — resyncing');
        this.syncServers();
      }
    });
  }

  /**
   * Returns the singleton McpManager instance. The first call creates it;
   * subsequent calls return the same instance.
   */
  public static getInstance(): McpManager {
    if (!McpManager.instance) {
      McpManager.instance = new McpManager();
    }
    return McpManager.instance;
  }

  // -- Lifecycle ------------------------------------------------------------

  /**
   * Read the current configuration and start any configured servers.
   * Safe to call multiple times — existing servers are reconciled.
   */
  public async initialize(): Promise<void> {
    await this.syncServers();
  }

  /**
   * Shut down every server process and release all resources.
   */
  public dispose(): void {
    for (const [name] of this.servers) {
      this.stopServer(name);
    }
    this.servers.clear();
    this.configListener.dispose();
    this._onDidChangeServers.dispose();
    this.outputChannel.dispose();
    McpManager.instance = null;
  }

  // -- Public API -----------------------------------------------------------

  /**
   * Returns info for every configured server, regardless of status.
   */
  public getConnectedServers(): McpServerInfo[] {
    const result: McpServerInfo[] = [];
    for (const state of this.servers.values()) {
      result.push({
        name: state.name,
        status: state.status,
        tools: [...state.tools],
        error: state.error,
      });
    }
    return result;
  }

  /**
   * Aggregated list of tools across all *connected* servers.
   */
  public getAvailableTools(): McpTool[] {
    const tools: McpTool[] = [];
    for (const state of this.servers.values()) {
      if (state.status === 'connected') {
        tools.push(...state.tools);
      }
    }
    return tools;
  }

  /**
   * Invoke a tool on a specific server.
   * Throws if the server is not connected or the request fails.
   */
  public async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<any> {
    const state = this.servers.get(serverName);
    if (!state) {
      throw new Error(`MCP server "${serverName}" is not configured`);
    }
    if (state.status !== 'connected') {
      throw new Error(
        `MCP server "${serverName}" is not connected (status: ${state.status})`
      );
    }

    const response = await this.sendRequest(state, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    return response;
  }

  /**
   * Restart a specific server. Stops it first if running.
   */
  public async reconnect(serverName: string): Promise<void> {
    const state = this.servers.get(serverName);
    if (!state) {
      throw new Error(`MCP server "${serverName}" is not configured`);
    }
    this.log(`Reconnecting server "${serverName}"...`);
    this.stopServer(serverName);
    state.retryCount = 0;
    await this.startServer(state.name, state.config);
  }

  // -- Server lifecycle (private) -------------------------------------------

  /**
   * Reconcile running servers with the current VS Code configuration.
   * Starts new servers, stops removed ones, restarts changed ones.
   */
  private async syncServers(): Promise<void> {
    const config = vscode.workspace.getConfiguration('helix.mcp');
    const serverConfigs: Record<string, McpServerConfig> =
      config.get<Record<string, McpServerConfig>>('servers') ?? {};

    const configuredNames = new Set(Object.keys(serverConfigs));

    // Stop servers that are no longer in config
    for (const [name] of this.servers) {
      if (!configuredNames.has(name)) {
        this.log(`Server "${name}" removed from config — stopping`);
        this.stopServer(name);
        this.servers.delete(name);
      }
    }

    // Start or restart servers
    const startPromises: Promise<void>[] = [];
    for (const [name, serverConfig] of Object.entries(serverConfigs)) {
      if (!serverConfig.command) {
        this.log(`Server "${name}" has no command — skipping`);
        continue;
      }

      const existing = this.servers.get(name);
      if (existing && this.configsEqual(existing.config, serverConfig)) {
        // Config unchanged — leave it alone
        continue;
      }

      if (existing) {
        this.log(`Server "${name}" config changed — restarting`);
        this.stopServer(name);
      }

      startPromises.push(this.startServer(name, serverConfig));
    }

    await Promise.allSettled(startPromises);
    this._onDidChangeServers.fire();
  }

  /**
   * Spawn a child process for the given server and perform the MCP handshake.
   */
  private async startServer(
    name: string,
    config: McpServerConfig
  ): Promise<void> {
    const state: McpServerState = this.servers.get(name) ?? {
      name,
      config,
      process: null,
      status: 'disconnected',
      tools: [],
      retryCount: 0,
      nextId: 1,
      pending: new Map(),
      stdoutBuffer: '',
    };

    // Update config in case it changed
    state.config = config;
    state.status = 'connecting';
    state.error = undefined;
    state.tools = [];
    state.nextId = 1;
    state.pending = new Map();
    state.stdoutBuffer = '';
    this.servers.set(name, state);
    this._onDidChangeServers.fire();

    try {
      const resolvedEnv = this.resolveEnvVars(config.env ?? {});
      const spawnEnv = { ...process.env, ...resolvedEnv };

      this.log(
        `Starting server "${name}": ${config.command} ${(
          config.args ?? []
        ).join(' ')}`
      );

      const child = cp.spawn(config.command, config.args ?? [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: spawnEnv,
        shell: process.platform === 'win32',
        windowsHide: true,
      });

      state.process = child;

      // --- Wire up stdout (JSON-RPC responses) ---
      child.stdout?.on('data', (chunk: Buffer) => {
        this.handleStdout(state, chunk);
      });

      // --- Wire up stderr (logging) ---
      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8').trimEnd();
        if (text) {
          this.log(`[${name} stderr] ${text}`);
        }
      });

      // --- Handle process exit ---
      child.on('error', (err: Error) => {
        this.log(`Server "${name}" process error: ${err.message}`);
        this.handleServerCrash(state, err.message);
      });

      child.on('exit', (code, signal) => {
        const reason = signal
          ? `killed by signal ${signal}`
          : `exited with code ${code ?? 'unknown'}`;
        this.log(`Server "${name}" ${reason}`);
        // Only treat as a crash if we weren't intentionally stopping
        if (state.status === 'connected' || state.status === 'connecting') {
          this.handleServerCrash(state, reason);
        }
      });

      // --- MCP handshake ---
      await this.performHandshake(state);

      state.status = 'connected';
      state.retryCount = 0;
      this.log(
        `Server "${name}" connected — ${state.tools.length} tool(s) available`
      );
      this._onDidChangeServers.fire();
    } catch (err: any) {
      const message = err?.message ?? String(err);
      this.log(`Server "${name}" failed to start: ${message}`);
      state.status = 'error';
      state.error = message;
      this.rejectAllPending(state, message);
      this._onDidChangeServers.fire();
      this.scheduleReconnect(state);
    }
  }

  /**
   * Kill the child process for a server and clean up pending requests.
   */
  private stopServer(name: string): void {
    const state = this.servers.get(name);
    if (!state) {
      return;
    }

    // Cancel any pending reconnect
    if (state.retryTimeout !== undefined) {
      clearTimeout(state.retryTimeout);
      state.retryTimeout = undefined;
    }

    // Kill the process
    if (state.process && !state.process.killed) {
      try {
        state.process.kill('SIGTERM');
      } catch (err: any) {
        this.log(
          `Warning: failed to kill server "${name}": ${err?.message ?? err}`
        );
      }
    }
    state.process = null;

    // Reject outstanding requests
    this.rejectAllPending(state, 'Server stopped');

    state.status = 'disconnected';
    state.tools = [];
    state.error = undefined;
    state.stdoutBuffer = '';
  }

  // -- MCP Protocol ---------------------------------------------------------

  /**
   * Perform the MCP initialize → initialized → tools/list sequence.
   */
  private async performHandshake(state: McpServerState): Promise<void> {
    // Step 1: initialize
    const initResult = await this.sendRequest(state, 'initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: CLIENT_INFO,
    });

    const serverInfo = initResult?.serverInfo;
    if (serverInfo) {
      this.log(
        `Server "${state.name}" identifies as: ${
          serverInfo.name ?? 'unknown'
        } v${serverInfo.version ?? '?'}`
      );
    }

    // Step 2: send initialized notification (no id — it's a notification)
    this.sendNotification(state, 'notifications/initialized', {});

    // Step 3: list tools
    const toolsResult = await this.sendRequest(state, 'tools/list', {});
    const rawTools: any[] = toolsResult?.tools ?? [];

    state.tools = rawTools.map((t: any) => ({
      name: String(t.name ?? ''),
      description: String(t.description ?? ''),
      inputSchema: t.inputSchema ?? {},
      serverName: state.name,
    }));
  }

  // -- JSON-RPC transport ---------------------------------------------------

  /**
   * Send a JSON-RPC request and wait for the matching response.
   */
  private sendRequest(
    state: McpServerState,
    method: string,
    params: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!state.process?.stdin?.writable) {
        reject(new Error(`Server "${state.name}" stdin is not writable`));
        return;
      }

      const id = state.nextId++;
      const timeoutMs = this.getRequestTimeout();

      const timer = setTimeout(() => {
        state.pending.delete(id);
        reject(
          new Error(
            `Request ${method} (id=${id}) to "${state.name}" timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      state.pending.set(id, { resolve, reject, timer });

      const message: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.writeMessage(state, message);
    });
  }

  /**
   * Send a JSON-RPC notification (no id, no response expected).
   */
  private sendNotification(
    state: McpServerState,
    method: string,
    params: any
  ): void {
    if (!state.process?.stdin?.writable) {
      this.log(
        `Warning: cannot send notification "${method}" — stdin not writable`
      );
      return;
    }

    const message: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.writeMessage(state, message);
  }

  /**
   * Serialize and write a JSON-RPC message to the server's stdin.
   * MCP uses newline-delimited JSON over stdio.
   */
  private writeMessage(state: McpServerState, message: JsonRpcRequest): void {
    const json = JSON.stringify(message);
    try {
      state.process?.stdin?.write(json + '\n');
    } catch (err: any) {
      this.log(
        `Failed to write to "${state.name}" stdin: ${err?.message ?? err}`
      );
    }
  }

  /**
   * Handle raw stdout data from a server process. Buffers partial lines
   * and dispatches complete JSON-RPC messages.
   */
  private handleStdout(state: McpServerState, chunk: Buffer): void {
    state.stdoutBuffer += chunk.toString('utf-8');

    // Process complete lines
    let newlineIdx: number;
    while ((newlineIdx = state.stdoutBuffer.indexOf('\n')) !== -1) {
      const line = state.stdoutBuffer.slice(0, newlineIdx).trim();
      state.stdoutBuffer = state.stdoutBuffer.slice(newlineIdx + 1);

      if (!line) {
        continue;
      }

      this.handleJsonRpcMessage(state, line);
    }
  }

  /**
   * Parse and dispatch a single JSON-RPC message from a server.
   */
  private handleJsonRpcMessage(state: McpServerState, raw: string): void {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.log(
        `[${state.name}] Received non-JSON message: ${raw.slice(0, 200)}`
      );
      return;
    }

    // Response to a request we sent
    if (typeof parsed.id === 'number' && parsed.id > 0) {
      const pending = state.pending.get(parsed.id);
      if (!pending) {
        this.log(
          `[${state.name}] Received response for unknown id=${parsed.id}`
        );
        return;
      }

      clearTimeout(pending.timer);
      state.pending.delete(parsed.id);

      if (parsed.error) {
        const errMsg = parsed.error.message ?? JSON.stringify(parsed.error);
        pending.reject(new Error(`MCP error from "${state.name}": ${errMsg}`));
      } else {
        pending.resolve(parsed.result);
      }
      return;
    }

    // Server-initiated notification (no id)
    if (parsed.method) {
      this.handleServerNotification(state, parsed.method, parsed.params);
      return;
    }

    this.log(`[${state.name}] Unrecognized message: ${raw.slice(0, 200)}`);
  }

  /**
   * Handle a notification sent by the server (e.g., logging, progress).
   */
  private handleServerNotification(
    state: McpServerState,
    method: string,
    params: any
  ): void {
    switch (method) {
      case 'notifications/tools/list_changed':
        // Tools changed — re-fetch
        this.log(`[${state.name}] Tools changed — refreshing`);
        this.refreshTools(state);
        break;
      case 'notifications/message':
        // Log messages from the server
        if (params?.level && params?.data) {
          this.log(`[${state.name}] ${params.level}: ${params.data}`);
        }
        break;
      default:
        this.log(`[${state.name}] Notification: ${method}`);
        break;
    }
  }

  /**
   * Re-fetch the tool list from a connected server.
   */
  private async refreshTools(state: McpServerState): Promise<void> {
    if (state.status !== 'connected') {
      return;
    }
    try {
      const toolsResult = await this.sendRequest(state, 'tools/list', {});
      const rawTools: any[] = toolsResult?.tools ?? [];
      state.tools = rawTools.map((t: any) => ({
        name: String(t.name ?? ''),
        description: String(t.description ?? ''),
        inputSchema: t.inputSchema ?? {},
        serverName: state.name,
      }));
      this._onDidChangeServers.fire();
    } catch (err: any) {
      this.log(
        `[${state.name}] Failed to refresh tools: ${err?.message ?? err}`
      );
    }
  }

  // -- Reconnection logic ---------------------------------------------------

  /**
   * Handle a server crash — reject pending requests and schedule reconnect.
   */
  private handleServerCrash(state: McpServerState, reason: string): void {
    state.status = 'error';
    state.error = reason;
    state.process = null;
    this.rejectAllPending(state, `Server crashed: ${reason}`);
    this._onDidChangeServers.fire();
    this.scheduleReconnect(state);
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   * Gives up after MAX_RETRIES attempts.
   */
  private scheduleReconnect(state: McpServerState): void {
    if (state.retryCount >= MAX_RETRIES) {
      this.log(
        `Server "${state.name}" exhausted ${MAX_RETRIES} retries — giving up. ` +
          'Use "Helix: Reconnect MCP Server" command to try again.'
      );
      state.status = 'error';
      state.error = `Failed after ${MAX_RETRIES} retries: ${
        state.error ?? 'unknown error'
      }`;
      this._onDidChangeServers.fire();
      return;
    }

    // Exponential backoff: 1s, 2s, 4s (with jitter)
    const jitter = Math.random() * 500;
    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, state.retryCount) + jitter;
    state.retryCount++;

    this.log(
      `Scheduling reconnect for "${state.name}" in ${Math.round(delay)}ms ` +
        `(attempt ${state.retryCount}/${MAX_RETRIES})`
    );

    state.retryTimeout = setTimeout(async () => {
      state.retryTimeout = undefined;
      this.log(
        `Reconnect attempt ${state.retryCount}/${MAX_RETRIES} for "${state.name}"`
      );
      await this.startServer(state.name, state.config);
    }, delay);
  }

  /**
   * Reject all pending requests for a server.
   */
  private rejectAllPending(state: McpServerState, reason: string): void {
    for (const [id, entry] of state.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error(reason));
    }
    state.pending.clear();
  }

  // -- Helpers --------------------------------------------------------------

  /**
   * Resolve `${env:VARNAME}` placeholders in the config env map.
   * Falls back to empty string if the variable is not set.
   */
  private resolveEnvVars(env: Record<string, string>): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      resolved[key] = value.replace(
        /\$\{env:([^}]+)\}/g,
        (_match, varName: string) => process.env[varName] ?? ''
      );
    }
    return resolved;
  }

  /**
   * Read the `helix.mcp.networkTimeout` setting.
   */
  private getRequestTimeout(): number {
    return (
      vscode.workspace
        .getConfiguration('helix.mcp')
        .get<number>('networkTimeout') ?? DEFAULT_REQUEST_TIMEOUT_MS
    );
  }

  /**
   * Compare two server configs for equality (shallow).
   */
  private configsEqual(a: McpServerConfig, b: McpServerConfig): boolean {
    if (a.command !== b.command) {
      return false;
    }
    const argsA = (a.args ?? []).join('\0');
    const argsB = (b.args ?? []).join('\0');
    if (argsA !== argsB) {
      return false;
    }
    const envA = JSON.stringify(a.env ?? {});
    const envB = JSON.stringify(b.env ?? {});
    return envA === envB;
  }

  /**
   * Log a message to the Helix MCP output channel with a timestamp.
   */
  private log(message: string): void {
    const ts = new Date().toISOString();
    this.outputChannel.appendLine(`[${ts}] ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Singleton accessor
// ---------------------------------------------------------------------------

/**
 * Returns the global McpManager singleton.
 *
 * Usage:
 * ```ts
 * const mcp = getMcpManager();
 * await mcp.initialize();
 * const tools = mcp.getAvailableTools();
 * ```
 */
export function getMcpManager(): McpManager {
  return McpManager.getInstance();
}
