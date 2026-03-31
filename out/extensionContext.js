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
exports.HelixVSCodeExtension = void 0;
const vscode = __importStar(require("vscode"));
const AgentMode_1 = require("./agent/AgentMode");
const BrowserManager_1 = require("./browser/BrowserManager");
const CheckpointManager_1 = require("./checkpoint/CheckpointManager");
const ConfigurationManager_1 = require("./configuration/ConfigurationManager");
const ContextManager_1 = require("./context/ContextManager");
const DisplayManager_1 = require("./display/DisplayManager");
const MarketplaceManager_1 = require("./marketplace/MarketplaceManager");
const NotificationManager_1 = require("./notification/NotificationManager");
const AutoApprovalManager_1 = require("./safety/AutoApprovalManager");
const agentService_1 = require("./services/agentService");
const apiService_1 = require("./services/apiService");
const authService_1 = require("./services/authService");
const websocketService_1 = require("./services/websocketService");
const agentStore_1 = require("./stores/agentStore");
const marketplaceStore_1 = require("./stores/marketplaceStore");
const sessionStore_1 = require("./stores/sessionStore");
const spiralStore_1 = require("./stores/spiralStore");
const TerminalManager_1 = require("./terminal/TerminalManager");
const coordinationUtils_1 = require("./utils/coordinationUtils");
class HelixVSCodeExtension {
    // Expose API service for commands to use real backend APIs
    get apiService() {
        return this._apiService;
    }
    /**
     * Subscribe to real-time agent status events from the WebSocket feed.
     * The callback is called whenever an agent_status event arrives.
     * Returns a disposable that removes the listener.
     */
    onAgentStatusEvent(callback) {
        const handler = (data) => {
            callback(data.agentId, data.status, data.coordination);
        };
        this.websocketService.on('agent_status', handler);
        return new vscode.Disposable(() => {
            this.websocketService.off('agent_status', handler);
        });
    }
    // Expose managers for external command access
    get configManager() {
        return this.configurationManager;
    }
    get modeManager() {
        return this.agentModeManager;
    }
    get approvalManager() {
        return this.autoApprovalManager;
    }
    get display() {
        return this.displayManager;
    }
    get contextMgr() {
        return this.contextManager;
    }
    get terminal() {
        return this.terminalManager;
    }
    get browser() {
        return this.browserManager;
    }
    get marketplace() {
        return this.marketplaceManager;
    }
    get checkpoint() {
        return this.checkpointManager;
    }
    get notifications() {
        return this.notificationManager;
    }
    constructor(context) {
        this.disposables = [];
        this.context = context;
        this._apiService = new apiService_1.ApiService();
        this.websocketService = new websocketService_1.WebSocketService();
        this.agentService = new agentService_1.AgentService();
        this.authService = new authService_1.AuthService(this._apiService, context);
        this.sessionStore = new sessionStore_1.SessionStore(context);
        this.agentStore = new agentStore_1.AgentStore();
        this.marketplaceStore = new marketplaceStore_1.MarketplaceStore(context);
        this.spiralStore = new spiralStore_1.SpiralStore(context);
        this.coordinationMonitor = new coordinationUtils_1.CoordinationMonitor(this._apiService, metrics => this.sessionStore.updateCoordinationMetrics(metrics));
        // Initialize managers
        this.configurationManager = ConfigurationManager_1.ConfigurationManager.getInstance(context);
        this.agentModeManager = AgentMode_1.AgentModeManager.getInstance(context);
        this.autoApprovalManager = AutoApprovalManager_1.AutoApprovalManager.getInstance(context);
        this.displayManager = DisplayManager_1.DisplayManager.getInstance(context);
        this.contextManager = ContextManager_1.ContextManager.getInstance(context);
        this.terminalManager = TerminalManager_1.TerminalManager.getInstance(context);
        this.browserManager = BrowserManager_1.BrowserManager.getInstance(context);
        this.marketplaceManager = MarketplaceManager_1.MarketplaceManager.getInstance(context);
        this.checkpointManager = CheckpointManager_1.CheckpointManager.getInstance(context);
        this.notificationManager = NotificationManager_1.NotificationManager.getInstance(context);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'helix.openCoordinationDashboard';
    }
    async activate() {
        try {
            await this.loadConfiguration();
            await this.sessionStore.initialize();
            await this.agentStore.initialize();
            await this.marketplaceStore.initialize();
            await this.spiralStore.initialize();
            // Check if API is configured before connecting
            const apiEndpoint = this.getConfiguration('apiEndpoint');
            if (apiEndpoint && apiEndpoint !== 'http://localhost:8000') {
                this.websocketService.setEndpoint(apiEndpoint);
                await this.websocketService.connect();
                if (this.getConfiguration('enableCoordinationMonitoring')) {
                    this.coordinationMonitor.startMonitoring();
                }
                this.updateStatusBar();
                vscode.window.showInformationMessage('Helix extension connected successfully!');
            }
            else {
                // Show setup notification for unconfigured extension
                this.showSetupNotification();
            }
            this.registerWebViews();
            this.setupEventListeners();
        }
        catch (error) {
            // Show setup on connection failure
            this.showSetupNotification();
            throw error;
        }
    }
    showSetupNotification() {
        // If user is already authenticated, just prompt to configure the endpoint.
        if (this.authService.isAuthenticated()) {
            vscode.window
                .showInformationMessage('Helix: set your API endpoint to connect to the platform.', 'Open Settings')
                .then(sel => {
                if (sel === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'helix.apiEndpoint');
                }
            });
            return;
        }
        // New user — show sign-in / sign-up prompt.
        vscode.window
            .showInformationMessage('Welcome to Helix! Sign in to sync memory, agents, and automations across all your tools.', 'Sign in with GitHub', 'Sign in with Google', 'Sign in with Password', 'Create Account')
            .then(selection => {
            switch (selection) {
                case 'Sign in with GitHub':
                    this.authService.initiateOAuthLogin('github');
                    break;
                case 'Sign in with Google':
                    this.authService.initiateOAuthLogin('google');
                    break;
                case 'Sign in with Password':
                    this.authService.showLoginDialog();
                    break;
                case 'Create Account':
                    vscode.env.openExternal(vscode.Uri.parse('https://helixcollective.io/signup'));
                    break;
            }
        });
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.websocketService.disconnect();
        this.coordinationMonitor.stopMonitoring();
        this.statusBarItem.dispose();
    }
    async openAgentPanel() {
        const panel = vscode.window.createWebviewPanel('helixAgentPanel', 'Helix Agent Panel', vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
            ],
        });
        panel.webview.html = this.getAgentPanelHtml(panel.webview);
    }
    async openMarketplace() {
        const panel = vscode.window.createWebviewPanel('helixMarketplace', 'Helix Marketplace', vscode.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
            ],
        });
        panel.webview.html = this.getMarketplaceHtml(panel.webview);
    }
    async openCoordinationDashboard() {
        const panel = vscode.window.createWebviewPanel('helixCoordination', 'Helix Coordination Dashboard', vscode.ViewColumn.Three, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
            ],
        });
        panel.webview.html = this.getCoordinationDashboardHtml(panel.webview);
    }
    async openSpiralBuilder() {
        const panel = vscode.window.createWebviewPanel('helixSpiralBuilder', 'Helix Spiral Builder', vscode.ViewColumn.Active, { enableScripts: true });
        const config = vscode.workspace.getConfiguration('helix');
        const apiBase = config.get('apiEndpoint', 'https://api.helixcollective.io');
        const authToken = this.context.globalState.get('helix.authTokenValue') ?? '';
        panel.webview.html = this.getSpiralBuilderHtml(apiBase);
        // Load spiral list immediately
        const loadSpiralList = async () => {
            try {
                const res = await fetch(`${apiBase}/api/spirals/`, {
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                    signal: AbortSignal.timeout(8000),
                });
                const data = res.ok ? await res.json() : { spirals: [] };
                panel.webview.postMessage({
                    type: 'spiralList',
                    spirals: data.spirals ?? data.workflows ?? [],
                });
            }
            catch (err) {
                panel.webview.postMessage({
                    type: 'spiralList',
                    spirals: [],
                    error: String(err),
                });
            }
        };
        loadSpiralList();
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.type) {
                case 'refresh':
                    loadSpiralList();
                    break;
                case 'saveSpiral': {
                    try {
                        const res = await fetch(`${apiBase}/api/spirals/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                            },
                            body: JSON.stringify(msg.spiral),
                            signal: AbortSignal.timeout(10000),
                        });
                        const data = await res.json();
                        if (res.ok) {
                            panel.webview.postMessage({
                                type: 'saveResult',
                                success: true,
                                spiral: data,
                            });
                            loadSpiralList();
                        }
                        else {
                            panel.webview.postMessage({
                                type: 'saveResult',
                                success: false,
                                error: data.detail ?? `HTTP ${res.status}`,
                            });
                        }
                    }
                    catch (err) {
                        panel.webview.postMessage({
                            type: 'saveResult',
                            success: false,
                            error: String(err),
                        });
                    }
                    break;
                }
                case 'runSpiral': {
                    panel.webview.postMessage({
                        type: 'executionStart',
                        spiralId: msg.spiralId,
                    });
                    try {
                        const payload = msg.spiralId
                            ? { workflow_id: msg.spiralId, input: msg.input ?? {} }
                            : { workflow: msg.workflow, input: msg.input ?? {} };
                        const res = await fetch(`${apiBase}/api/spirals/engine/execute`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                            },
                            body: JSON.stringify(payload),
                            signal: AbortSignal.timeout(120000),
                        });
                        const data = await res.json();
                        if (res.ok && data.success !== false) {
                            panel.webview.postMessage({
                                type: 'executionComplete',
                                status: 'completed',
                                result: data,
                            });
                        }
                        else {
                            panel.webview.postMessage({
                                type: 'executionComplete',
                                status: 'failed',
                                error: data.error ?? data.detail ?? `HTTP ${res.status}`,
                            });
                        }
                    }
                    catch (err) {
                        panel.webview.postMessage({
                            type: 'executionComplete',
                            status: 'failed',
                            error: String(err),
                        });
                    }
                    break;
                }
            }
        });
    }
    async connectToAgent(agentId) {
        try {
            await this.agentService.connectToAgent(agentId);
            const agent = this.agentStore.getAgent(agentId);
            const agentName = agent?.name || agentId;
            vscode.window.showInformationMessage(`Connected to agent: ${agentName}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to connect to agent: ${error}`);
        }
    }
    async executeWorkflow(workflowId) {
        try {
            const result = await this.spiralStore.executeWorkflow(workflowId, {});
            vscode.window.showInformationMessage(`Workflow executed successfully: ${result.status}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to execute workflow: ${error}`);
        }
    }
    async loadConfiguration() {
        const config = vscode.workspace.getConfiguration('helix');
        this._apiService.setEndpoint(config.get('apiEndpoint', 'http://localhost:8000'));
        this.websocketService.setEndpoint(config.get('websocketEndpoint', 'ws://localhost:8000'));
    }
    getConfiguration(key) {
        return vscode.workspace.getConfiguration('helix').get(key);
    }
    async handleConfigurationChange() {
        await this.loadConfiguration();
        this.updateStatusBar();
    }
    async handleWorkspaceChange() {
        // Handle workspace folder changes
    }
    async handleDocumentChange(event) {
        if (event.document.languageId === 'typescript' ||
            event.document.languageId === 'javascript') {
            await this.updateContextForDocument(event.document);
        }
    }
    getAgentPanelHtml(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'dist', 'agentPanel.js'));
        const nonce = this.getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Helix Agent Panel</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
    getMarketplaceHtml(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'dist', 'marketplace.js'));
        const nonce = this.getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Helix Marketplace</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
    getCoordinationDashboardHtml(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'dist', 'coordinationDashboard.js'));
        const nonce = this.getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Helix Coordination Dashboard</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
    getSpiralBuilderHtml(apiBase) {
        const nonce = this.getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Helix Spiral Builder</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#c9d1d9;height:100vh;display:flex;flex-direction:column;overflow:hidden}
    #toolbar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#161b22;border-bottom:1px solid #30363d;flex-shrink:0}
    #toolbar h2{font-size:14px;font-weight:600;color:#58a6ff;margin-right:8px}
    .btn{padding:5px 12px;border:1px solid #30363d;border-radius:6px;background:#21262d;color:#c9d1d9;cursor:pointer;font-size:12px}
    .btn:hover{background:#30363d}
    .btn-primary{background:#238636;border-color:#2ea043;color:#fff}
    .btn-primary:hover{background:#2ea043}
    .btn-run{background:#1f6feb;border-color:#388bfd;color:#fff}
    .btn-run:hover{background:#388bfd}
    .btn-danger{background:#b62324;border-color:#f85149;color:#fff}
    #status-msg{font-size:12px;color:#8b949e;margin-left:auto}
    #main{display:flex;flex:1;min-height:0}
    #sidebar{width:260px;border-right:1px solid #30363d;display:flex;flex-direction:column;flex-shrink:0}
    #sidebar-header{padding:10px 12px;border-bottom:1px solid #30363d;display:flex;align-items:center;justify-content:space-between}
    #sidebar-header span{font-size:12px;font-weight:600;text-transform:uppercase;color:#8b949e;letter-spacing:.05em}
    #spiral-list{flex:1;overflow-y:auto;padding:8px}
    .spiral-item{padding:9px 10px;border:1px solid #30363d;border-radius:6px;margin-bottom:6px;cursor:pointer;background:#161b22}
    .spiral-item:hover{border-color:#58a6ff}
    .spiral-item.selected{border-color:#58a6ff;background:#1c2a3a}
    .spiral-name{font-size:13px;font-weight:500}
    .spiral-desc{font-size:11px;color:#8b949e;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .spiral-meta{font-size:10px;color:#484f58;margin-top:4px}
    #canvas{flex:1;display:flex;flex-direction:column;min-width:0}
    #editor{flex:1;padding:16px;overflow-y:auto}
    .field-group{margin-bottom:14px}
    .field-group label{display:block;font-size:11px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
    .field-group input,.field-group textarea,.field-group select{width:100%;padding:7px 10px;background:#161b22;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;font-size:13px;font-family:inherit}
    .field-group input:focus,.field-group textarea:focus{outline:none;border-color:#58a6ff}
    .field-group textarea{min-height:80px;resize:vertical}
    #log-panel{border-top:1px solid #30363d;height:160px;display:flex;flex-direction:column;flex-shrink:0}
    #log-header{padding:6px 12px;background:#161b22;border-bottom:1px solid #30363d;font-size:11px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;gap:8px}
    #log-header #exec-status{font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:#21262d;border:1px solid #30363d}
    #log-body{flex:1;overflow-y:auto;padding:8px 12px;font-family:'JetBrains Mono','Cascadia Code','Fira Code',monospace;font-size:11px;color:#8b949e}
    .log-line{margin-bottom:3px;line-height:1.5}
    .log-ok{color:#3fb950}
    .log-err{color:#f85149}
    .log-info{color:#58a6ff}
    .log-warn{color:#d29922}
    .empty-state{text-align:center;padding:40px 20px;color:#8b949e}
    .empty-state .icon{font-size:32px;margin-bottom:12px}
    .badge{display:inline-block;padding:1px 6px;border-radius:10px;font-size:10px;background:#21262d;border:1px solid #30363d;color:#8b949e}
    .nodes-preview{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .node-chip{padding:3px 8px;border-radius:12px;font-size:11px;background:#21262d;border:1px solid #30363d;color:#8b949e}
    .node-chip.agent{border-color:#388bfd;color:#58a6ff}
    .node-chip.action{border-color:#2ea043;color:#3fb950}
    .node-chip.condition{border-color:#d29922;color:#e3b341}
    hr{border:none;border-top:1px solid #30363d;margin:14px 0}
  </style>
</head>
<body>
<div id="toolbar">
  <h2>🌀 Helix Spiral Builder</h2>
  <button class="btn btn-primary" onclick="saveSpiral()">Save Spiral</button>
  <button class="btn btn-run" onclick="runSpiral()">▶ Run Spiral</button>
  <button class="btn" onclick="newSpiral()">+ New</button>
  <button class="btn" onclick="refreshList()" title="Refresh spiral list">↻</button>
  <span id="status-msg">Connected to ${apiBase}</span>
</div>
<div id="main">
  <div id="sidebar">
    <div id="sidebar-header">
      <span>Spirals</span>
      <span id="spiral-count" class="badge">0</span>
    </div>
    <div id="spiral-list"><div class="empty-state"><div class="icon">⏳</div>Loading spirals…</div></div>
  </div>
  <div id="canvas">
    <div id="editor">
      <div class="empty-state">
        <div class="icon">🌀</div>
        <div>Select a spiral from the sidebar or create a new one</div>
      </div>
    </div>
    <div id="log-panel">
      <div id="log-header">Execution Log <span id="exec-status">idle</span></div>
      <div id="log-body"></div>
    </div>
  </div>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
let currentSpiral = null;

// ── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(msg, cls) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.style.color = cls === 'err' ? '#f85149' : cls === 'ok' ? '#3fb950' : '#8b949e';
}

function log(text, cls) {
  const body = document.getElementById('log-body');
  const line = document.createElement('div');
  line.className = 'log-line' + (cls ? ' log-' + cls : '');
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  line.textContent = '[' + ts + '] ' + text;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

function setExecStatus(text, color) {
  const el = document.getElementById('exec-status');
  el.textContent = text;
  el.style.color = color || '';
  el.style.borderColor = color || '';
}

// ── Spiral list ──────────────────────────────────────────────────────────────
function renderList(spirals) {
  const list = document.getElementById('spiral-list');
  document.getElementById('spiral-count').textContent = spirals.length;
  if (!spirals.length) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🌀</div>No spirals yet — create one!</div>';
    return;
  }
  list.innerHTML = '';
  spirals.forEach(s => {
    const div = document.createElement('div');
    div.className = 'spiral-item' + (currentSpiral && currentSpiral.id === s.id ? ' selected' : '');
    div.dataset.id = s.id;
    const nodeCount = (s.nodes || s.workflow_definition?.nodes || []).length;
    div.innerHTML =
      '<div class="spiral-name">' + escHtml(s.name || s.spiral_name || 'Unnamed') + '</div>' +
      '<div class="spiral-desc">' + escHtml(s.description || '') + '</div>' +
      '<div class="spiral-meta">' + nodeCount + ' node' + (nodeCount !== 1 ? 's' : '') + (s.status ? ' · ' + s.status : '') + '</div>';
    div.addEventListener('click', () => selectSpiral(s));
    list.appendChild(div);
  });
}

function selectSpiral(s) {
  currentSpiral = s;
  document.querySelectorAll('.spiral-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === String(s.id));
  });
  renderEditor(s);
}

// ── Editor ───────────────────────────────────────────────────────────────────
function renderEditor(s) {
  const editor = document.getElementById('editor');
  const nodes = s.nodes || s.workflow_definition?.nodes || [];
  const nodeChips = nodes.map(n =>
    '<span class="node-chip ' + (n.type || '') + '">' + escHtml(n.name || n.type || n.id || 'node') + '</span>'
  ).join('');
  editor.innerHTML =
    '<div class="field-group"><label>Spiral Name</label>' +
    '<input id="f-name" value="' + escAttr(s.name || s.spiral_name || '') + '"></div>' +
    '<div class="field-group"><label>Description</label>' +
    '<textarea id="f-desc">' + escHtml(s.description || '') + '</textarea></div>' +
    '<div class="field-group"><label>Status</label>' +
    '<select id="f-status">' +
    '<option value="active"' + (s.status === 'active' ? ' selected' : '') + '>Active</option>' +
    '<option value="inactive"' + (s.status !== 'active' ? ' selected' : '') + '>Inactive</option>' +
    '</select></div>' +
    (nodeChips ? '<hr><div class="field-group"><label>Nodes (' + nodes.length + ')</label><div class="nodes-preview">' + nodeChips + '</div></div>' : '') +
    '<hr><div class="field-group"><label>Input JSON (optional, used when running)</label>' +
    '<textarea id="f-input" style="font-family:monospace;font-size:11px" placeholder=\'{}\'>{}</textarea></div>';
}

function newSpiral() {
  currentSpiral = { id: null, name: 'New Spiral', description: '', status: 'inactive', nodes: [] };
  renderEditor(currentSpiral);
  document.getElementById('spiral-list').querySelectorAll('.spiral-item').forEach(el => el.classList.remove('selected'));
}

function getEditorValues() {
  return {
    name: (document.getElementById('f-name') || {}).value || '',
    description: (document.getElementById('f-desc') || {}).value || '',
    status: (document.getElementById('f-status') || {}).value || 'inactive',
    nodes: currentSpiral ? (currentSpiral.nodes || []) : [],
    connections: currentSpiral ? (currentSpiral.connections || []) : [],
  };
}

// ── Actions ──────────────────────────────────────────────────────────────────
function saveSpiral() {
  const vals = getEditorValues();
  if (!vals.name) { setStatus('Spiral name is required', 'err'); return; }
  setStatus('Saving…', '');
  const spiral = Object.assign({}, currentSpiral || {}, vals);
  vscode.postMessage({ type: 'saveSpiral', spiral });
}

function runSpiral() {
  let inputVal = {};
  const inputEl = document.getElementById('f-input');
  if (inputEl) {
    try { inputVal = JSON.parse(inputEl.value || '{}'); }
    catch (e) { setStatus('Invalid JSON in input field', 'err'); return; }
  }
  document.getElementById('log-body').innerHTML = '';
  setExecStatus('running…', '#d29922');
  log('Starting execution…', 'info');
  const msg = currentSpiral && currentSpiral.id
    ? { type: 'runSpiral', spiralId: currentSpiral.id, input: inputVal }
    : { type: 'runSpiral', workflow: getEditorValues(), input: inputVal };
  vscode.postMessage(msg);
}

function refreshList() {
  setStatus('Refreshing…', '');
  vscode.postMessage({ type: 'refresh' });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) { return escHtml(s); }

// ── Message handler ──────────────────────────────────────────────────────────
window.addEventListener('message', e => {
  const msg = e.data;
  switch (msg.type) {
    case 'spiralList':
      renderList(msg.spirals || []);
      setStatus(msg.error ? 'Load error: ' + msg.error : 'Ready — ' + (msg.spirals || []).length + ' spiral(s) loaded', msg.error ? 'err' : 'ok');
      break;
    case 'saveResult':
      if (msg.success) {
        setStatus('Saved!', 'ok');
        if (msg.spiral) { currentSpiral = msg.spiral; renderEditor(currentSpiral); }
        log('Spiral saved successfully.', 'ok');
      } else {
        setStatus('Save failed: ' + (msg.error || 'unknown error'), 'err');
        log('Save error: ' + (msg.error || 'unknown error'), 'err');
      }
      break;
    case 'executionStart':
      setExecStatus('running…', '#d29922');
      log('Execution started.', 'info');
      break;
    case 'executionComplete':
      if (msg.status === 'completed') {
        setExecStatus('completed', '#3fb950');
        log('Execution completed successfully.', 'ok');
        if (msg.result) {
          const summary = JSON.stringify(msg.result).slice(0, 400);
          log('Result: ' + summary, 'ok');
        }
      } else {
        setExecStatus('failed', '#f85149');
        log('Execution failed: ' + (msg.error || 'unknown error'), 'err');
      }
      break;
  }
});
</script>
</body>
</html>`;
    }
    getNonce() {
        const crypto = require('crypto');
        return crypto.randomBytes(16).toString('hex');
    }
    updateStatusBar() {
        const level = this.sessionStore.getPerformanceScore();
        const scoreLabel = level > 0 ? level.toFixed(1) : '—';
        const activeAgents = this.agentStore.getActiveAgents().length > 0 ? 'Active' : 'Idle';
        this.statusBarItem.text = `$(heart) Helix: ${scoreLabel} | $(robot) ${activeAgents}`;
        this.statusBarItem.show();
    }
    setupEventListeners() {
        this.websocketService.on('coordination_update', data => {
            this.sessionStore.updateCoordinationMetrics(data.metrics);
            this.updateStatusBar();
        });
        this.websocketService.on('agent_status', data => {
            this.agentStore.updateAgentStatus(data.agentId, data.status);
            this.updateStatusBar();
        });
        this.websocketService.on('marketplace_update', data => {
            this.marketplaceStore.updateProduct(data.product);
        });
    }
    registerWebViews() {
        // Register webview providers if needed
    }
    async updateContextForDocument(document) {
        const context = {
            language: document.languageId,
            fileName: document.fileName,
            content: document.getText(),
        };
        await this.sessionStore.updateContext(context);
    }
}
exports.HelixVSCodeExtension = HelixVSCodeExtension;
//# sourceMappingURL=extensionContext.js.map