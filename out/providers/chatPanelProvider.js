"use strict";
/**
 * Helix AI Chat Panel Provider
 * ==============================
 * Webview-based chat panel for interactive conversations with
 * Helix agents inside VS Code. Accessible via the sidebar or
 * command palette.
 *
 * Features:
 *  - Streaming SSE responses (token-by-token display)
 *  - Workspace context injection (open tabs, git status, diagnostics)
 *  - Agent mode selector (Code / Audit / Security / etc.)
 *  - Agent persona selector (Helix / Kael / Lumina / etc.)
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
exports.HelixChatPanelProvider = void 0;
exports.registerChatPanel = registerChatPanel;
const cp = __importStar(require("child_process"));
const vscode = __importStar(require("vscode"));
const AgentMode_1 = require("../agent/AgentMode");
const ContextManager_1 = require("../context/ContextManager");
const extension_1 = require("../extension");
const McpManager_1 = require("../mcp/McpManager");
const AgentMemory_1 = require("../memory/AgentMemory");
const RulesLoader_1 = require("../rules/RulesLoader");
const agentEditProvider_1 = require("./agentEditProvider");
function getSlashCommands() {
    return {
        '/fix': {
            description: 'Fix diagnostics in current file',
            getContext: async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return 'No file open.';
                }
                const uri = editor.document.uri;
                const diagnostics = vscode.languages
                    .getDiagnostics(uri)
                    .filter(d => d.severity === vscode.DiagnosticSeverity.Error ||
                    d.severity === vscode.DiagnosticSeverity.Warning);
                if (diagnostics.length === 0) {
                    return `File: ${editor.document.fileName}\nNo diagnostics found.`;
                }
                const summary = diagnostics
                    .map(d => `Line ${d.range.start.line + 1}: [${d.severity === vscode.DiagnosticSeverity.Error
                    ? 'ERROR'
                    : 'WARN'}] ${d.message}`)
                    .join('\n');
                const fileContent = editor.document.getText();
                return `File: ${editor.document.fileName}\nLanguage: ${editor.document.languageId}\n\nDiagnostics:\n${summary}\n\nFile content:\n${fileContent}`;
            },
        },
        '/test': {
            description: 'Write tests for selected code',
            getContext: async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return 'No file open.';
                }
                const selection = editor.selection;
                const code = selection.isEmpty
                    ? editor.document.getText()
                    : editor.document.getText(selection);
                return `File: ${editor.document.fileName}\nLanguage: ${editor.document.languageId}\n\nCode to test:\n${code}`;
            },
        },
        '/docs': {
            description: 'Generate documentation',
            getContext: async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return 'No file open.';
                }
                const selection = editor.selection;
                const code = selection.isEmpty
                    ? editor.document.getText()
                    : editor.document.getText(selection);
                return `File: ${editor.document.fileName}\nLanguage: ${editor.document.languageId}\n\nCode to document:\n${code}`;
            },
        },
        '/review': {
            description: 'Code review current file',
            getContext: async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return 'No file open.';
                }
                const content = editor.document.getText();
                return `File: ${editor.document.fileName}\nLanguage: ${editor.document.languageId}\n\nFull file content for review:\n${content}`;
            },
        },
        '/commit': {
            description: 'Generate commit message',
            getContext: async () => {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    return 'No workspace open.';
                }
                try {
                    const diff = await new Promise((resolve, reject) => {
                        cp.exec('git diff --cached --stat && echo "---DIFF---" && git diff --cached', { cwd: workspaceFolder.uri.fsPath, maxBuffer: 1024 * 256 }, (err, stdout) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(stdout);
                            }
                        });
                    });
                    if (!diff.trim() || diff.trim() === '---DIFF---') {
                        // Nothing staged — try unstaged diff
                        const unstagedDiff = await new Promise((resolve, reject) => {
                            cp.exec('git diff --stat && echo "---DIFF---" && git diff', { cwd: workspaceFolder.uri.fsPath, maxBuffer: 1024 * 256 }, (err, stdout) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(stdout);
                                }
                            });
                        });
                        return `Git diff (unstaged):\n${unstagedDiff.slice(0, 8000)}`;
                    }
                    return `Git diff (staged):\n${diff.slice(0, 8000)}`;
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return `Failed to get git diff: ${msg}`;
                }
            },
        },
        '/explain': {
            description: 'Explain selected code',
            getContext: async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return 'No file open.';
                }
                const selection = editor.selection;
                const code = selection.isEmpty
                    ? editor.document.getText()
                    : editor.document.getText(selection);
                return `File: ${editor.document.fileName}\nLanguage: ${editor.document.languageId}\n\nCode to explain:\n${code}`;
            },
        },
        '/refactor': {
            description: 'Refactor for readability',
            getContext: async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return 'No file open.';
                }
                const selection = editor.selection;
                const code = selection.isEmpty
                    ? editor.document.getText()
                    : editor.document.getText(selection);
                return `File: ${editor.document.fileName}\nLanguage: ${editor.document.languageId}\n\nCode to refactor:\n${code}`;
            },
        },
        '/security': {
            description: 'Security audit',
            getContext: async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return 'No file open.';
                }
                const content = editor.document.getText();
                return `File: ${editor.document.fileName}\nLanguage: ${editor.document.languageId}\n\nFull file content for security audit:\n${content}`;
            },
        },
        '/mcp': {
            description: 'List connected MCP tools',
            getContext: async () => {
                const mcpManager = (0, McpManager_1.getMcpManager)();
                const servers = mcpManager.getConnectedServers();
                if (servers.length === 0) {
                    return 'No MCP servers configured. Add servers via the helix.mcp.servers VS Code setting.';
                }
                const lines = [];
                for (const server of servers) {
                    const statusIcon = server.status === 'connected'
                        ? '✓'
                        : server.status === 'connecting'
                            ? '⟳'
                            : '✗';
                    lines.push(`${statusIcon} Server: ${server.name} (${server.status})`);
                    if (server.tools.length > 0) {
                        for (const tool of server.tools) {
                            lines.push(`  · ${tool.name}: ${tool.description || 'No description'}`);
                        }
                    }
                    else {
                        lines.push('  (no tools)');
                    }
                }
                return `Connected MCP servers:\n${lines.join('\n')}`;
            },
        },
    };
}
class HelixChatPanelProvider {
    constructor(extensionUri, context) {
        this.extensionUri = extensionUri;
        this.context = context;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        // Initialize singletons once we have the extension context
        this._contextManager = ContextManager_1.ContextManager.getInstance(this.context);
        this._modeManager = AgentMode_1.AgentModeManager.getInstance(this.context);
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
        // Push active-editor context + git status to the context bar
        const pushContextBar = async () => {
            const editor = vscode.window.activeTextEditor;
            const fileName = editor
                ? editor.document.fileName.split(/[/\\]/).pop() ?? ''
                : 'No file open';
            const gitCtx = await this._contextManager?.getWorkspaceContext();
            const gitSummary = gitCtx?.gitStatus
                ? `${gitCtx.gitStatus.branch} (${gitCtx.gitStatus.changedFiles.length}✎)`
                : undefined;
            this._view?.webview.postMessage({
                type: 'contextUpdate',
                file: fileName,
                git: gitSummary,
            });
        };
        void pushContextBar();
        const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(() => void pushContextBar());
        webviewView.onDidDispose(() => editorChangeDisposable.dispose());
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage': {
                    await this.handleChatMessage(data.message, data.agent, data.mode, undefined, data.slashCommand);
                    break;
                }
                case 'openFile': {
                    const doc = await vscode.workspace.openTextDocument(data.path);
                    await vscode.window.showTextDocument(doc);
                    break;
                }
                case 'insertCode': {
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        editor.edit(editBuilder => {
                            editBuilder.insert(editor.selection.active, data.code);
                        });
                    }
                    break;
                }
                case 'resolveMention': {
                    const resolved = await this._resolveMention(data.mentionType, data.query);
                    this._view?.webview.postMessage({
                        type: 'mentionResults',
                        requestId: data.requestId,
                        results: resolved,
                    });
                    break;
                }
                case 'pickFile': {
                    const uris = await vscode.window.showOpenDialog({
                        canSelectMany: true,
                        filters: {
                            'All Files': ['*'],
                            Images: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
                        },
                    });
                    if (uris && uris.length > 0) {
                        const attachments = await this._readFileAttachments(uris);
                        this._view?.webview.postMessage({
                            type: 'filesAttached',
                            attachments,
                        });
                    }
                    break;
                }
            }
        });
    }
    async handleChatMessage(message, agent = 'helix', mode = 'code', attachments, slashCommand) {
        if (!this._view)
            return;
        const view = this._view;
        // Route "edit: <task>" prefix to the agentic file editor instead of chat
        const editMatch = /^(?:edit:|\/edit\s+)(.+)/is.exec(message.trim());
        if (editMatch) {
            const task = (editMatch[1] ?? '').trim();
            view.webview.postMessage({
                type: 'token',
                token: `_Running agent edit: "${task}"..._\n`,
            });
            await agentEditProvider_1.AgentEditProvider.runWithTask(this.context, task);
            view.webview.postMessage({ type: 'streamEnd' });
            return;
        }
        // --- Slash command processing ---
        const slashEnabled = vscode.workspace
            .getConfiguration('helix')
            .get('slashCommands.enabled', true);
        let resolvedMessage = message;
        if (slashEnabled) {
            let cmdName;
            let rest = '';
            if (slashCommand) {
                // Command was selected from the autocomplete dropdown.
                // The message contains the user-facing prompt (possibly edited).
                cmdName = slashCommand;
                rest = message;
            }
            else if (message.trim().startsWith('/')) {
                // User typed the slash command manually in the textarea.
                const trimmed = message.trim();
                const spaceIdx = trimmed.indexOf(' ');
                cmdName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
                rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
            }
            if (cmdName) {
                const commands = getSlashCommands();
                const cmd = commands[cmdName];
                if (cmd) {
                    try {
                        const context = await cmd.getContext();
                        // Build a rich prompt: command label + gathered context + user text
                        const parts = [`[${cmdName}] ${cmd.description}`, context];
                        if (rest) {
                            parts.push(`Additional instructions: ${rest}`);
                        }
                        resolvedMessage = parts.join('\n\n');
                    }
                    catch (err) {
                        const errMsg = err instanceof Error ? err.message : 'Unknown error';
                        console.warn(`Slash command ${cmdName} context resolution failed:`, err);
                        resolvedMessage = `${cmdName}: ${rest || cmd.description}\n\n(Context unavailable: ${errMsg})`;
                    }
                }
                // If the command is not recognized, send as-is
            }
        }
        // --- Inject project rules into context if available ---
        let rulesContext;
        try {
            const rulesLoader = this._getRulesLoader();
            if (rulesLoader) {
                const rules = rulesLoader.getActiveRules();
                if (rules) {
                    rulesContext = rules;
                }
            }
        }
        catch {
            // Rules not available — continue without them
        }
        // --- Agent memory: extract "remember" commands from user message ---
        let memoryContext;
        try {
            const agentMemory = (0, AgentMemory_1.getAgentMemory)();
            // Check for "remember X" user commands and store the fact
            const manualFact = await agentMemory.extractFromUserMessage(agent, message);
            if (manualFact) {
                view.webview.postMessage({
                    type: 'token',
                    token: `_Remembered: "${manualFact.value}"_\n\n`,
                });
            }
            // Build relevant-fact context injection for the API request
            memoryContext = await agentMemory.buildContextInjection(agent, resolvedMessage);
        }
        catch (err) {
            console.warn('AgentMemory: failed during pre-send hook:', err);
        }
        const endpoint = vscode.workspace.getConfiguration('helix').get('apiEndpoint') ||
            'https://api.helixcollective.io';
        // Get system prompt from current agent mode
        const systemPromptContext = this._modeManager?.getEffectiveSystemPrompt() ?? '';
        // --- Build client_context string (injected into server-side system prompt) ---
        // Combines: agent mode system prompt, project rules, agent memory, MCP tools.
        // This is the canonical way to pass VS Code-side context to the backend since
        // PageContext only carries minimal page metadata.
        const clientContextParts = [];
        if (systemPromptContext) {
            clientContextParts.push(`## Agent Mode Instructions\n${systemPromptContext}`);
        }
        if (rulesContext) {
            clientContextParts.push(`## Project Rules\n${rulesContext}`);
        }
        if (memoryContext) {
            clientContextParts.push(`## Agent Memory\n${memoryContext}`);
        }
        // MCP tool descriptions so the LLM knows what local tools are available
        try {
            const mcpManager = (0, McpManager_1.getMcpManager)();
            const mcpTools = mcpManager.getAvailableTools();
            if (mcpTools.length > 0) {
                const toolLines = mcpTools.map(t => `- **${t.name}** (${t.serverName}): ${t.description || 'No description'}`);
                clientContextParts.push(`## Available MCP Tools (${mcpTools.length})\n` +
                    `These tools are connected via MCP servers on the user's machine:\n` +
                    toolLines.join('\n') +
                    `\n\nWhen recommending actions using these tools, include the exact ` +
                    `tool name so the user can invoke it directly.`);
                // Notify the webview so it can show the MCP tool count badge
                this._view?.webview.postMessage({
                    type: 'mcpToolsAvailable',
                    count: mcpTools.length,
                    tools: mcpTools.map(t => ({ name: t.name, server: t.serverName })),
                });
            }
        }
        catch (err) {
            console.warn('MCP tool injection failed:', err);
        }
        const clientContext = clientContextParts.length > 0
            ? `## VS Code Context\n${clientContextParts.join('\n\n')}`
            : undefined;
        // Signal stream start to webview
        this._view.webview.postMessage({ type: 'streamStart', agent });
        try {
            // Gather workspace context
            const workspaceCtx = await this._contextManager?.getWorkspaceContext();
            // Active editor context
            const editor = vscode.window.activeTextEditor;
            const editorContext = editor
                ? {
                    file: editor.document.fileName,
                    language: editor.document.languageId,
                    selection: editor.document.getText(editor.selection),
                }
                : {};
            // Compact workspace summary (don't blast the full file list)
            const openTabNames = (workspaceCtx?.openTabs ?? [])
                .slice(0, 5)
                .map(u => u.fsPath.split(/[/\\]/).pop() ?? u.fsPath);
            const gitSummary = workspaceCtx?.gitStatus
                ? `branch: ${workspaceCtx.gitStatus.branch}, ${workspaceCtx.gitStatus.changedFiles.length} changed`
                : undefined;
            const errorCount = (workspaceCtx?.diagnostics ?? []).filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
            const authToken = this.context.globalState.get('helix.authTokenValue') ?? '';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000);
            const res = await fetch(`${endpoint}/api/copilot/message/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                signal: controller.signal,
                body: JSON.stringify({
                    message: resolvedMessage,
                    agent,
                    context: {
                        page: 'vscode',
                        route: '/vscode',
                        features: ['inline-completion', 'chat-panel'],
                        selectedItems: [],
                        osContext: {
                            openTabs: openTabNames,
                            gitStatus: gitSummary,
                            diagnosticErrors: errorCount > 0 ? errorCount : undefined,
                        },
                    },
                    useEnhanced: false,
                    tier: 'free',
                    // Pass user-pinned model to backend; omit key entirely if auto-routing
                    ...(vscode.workspace
                        .getConfiguration('helix')
                        .get('preferredModel')
                        ? {
                            preferred_model: vscode.workspace
                                .getConfiguration('helix')
                                .get('preferredModel'),
                        }
                        : {}),
                    editorContext,
                    ...(clientContext ? { client_context: clientContext } : {}),
                    ...(attachments && attachments.length > 0 ? { attachments } : {}),
                }),
            });
            clearTimeout(timeout);
            if (!res.ok) {
                throw new Error(`API responded with ${res.status}`);
            }
            if (!res.body) {
                throw new Error('No response body');
            }
            // Read SSE stream and forward tokens to webview
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullResponseText = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: '))
                        continue;
                    const raw = line.slice(6).trim();
                    if (raw === '[DONE]')
                        continue;
                    try {
                        const event = JSON.parse(raw);
                        if (event.type === 'token' && event.token) {
                            fullResponseText += event.token;
                            this._view?.webview.postMessage({
                                type: 'token',
                                token: event.token,
                            });
                        }
                        else if (event.type === 'done') {
                            this._view?.webview.postMessage({ type: 'streamEnd' });
                        }
                        else if (event.type === 'error') {
                            this._view?.webview.postMessage({
                                type: 'error',
                                content: event.message ?? 'Stream error',
                            });
                        }
                    }
                    catch (parseErr) {
                        // Non-JSON SSE line (comments, keep-alives) — skip silently
                        console.debug('SSE: skipping non-JSON line:', parseErr);
                    }
                }
            }
            // Ensure stream end is always sent even if 'done' event was missing
            this._view?.webview.postMessage({ type: 'streamEnd' });
            // --- Agent memory: auto-extract facts from the full response ---
            if (fullResponseText.length > 0) {
                try {
                    const agentMemory = (0, AgentMemory_1.getAgentMemory)();
                    await agentMemory.extractFromAssistantResponse(agent, fullResponseText);
                }
                catch (err) {
                    console.warn('AgentMemory: failed during post-response extraction:', err);
                }
            }
        }
        catch (err) {
            console.warn('Helix chat stream failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            this._view?.webview.postMessage({
                type: 'error',
                content: `Failed to reach Helix API: ${errorMessage}`,
            });
        }
    }
    _getRulesLoader() {
        // Prefer the module-level export from extension.ts
        const fromExport = (0, extension_1.getRulesLoader)();
        if (fromExport) {
            return fromExport;
        }
        // Fallback: walk context subscriptions (covers edge cases where import order differs)
        for (const sub of this.context.subscriptions) {
            if (sub instanceof RulesLoader_1.RulesLoader) {
                return sub;
            }
        }
        return undefined;
    }
    // ---------------------------------------------------------------------------
    // C2: @-mention resolution
    // ---------------------------------------------------------------------------
    async _resolveMention(mentionType, query) {
        const r = [];
        try {
            if (mentionType === 'file') {
                for (const f of await vscode.workspace.findFiles(`**/*${query}*`, '**/node_modules/**', 15))
                    r.push({
                        label: vscode.workspace.asRelativePath(f),
                        value: f.fsPath,
                    });
            }
            else if (mentionType === 'folder') {
                const seen = new Set();
                for (const f of await vscode.workspace.findFiles(`**/${query}*/**`, '**/node_modules/**', 10)) {
                    const d = vscode.workspace.asRelativePath(vscode.Uri.joinPath(f, '..'));
                    if (!seen.has(d)) {
                        seen.add(d);
                        r.push({ label: d, value: d });
                    }
                }
            }
            else if (mentionType === 'git') {
                const ctx = await this._contextManager?.getWorkspaceContext();
                if (ctx?.gitStatus) {
                    r.push({
                        label: `branch: ${ctx.gitStatus.branch}`,
                        value: `Git: ${ctx.gitStatus.branch}`,
                    });
                    for (const f of ctx.gitStatus.changedFiles.slice(0, 10)) {
                        const rel = vscode.workspace.asRelativePath(f.uri);
                        r.push({ label: rel, value: rel });
                    }
                }
            }
            else if (mentionType === 'diagnostics') {
                for (const [uri, diags] of vscode.languages.getDiagnostics()) {
                    const errs = diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
                    if (errs.length)
                        r.push({
                            label: `${vscode.workspace.asRelativePath(uri)} (${errs.length})`,
                            value: errs
                                .map(d => `L${d.range.start.line + 1}: ${d.message}`)
                                .join('\n'),
                        });
                    if (r.length >= 10)
                        break;
                }
            }
            else if (mentionType === 'agent') {
                for (const a of [
                    'helix',
                    'kael',
                    'lumina',
                    'oracle',
                    'vega',
                    'aether',
                    'nova',
                ])
                    if (a.includes(query.toLowerCase()))
                        r.push({ label: a, value: a });
            }
        }
        catch (err) {
            console.warn(`@mention resolve failed (${mentionType}):`, err);
        }
        return r;
    }
    // ---------------------------------------------------------------------------
    // C5: File attachment reading
    // ---------------------------------------------------------------------------
    async _readFileAttachments(uris) {
        const out = [];
        const imgExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
        for (const uri of uris.slice(0, 5)) {
            try {
                const bytes = await vscode.workspace.fs.readFile(uri);
                const nm = uri.fsPath.split(/[/\\]/).pop() ?? uri.fsPath;
                const ext = ('.' + (nm.split('.').pop() ?? '')).toLowerCase();
                const isImg = imgExts.has(ext);
                const mime = isImg
                    ? `image/${ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)}`
                    : 'text/plain';
                if (isImg) {
                    out.push({
                        name: nm,
                        content: `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`,
                        mimeType: mime,
                    });
                }
                else {
                    out.push({
                        name: nm,
                        content: Buffer.from(bytes).toString('utf-8').slice(0, 50000),
                        mimeType: mime,
                    });
                }
            }
            catch (err) {
                console.warn(`Attachment read failed ${uri.fsPath}:`, err);
            }
        }
        return out;
    }
    getHtmlForWebview(_webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Helix Chat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .header {
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-wrap: wrap;
    }
    .header h2 { font-size: 13px; font-weight: 600; flex: 1; }
    select.picker {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      max-width: 110px;
    }
    .context-bar {
      padding: 3px 10px;
      background: var(--vscode-editorWidget-background);
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      display: flex;
      gap: 10px;
      align-items: center;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .context-bar span { opacity: 0.8; }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .message {
      padding: 8px 10px;
      border-radius: 8px;
      max-width: 90%;
      line-height: 1.4;
      font-size: 12px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .message.user {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    .message.assistant {
      background: var(--vscode-editor-inactiveSelectionBackground);
      align-self: flex-start;
      border-bottom-left-radius: 2px;
    }
    .message.assistant.streaming::after {
      content: '▍';
      animation: blink 0.8s step-end infinite;
      margin-left: 1px;
    }
    @keyframes blink {
      50% { opacity: 0; }
    }
    .message.error {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-inputValidation-errorForeground);
      align-self: center;
      font-style: italic;
    }
    .code-block {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 6px 8px;
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
      position: relative;
      margin: 4px 0;
    }
    .code-block button {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 10px;
      cursor: pointer;
    }
    .input-area {
      padding: 8px 12px;
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      gap: 6px;
    }
    .input-area textarea {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      padding: 6px 10px;
      font-family: var(--vscode-font-family);
      font-size: 12px;
      resize: none;
      outline: none;
    }
    .input-area textarea:focus {
      border-color: var(--vscode-focusBorder);
    }
    .input-area button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
    }
    .input-area button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .input-area button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .slash-menu {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;
      background: var(--vscode-editorSuggestWidget-background, var(--vscode-editor-background));
      border: 1px solid var(--vscode-editorSuggestWidget-border, var(--vscode-panel-border));
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 10;
      margin-bottom: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .slash-menu.visible { display: block; }
    .slash-item {
      padding: 6px 10px;
      cursor: pointer;
      display: flex;
      gap: 8px;
      align-items: baseline;
      font-size: 12px;
    }
    .slash-item:hover, .slash-item.active {
      background: var(--vscode-list-hoverBackground);
    }
    .slash-item .cmd {
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
      min-width: 70px;
    }
    .slash-item .desc {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
    }
    .input-wrapper {
      position: relative;
      flex: 1;
      display: flex;
    }
    .input-wrapper textarea {
      flex: 1;
    }
  </style>
</head>
<body>
  <div class="header">
    <span>🌀</span>
    <h2>Helix</h2>
    <select class="picker" id="modeSelect" title="Agent mode">
      <option value="code">Code</option>
      <option value="audit">Audit</option>
      <option value="research">Research</option>
      <option value="documentation">Docs</option>
      <option value="testing">Testing</option>
      <option value="architecture">Architect</option>
      <option value="security">Security</option>
    </select>
    <select class="picker" id="agentSelect" title="Agent persona">
      <option value="helix">Helix</option>
      <option value="kael">Kael</option>
      <option value="lumina">Lumina</option>
      <option value="oracle">Oracle</option>
      <option value="vega">Vega</option>
      <option value="aether">Aether</option>
      <option value="nova">Nova</option>
    </select>
  </div>

  <div class="context-bar" id="contextBar">
    <span id="ctxFile">No file open</span>
    <span id="ctxGit" style="display:none"></span>
    <span id="mcpBadge" style="display:none;margin-left:auto;font-size:10px;opacity:0.7;cursor:default"></span>
  </div>

  <div class="messages" id="messages">
    <div class="message assistant">
      🌀 Hey! I'm Helix. Ask me anything about your code. Switch modes and agents above — I'm workspace-aware and can see your open files and git status.
    </div>
  </div>

  <div id="attachmentBar" style="display:none;padding:4px 12px;border-top:1px solid var(--vscode-panel-border);font-size:11px;display:flex;gap:6px;flex-wrap:wrap;"></div>

  <div class="input-area">
    <button id="attachBtn" title="Attach file" style="background:transparent;color:var(--vscode-foreground);border:none;cursor:pointer;font-size:16px;padding:4px;">&#128206;</button>
    <div class="input-wrapper">
      <div class="slash-menu" id="slashMenu"></div>
      <div class="slash-menu" id="mentionMenu"></div>
      <textarea id="input" placeholder="Ask Helix... (Enter to send, / for commands, @ for mentions)" rows="2"></textarea>
    </div>
    <button id="send">Send</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const agentSelect = document.getElementById('agentSelect');
    const modeSelect = document.getElementById('modeSelect');
    const ctxFile = document.getElementById('ctxFile');
    const ctxGit = document.getElementById('ctxGit');
    const slashMenu = document.getElementById('slashMenu');

    // Slash commands list — kept in sync with backend definitions
    const SLASH_CMDS = [
      { cmd: '/fix', desc: 'Fix diagnostics in current file' },
      { cmd: '/test', desc: 'Write tests for selected code' },
      { cmd: '/docs', desc: 'Generate documentation' },
      { cmd: '/review', desc: 'Code review current file' },
      { cmd: '/commit', desc: 'Generate commit message' },
      { cmd: '/explain', desc: 'Explain selected code' },
      { cmd: '/refactor', desc: 'Refactor for readability' },
      { cmd: '/security', desc: 'Security audit' },
    ];

    // Maps each slash command to a user-facing prompt and the agent mode
    // that should be auto-selected when the command is chosen from the
    // autocomplete dropdown.
    const SLASH_CMD_META = {
      '/fix':      { prompt: 'Fix the selected code',              mode: 'code' },
      '/test':     { prompt: 'Generate tests for this code',       mode: 'testing' },
      '/docs':     { prompt: 'Add documentation to this code',     mode: 'documentation' },
      '/review':   { prompt: 'Review this code',                   mode: 'audit' },
      '/commit':   { prompt: 'Generate commit message',            mode: 'code' },
      '/explain':  { prompt: 'Explain this code',                  mode: 'code' },
      '/refactor': { prompt: 'Refactor this code',                 mode: 'code' },
      '/security': { prompt: 'Security audit',                     mode: 'security' },
    };

    // Tracks the slash command selected via autocomplete so the
    // extension host can resolve context even though the textarea
    // now shows the human-readable prompt instead of /command.
    let activeSlashCmd = null;
    let slashActiveIndex = -1;

    function renderSlashMenu(filter) {
      const matches = SLASH_CMDS.filter(c =>
        c.cmd.startsWith(filter.toLowerCase())
      );
      if (matches.length === 0 || filter === '') {
        slashMenu.classList.remove('visible');
        slashActiveIndex = -1;
        return;
      }
      slashMenu.innerHTML = matches
        .map(
          (c, i) =>
            '<div class="slash-item' + (i === 0 ? ' active' : '') + '" data-cmd="' +
            c.cmd +
            '"><span class="cmd">' + c.cmd + '</span><span class="desc">' +
            c.desc + '</span></div>'
        )
        .join('');
      slashActiveIndex = 0;
      slashMenu.classList.add('visible');

      // Click handler on items
      slashMenu.querySelectorAll('.slash-item').forEach(function (item) {
        item.addEventListener('click', function () {
          applySlashCommand(item.dataset.cmd);
        });
      });
    }

    function applySlashCommand(cmd) {
      var meta = SLASH_CMD_META[cmd];
      if (meta) {
        inputEl.value = meta.prompt;
        modeSelect.value = meta.mode;
        activeSlashCmd = cmd;
      } else {
        inputEl.value = cmd + ' ';
        activeSlashCmd = null;
      }
      inputEl.focus();
      slashMenu.classList.remove('visible');
      slashActiveIndex = -1;
    }

    function updateSlashHighlight(items) {
      items.forEach(function (el, i) {
        el.classList.toggle('active', i === slashActiveIndex);
      });
    }

    let streamingEl = null;
    let isStreaming = false;

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function renderContent(text) {
      // Escape HTML then render fenced code blocks safely
      const safe = escapeHtml(text);
      return safe.replace(
        /\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g,
        '<div class="code-block"><button onclick="insertCode(this)">Insert</button><pre>$2</pre></div>'
      );
    }

    function addMessage(role, content) {
      const div = document.createElement('div');
      div.className = 'message ' + role;
      div.innerHTML = renderContent(content);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    function setStreaming(enabled) {
      isStreaming = enabled;
      sendBtn.disabled = enabled;
      inputEl.disabled = enabled;
    }

    window.addEventListener('message', (event) => {
      const data = event.data;

      switch (data.type) {
        case 'streamStart': {
          setStreaming(true);
          streamingEl = document.createElement('div');
          streamingEl.className = 'message assistant streaming';
          streamingEl.dataset.rawText = '';
          messagesEl.appendChild(streamingEl);
          messagesEl.scrollTop = messagesEl.scrollHeight;
          break;
        }
        case 'token': {
          if (streamingEl) {
            streamingEl.dataset.rawText += data.token;
            // Re-render incrementally — safe because we escape on render
            streamingEl.innerHTML = renderContent(streamingEl.dataset.rawText);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
          break;
        }
        case 'streamEnd': {
          if (streamingEl) {
            streamingEl.classList.remove('streaming');
            streamingEl = null;
          }
          setStreaming(false);
          break;
        }
        case 'response': {
          // Fallback: non-streaming response (shouldn't happen with stream endpoint)
          if (streamingEl) { streamingEl.remove(); streamingEl = null; }
          addMessage('assistant', data.content);
          setStreaming(false);
          break;
        }
        case 'error': {
          if (streamingEl) { streamingEl.remove(); streamingEl = null; }
          addMessage('error', data.content);
          setStreaming(false);
          break;
        }
        case 'contextUpdate': {
          if (data.file) { ctxFile.textContent = data.file; }
          if (data.git) {
            ctxGit.textContent = '⎇ ' + data.git;
            ctxGit.style.display = '';
          }
          break;
        }
        case 'filesAttached': {
          if (data.attachments) {
            pendingAttachments = pendingAttachments.concat(data.attachments);
            renderAttachmentBar();
          }
          break;
        }
        case 'mentionResults': {
          if (!data.results || !data.results.length) { mentionMenu.classList.remove('visible'); break; }
          mentionMenu.innerHTML = data.results.map(function(r, i) {
            return '<div class="slash-item' + (i === 0 ? ' active' : '') + '" data-label="' + r.label + '"><span class="cmd">' + r.label + '</span></div>';
          }).join('');
          mentionActiveIndex = 0;
          mentionMenu.classList.add('visible');
          mentionMenu.querySelectorAll('.slash-item').forEach(function(el) {
            el.addEventListener('click', function() { applyMentionResult(el.dataset.label); });
          });
          break;
        }
        case 'mcpToolsAvailable': {
          var mcpBadge = document.getElementById('mcpBadge');
          if (mcpBadge && data.count > 0) {
            mcpBadge.textContent = data.count + ' MCP';
            mcpBadge.title = data.tools.map(function(t) { return t.name + ' (' + t.server + ')'; }).join(', ');
            mcpBadge.style.display = '';
          }
          break;
        }
      }
    });

    // --------------- Attachments state ---------------
    var pendingAttachments = [];
    var attachBar = document.getElementById('attachmentBar');
    var attachBtn = document.getElementById('attachBtn');
    var mentionMenu = document.getElementById('mentionMenu');

    function renderAttachmentBar() {
      if (!pendingAttachments.length) { attachBar.style.display = 'none'; return; }
      attachBar.style.display = 'flex';
      attachBar.innerHTML = pendingAttachments.map(function(a, i) {
        return '<span style="background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);padding:2px 6px;border-radius:3px;font-size:10px;display:inline-flex;align-items:center;gap:4px;">' +
          a.name + ' <span style="cursor:pointer" onclick="removeAttachment(' + i + ')">&times;</span></span>';
      }).join('');
    }
    window.removeAttachment = function(i) { pendingAttachments.splice(i, 1); renderAttachmentBar(); };

    attachBtn.addEventListener('click', function() { vscode.postMessage({ type: 'pickFile' }); });

    // --------------- @-mention state ---------------
    var mentionActiveIndex = -1;
    var mentionQuery = '';
    var mentionStart = -1;
    var mentionReqId = 0;

    var MENTION_TYPES = [
      { trigger: '@file:', type: 'file', label: 'File' },
      { trigger: '@folder:', type: 'folder', label: 'Folder' },
      { trigger: '@git', type: 'git', label: 'Git status' },
      { trigger: '@diagnostics', type: 'diagnostics', label: 'Errors' },
      { trigger: '@agent:', type: 'agent', label: 'Agent' },
    ];

    function checkForMention() {
      var val = inputEl.value;
      var cursor = inputEl.selectionStart || 0;
      var before = val.slice(0, cursor);
      var atIdx = before.lastIndexOf('@');
      if (atIdx < 0 || (atIdx > 0 && before[atIdx - 1] !== ' ' && before[atIdx - 1] !== '\\n')) {
        mentionMenu.classList.remove('visible');
        return;
      }
      var fragment = before.slice(atIdx);
      // If just '@', show type picker
      if (fragment === '@') {
        mentionMenu.innerHTML = MENTION_TYPES.map(function(m, i) {
          return '<div class="slash-item' + (i === 0 ? ' active' : '') + '" data-trigger="' + m.trigger + '"><span class="cmd">' + m.trigger + '</span><span class="desc">' + m.label + '</span></div>';
        }).join('');
        mentionActiveIndex = 0;
        mentionStart = atIdx;
        mentionMenu.classList.add('visible');
        mentionMenu.querySelectorAll('.slash-item').forEach(function(el) {
          el.addEventListener('click', function() { applyMentionType(el.dataset.trigger); });
        });
        return;
      }
      // Check if user typed a mention type
      for (var t = 0; t < MENTION_TYPES.length; t++) {
        var mt = MENTION_TYPES[t];
        if (fragment.startsWith(mt.trigger)) {
          var q = fragment.slice(mt.trigger.length);
          if (q.length >= 1) {
            mentionStart = atIdx;
            mentionQuery = q;
            mentionReqId++;
            vscode.postMessage({ type: 'resolveMention', mentionType: mt.type, query: q, requestId: mentionReqId });
          }
          return;
        }
        // Partial match — filter type list
        if (mt.trigger.startsWith(fragment)) {
          var matches = MENTION_TYPES.filter(function(x) { return x.trigger.startsWith(fragment); });
          mentionMenu.innerHTML = matches.map(function(m, i) {
            return '<div class="slash-item' + (i === 0 ? ' active' : '') + '" data-trigger="' + m.trigger + '"><span class="cmd">' + m.trigger + '</span><span class="desc">' + m.label + '</span></div>';
          }).join('');
          mentionActiveIndex = 0;
          mentionStart = atIdx;
          mentionMenu.classList.add('visible');
          mentionMenu.querySelectorAll('.slash-item').forEach(function(el) {
            el.addEventListener('click', function() { applyMentionType(el.dataset.trigger); });
          });
          return;
        }
      }
      mentionMenu.classList.remove('visible');
    }

    function applyMentionType(trigger) {
      var before = inputEl.value.slice(0, mentionStart);
      var after = inputEl.value.slice(inputEl.selectionStart || 0);
      inputEl.value = before + trigger + after;
      inputEl.focus();
      inputEl.selectionStart = inputEl.selectionEnd = (before + trigger).length;
      mentionMenu.classList.remove('visible');
    }

    function applyMentionResult(label) {
      var before = inputEl.value.slice(0, mentionStart);
      // Find end of current mention text
      var cursorPos = inputEl.selectionStart || 0;
      var after = inputEl.value.slice(cursorPos);
      inputEl.value = before + '@' + label + ' ' + after;
      inputEl.focus();
      var newPos = (before + '@' + label + ' ').length;
      inputEl.selectionStart = inputEl.selectionEnd = newPos;
      mentionMenu.classList.remove('visible');
    }

    function send() {
      if (isStreaming) return;
      var msg = inputEl.value.trim();
      if (!msg && !pendingAttachments.length) return;
      if (msg) addMessage('user', msg);
      inputEl.value = '';
      var payload = {
        type: 'sendMessage',
        message: msg,
        agent: agentSelect.value,
        mode: modeSelect.value,
      };
      if (activeSlashCmd) {
        payload.slashCommand = activeSlashCmd;
      }
      if (pendingAttachments.length) {
        payload.attachments = pendingAttachments;
      }
      activeSlashCmd = null;
      pendingAttachments = [];
      renderAttachmentBar();
      vscode.postMessage(payload);
    }

    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', (e) => {
      // Slash menu navigation
      if (slashMenu.classList.contains('visible')) {
        const items = slashMenu.querySelectorAll('.slash-item');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          slashActiveIndex = Math.min(slashActiveIndex + 1, items.length - 1);
          updateSlashHighlight(items);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          slashActiveIndex = Math.max(slashActiveIndex - 1, 0);
          updateSlashHighlight(items);
          return;
        }
        if ((e.key === 'Tab' || e.key === 'Enter') && slashActiveIndex >= 0) {
          e.preventDefault();
          const selected = items[slashActiveIndex];
          if (selected) { applySlashCommand(selected.dataset.cmd); }
          return;
        }
        if (e.key === 'Escape') {
          slashMenu.classList.remove('visible');
          slashActiveIndex = -1;
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    inputEl.addEventListener('input', () => {
      const val = inputEl.value;
      // Show slash menu when typing starts with /
      if (val.startsWith('/') && !val.includes(' ')) {
        renderSlashMenu(val);
        // User is typing a new command — clear any previous selection
        activeSlashCmd = null;
      } else {
        slashMenu.classList.remove('visible');
        slashActiveIndex = -1;
        // Clear command association if input was fully erased
        if (!val.trim()) {
          activeSlashCmd = null;
        }
      }
      // Check for @-mention trigger
      checkForMention();
    });

    function insertCode(btn) {
      const code = btn.parentElement.querySelector('pre').textContent;
      vscode.postMessage({ type: 'insertCode', code });
    }
    window.insertCode = insertCode;
  </script>
</body>
</html>`;
    }
}
exports.HelixChatPanelProvider = HelixChatPanelProvider;
HelixChatPanelProvider.viewType = 'helix.chatPanel';
/**
 * Register the chat panel in the sidebar.
 */
function registerChatPanel(context) {
    const provider = new HelixChatPanelProvider(context.extensionUri, context);
    const disposable = vscode.window.registerWebviewViewProvider(HelixChatPanelProvider.viewType, provider);
    context.subscriptions.push(disposable);
    return disposable;
}
//# sourceMappingURL=chatPanelProvider.js.map