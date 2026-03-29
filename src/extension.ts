import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { HelixVSCodeExtension } from './extensionContext';
import { getAgentMemory } from './memory/AgentMemory';
import { getMcpManager } from './mcp/McpManager';
import { AgentEditProvider } from './providers/agentEditProvider';
import { registerChatPanel } from './providers/chatPanelProvider';
import { registerCodeActionProvider } from './providers/codeActionProvider';
import { registerInlineCompletionProvider } from './providers/inlineCompletionProvider';
import { registerGitCommands } from './commands/gitCommands';
import { ProviderStatusView } from './providers/ProviderStatusView';
import { RulesLoader } from './rules/RulesLoader';
import { registerAgentTreeView } from './views/agentTreeView';

/** Module-level RulesLoader instance — accessible to other providers (e.g. chatPanelProvider). */
let _rulesLoader: RulesLoader | undefined;

/**
 * Returns the active RulesLoader instance, or undefined if the extension has
 * not yet activated. Prefer this over walking context.subscriptions.
 */
export function getRulesLoader(): RulesLoader | undefined {
  return _rulesLoader;
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    const helixExtension = new HelixVSCodeExtension(context);
    await helixExtension.activate();
    registerCommands(context, helixExtension);

    // OAuth callback URI handler — catches redirects like:
    //   vscode://helix-collective.helix-vscode-extension/auth/callback?token=JWT&provider=github
    // The backend redirects here after OAuth completes so the token lands directly
    // in SecretStorage without the user manually pasting anything.
    context.subscriptions.push(
      vscode.window.registerUriHandler({
        async handleUri(uri: vscode.Uri) {
          if (uri.path !== '/auth/callback') return;
          const params = new URLSearchParams(uri.query);
          const token = params.get('token');
          const refreshToken = params.get('refresh') ?? '';
          const provider = params.get('provider') ?? 'oauth';
          if (token) {
            // Store directly in SecretStorage (same format AuthService expects)
            const authToken = {
              token,
              refreshToken,
              expiresAt: new Date(Date.now() + 3600_000).toISOString(),
            };
            await context.secrets.store(
              'helix.authToken',
              JSON.stringify(authToken)
            );
            await context.globalState.update('helix.authTokenValue', token);
            helixExtension.apiService.setAuthToken(token);
            // Trigger memory sync now that we have credentials
            const agentMemory = getAgentMemory(context);
            const apiBase =
              vscode.workspace
                .getConfiguration('helix')
                .get<string>('apiEndpoint') ?? 'https://api.helixcollective.io';
            agentMemory.setBackendConfig(apiBase, token);
            agentMemory.syncFromBackend('helix').catch(() => undefined);
            vscode.window.showInformationMessage(
              `Helix: signed in with ${provider}. Memory and agents are now syncing.`
            );
          } else {
            vscode.window.showErrorMessage(
              'Helix: OAuth sign-in failed — no token received. Please try again.'
            );
          }
        },
      })
    );

    // Register tree view for agents sidebar
    const agentTreeProvider = registerAgentTreeView(context);

    // API base URL used by agent polling and memory sync
    const apiBase =
      vscode.workspace.getConfiguration('helix').get<string>('apiEndpoint') ||
      'https://api.helixcollective.io';

    // Helper: fetch live agent list and update the tree view
    const refreshAgents = () => {
      fetch(`${apiBase}/api/agents/list`, { signal: AbortSignal.timeout(8000) })
        .then(res =>
          res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))
        )
        .then((data: { agents?: unknown[] }) => {
          if (Array.isArray(data.agents) && data.agents.length > 0) {
            agentTreeProvider.loadFromApi(
              data.agents as Parameters<typeof agentTreeProvider.loadFromApi>[0]
            );
          }
        })
        .catch(err => {
          console.warn(
            'Helix: could not load agents from API:',
            err?.message ?? err
          );
        });
    };

    // Initial load + poll every 60 s for live status updates
    refreshAgents();
    const agentPollHandle = setInterval(refreshAgents, 60_000);
    context.subscriptions.push({
      dispose: () => clearInterval(agentPollHandle),
    });

    // Refresh command: re-fetch from API (toolbar button on Agents panel)
    context.subscriptions.push(
      vscode.commands.registerCommand('helix.refreshAgents', () => {
        refreshAgents();
      })
    );

    // Wire WebSocket agent_status events → real-time tree updates
    context.subscriptions.push(
      helixExtension.onAgentStatusEvent((agentId, status, coordination) => {
        agentTreeProvider.updateAgentStatus(
          agentId,
          status as Parameters<typeof agentTreeProvider.updateAgentStatus>[1],
          coordination
        );
      })
    );

    // Register Helix AI inline completions (ghost text)
    registerInlineCompletionProvider(context);

    // Register Helix Chat panel in the sidebar
    registerChatPanel(context);

    // Register Helix Code Action Provider (Explain, Improve, Generate Tests)
    registerCodeActionProvider(context);

    // Register Helix Agent Edit command (agentic file editing with diff approval)
    AgentEditProvider.register(context);

    // Load project and global rules (.helixrules, .helix/rules.md, .cursor/rules)
    _rulesLoader = new RulesLoader();
    _rulesLoader.initialize(context);

    // Initialize agent memory persistence (singleton — must be before chat panel uses it)
    const agentMemory = getAgentMemory(context);
    context.subscriptions.push(agentMemory);

    // Wire backend config for cross-platform memory sync (VS Code ↔ web)
    // Pull remote memories once on activate so VS Code has full context.
    const authToken =
      context.globalState.get<string>('helix.authTokenValue') ?? '';
    if (authToken) {
      agentMemory.setBackendConfig(apiBase, authToken);
      agentMemory.syncFromBackend('helix').catch(err => {
        console.warn('AgentMemory: initial backend sync failed:', err);
      });
    }

    // Provider status bar — shows active AI provider + model, polls every 60s
    ProviderStatusView.activate(context);

    // Register git integration commands (commit message, PR description, blame)
    registerGitCommands(context);

    // Initialize MCP server connections (reads helix.mcp.servers from settings)
    const mcpManager = getMcpManager();
    context.subscriptions.push(mcpManager);
    mcpManager.initialize().catch(err => {
      console.warn('MCP initialization failed:', err);
    });

    // Register MCP reconnect command
    context.subscriptions.push(
      vscode.commands.registerCommand('helix.mcpReconnectServer', async () => {
        const servers = mcpManager.getConnectedServers();
        if (servers.length === 0) {
          vscode.window.showInformationMessage(
            'No MCP servers configured. Add servers in Settings > Helix > MCP > Servers.'
          );
          return;
        }
        const picked = await vscode.window.showQuickPick(
          servers.map(s => ({
            label: s.name,
            description: s.status,
            detail: s.error ?? `${s.tools.length} tool(s)`,
          })),
          { placeHolder: 'Select an MCP server to reconnect' }
        );
        if (picked) {
          try {
            await mcpManager.reconnect(picked.label);
            vscode.window.showInformationMessage(
              `MCP server "${picked.label}" reconnected successfully.`
            );
          } catch (err: any) {
            vscode.window.showErrorMessage(
              `Failed to reconnect "${picked.label}": ${err?.message ?? err}`
            );
          }
        }
      }),
      vscode.commands.registerCommand('helix.mcpListTools', () => {
        const tools = mcpManager.getAvailableTools();
        if (tools.length === 0) {
          vscode.window.showInformationMessage(
            'No MCP tools available. Check that your MCP servers are connected.'
          );
          return;
        }
        vscode.window.showQuickPick(
          tools.map(t => ({
            label: t.name,
            description: `[${t.serverName}]`,
            detail: t.description,
          })),
          { placeHolder: 'Available MCP tools (read-only)' }
        );
      })
    );

    // Register event listeners
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async event => {
        if (event.affectsConfiguration('helix')) {
          await helixExtension.handleConfigurationChange();
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        await helixExtension.handleWorkspaceChange();
      }),
      vscode.workspace.onDidChangeTextDocument(async event => {
        await helixExtension.handleDocumentChange(event);
      })
    );

    vscode.window.showInformationMessage(
      'Helix extension activated successfully!'
    );
    context.subscriptions.push(helixExtension);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to activate Helix extension: ${error}`
    );
  }
}

export async function deactivate() {
  // Cleanup will be handled by disposables
}
