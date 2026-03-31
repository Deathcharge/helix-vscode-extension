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
exports.getRulesLoader = getRulesLoader;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const commands_1 = require("./commands");
const extensionContext_1 = require("./extensionContext");
const AgentMemory_1 = require("./memory/AgentMemory");
const McpManager_1 = require("./mcp/McpManager");
const agentEditProvider_1 = require("./providers/agentEditProvider");
const chatPanelProvider_1 = require("./providers/chatPanelProvider");
const codeActionProvider_1 = require("./providers/codeActionProvider");
const inlineCompletionProvider_1 = require("./providers/inlineCompletionProvider");
const gitCommands_1 = require("./commands/gitCommands");
const ProviderStatusView_1 = require("./providers/ProviderStatusView");
const RulesLoader_1 = require("./rules/RulesLoader");
const agentTreeView_1 = require("./views/agentTreeView");
/** Module-level RulesLoader instance — accessible to other providers (e.g. chatPanelProvider). */
let _rulesLoader;
/**
 * Returns the active RulesLoader instance, or undefined if the extension has
 * not yet activated. Prefer this over walking context.subscriptions.
 */
function getRulesLoader() {
    return _rulesLoader;
}
async function activate(context) {
    try {
        const helixExtension = new extensionContext_1.HelixVSCodeExtension(context);
        await helixExtension.activate();
        (0, commands_1.registerCommands)(context, helixExtension);
        // OAuth callback URI handler — catches redirects like:
        //   vscode://helix-collective.helix-vscode-extension/auth/callback?token=JWT&provider=github
        // The backend redirects here after OAuth completes so the token lands directly
        // in SecretStorage without the user manually pasting anything.
        context.subscriptions.push(vscode.window.registerUriHandler({
            async handleUri(uri) {
                if (uri.path !== '/auth/callback')
                    return;
                const params = new URLSearchParams(uri.query);
                const token = params.get('token');
                const refreshToken = params.get('refresh') ?? '';
                const provider = params.get('provider') ?? 'oauth';
                if (token) {
                    // Store directly in SecretStorage (same format AuthService expects)
                    const authToken = {
                        token,
                        refreshToken,
                        expiresAt: new Date(Date.now() + 3600000).toISOString(),
                    };
                    await context.secrets.store('helix.authToken', JSON.stringify(authToken));
                    await context.globalState.update('helix.authTokenValue', token);
                    helixExtension.apiService.setAuthToken(token);
                    // Trigger memory sync now that we have credentials
                    const agentMemory = (0, AgentMemory_1.getAgentMemory)(context);
                    const apiBase = vscode.workspace
                        .getConfiguration('helix')
                        .get('apiEndpoint') ?? 'https://api.helixcollective.io';
                    agentMemory.setBackendConfig(apiBase, token);
                    agentMemory.syncFromBackend('helix').catch(() => undefined);
                    vscode.window.showInformationMessage(`Helix: signed in with ${provider}. Memory and agents are now syncing.`);
                }
                else {
                    vscode.window.showErrorMessage('Helix: OAuth sign-in failed — no token received. Please try again.');
                }
            },
        }));
        // Register tree view for agents sidebar
        const agentTreeProvider = (0, agentTreeView_1.registerAgentTreeView)(context);
        // API base URL used by agent polling and memory sync
        const apiBase = vscode.workspace.getConfiguration('helix').get('apiEndpoint') ||
            'https://api.helixcollective.io';
        // Helper: fetch live agent list and update the tree view
        const refreshAgents = () => {
            fetch(`${apiBase}/api/agents/list`, { signal: AbortSignal.timeout(8000) })
                .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
                .then((data) => {
                if (Array.isArray(data.agents) && data.agents.length > 0) {
                    agentTreeProvider.loadFromApi(data.agents);
                }
            })
                .catch(err => {
                console.warn('Helix: could not load agents from API:', err?.message ?? err);
            });
        };
        // Initial load + poll every 60 s for live status updates
        refreshAgents();
        const agentPollHandle = setInterval(refreshAgents, 60000);
        context.subscriptions.push({
            dispose: () => clearInterval(agentPollHandle),
        });
        // Refresh command: re-fetch from API (toolbar button on Agents panel)
        context.subscriptions.push(vscode.commands.registerCommand('helix.refreshAgents', () => {
            refreshAgents();
        }));
        // Wire WebSocket agent_status events → real-time tree updates
        context.subscriptions.push(helixExtension.onAgentStatusEvent((agentId, status, coordination) => {
            agentTreeProvider.updateAgentStatus(agentId, status, coordination);
        }));
        // Register Helix AI inline completions (ghost text)
        (0, inlineCompletionProvider_1.registerInlineCompletionProvider)(context);
        // Register Helix Chat panel in the sidebar
        (0, chatPanelProvider_1.registerChatPanel)(context);
        // Register Helix Code Action Provider (Explain, Improve, Generate Tests)
        (0, codeActionProvider_1.registerCodeActionProvider)(context);
        // Register Helix Agent Edit command (agentic file editing with diff approval)
        agentEditProvider_1.AgentEditProvider.register(context);
        // Load project and global rules (.helixrules, .helix/rules.md, .cursor/rules)
        _rulesLoader = new RulesLoader_1.RulesLoader();
        _rulesLoader.initialize(context);
        // Initialize agent memory persistence (singleton — must be before chat panel uses it)
        const agentMemory = (0, AgentMemory_1.getAgentMemory)(context);
        context.subscriptions.push(agentMemory);
        // Wire backend config for cross-platform memory sync (VS Code ↔ web)
        // Pull remote memories once on activate so VS Code has full context.
        const authToken = context.globalState.get('helix.authTokenValue') ?? '';
        if (authToken) {
            agentMemory.setBackendConfig(apiBase, authToken);
            agentMemory.syncFromBackend('helix').catch(err => {
                console.warn('AgentMemory: initial backend sync failed:', err);
            });
        }
        // Provider status bar — shows active AI provider + model, polls every 60s
        ProviderStatusView_1.ProviderStatusView.activate(context);
        // Register git integration commands (commit message, PR description, blame)
        (0, gitCommands_1.registerGitCommands)(context);
        // Initialize MCP server connections (reads helix.mcp.servers from settings)
        const mcpManager = (0, McpManager_1.getMcpManager)();
        context.subscriptions.push(mcpManager);
        mcpManager.initialize().catch(err => {
            console.warn('MCP initialization failed:', err);
        });
        // Register MCP reconnect command
        context.subscriptions.push(vscode.commands.registerCommand('helix.mcpReconnectServer', async () => {
            const servers = mcpManager.getConnectedServers();
            if (servers.length === 0) {
                vscode.window.showInformationMessage('No MCP servers configured. Add servers in Settings > Helix > MCP > Servers.');
                return;
            }
            const picked = await vscode.window.showQuickPick(servers.map(s => ({
                label: s.name,
                description: s.status,
                detail: s.error ?? `${s.tools.length} tool(s)`,
            })), { placeHolder: 'Select an MCP server to reconnect' });
            if (picked) {
                try {
                    await mcpManager.reconnect(picked.label);
                    vscode.window.showInformationMessage(`MCP server "${picked.label}" reconnected successfully.`);
                }
                catch (err) {
                    vscode.window.showErrorMessage(`Failed to reconnect "${picked.label}": ${err?.message ?? err}`);
                }
            }
        }), vscode.commands.registerCommand('helix.mcpListTools', () => {
            const tools = mcpManager.getAvailableTools();
            if (tools.length === 0) {
                vscode.window.showInformationMessage('No MCP tools available. Check that your MCP servers are connected.');
                return;
            }
            vscode.window.showQuickPick(tools.map(t => ({
                label: t.name,
                description: `[${t.serverName}]`,
                detail: t.description,
            })), { placeHolder: 'Available MCP tools (read-only)' });
        }));
        // Register event listeners
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('helix')) {
                await helixExtension.handleConfigurationChange();
            }
        }), vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            await helixExtension.handleWorkspaceChange();
        }), vscode.workspace.onDidChangeTextDocument(async (event) => {
            await helixExtension.handleDocumentChange(event);
        }));
        vscode.window.showInformationMessage('Helix extension activated successfully!');
        context.subscriptions.push(helixExtension);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to activate Helix extension: ${error}`);
    }
}
async function deactivate() {
    // Cleanup will be handled by disposables
}
//# sourceMappingURL=extension.js.map