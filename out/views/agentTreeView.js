"use strict";
/**
 * Helix Agent Tree View Provider
 * Provides agent listing in VS Code sidebar, populated from live API data.
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
exports.AgentTreeDataProvider = void 0;
exports.registerAgentTreeView = registerAgentTreeView;
const vscode = __importStar(require("vscode"));
/** Map backend layer strings → UI layer enum */
function mapLayer(raw) {
    switch ((raw ?? '').toLowerCase()) {
        case 'core':
        case 'coordination':
        case 'governance':
        case 'meta':
            return 'core';
        case 'processing':
        case 'orchestrator':
            return 'processing';
        case 'integration':
        case 'operational':
            return 'specialized';
        default:
            return 'interface';
    }
}
/** Map backend status strings → UI status enum */
function mapStatus(raw) {
    switch ((raw ?? 'active').toLowerCase()) {
        case 'active':
            return 'active';
        case 'idle':
        case 'standby':
            return 'idle';
        case 'offline':
        case 'disabled':
            return 'offline';
        case 'processing':
        case 'busy':
        case 'running':
            return 'processing';
        default:
            return 'active';
    }
}
class AgentTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.agents = [];
        this._isLiveData = false;
        // Start with minimal placeholder — replaced on first successful API fetch
        this.agents = [
            {
                id: 'helix',
                name: 'Helix',
                codename: 'Primary Executor',
                status: 'idle',
                layer: 'core',
                coordination: null,
                emoji: '⬡',
            },
        ];
    }
    /** Replace the agent list with data fetched from the backend API. */
    loadFromApi(apiAgents) {
        if (!apiAgents.length)
            return;
        this.agents = apiAgents.map(a => ({
            id: (a.name ?? 'unknown').toLowerCase(),
            name: a.name ?? 'Unknown',
            codename: ((a.description ?? '').slice(0, 40) || a.layer) ?? '',
            status: mapStatus(a.status),
            layer: mapLayer(a.layer),
            coordination: null,
            emoji: a.icon ?? a.emoji ?? '◈',
        }));
        this._isLiveData = true;
        this._onDidChangeTreeData.fire();
    }
    /** Update a single agent's status (from WebSocket or poll). */
    updateAgentStatus(agentId, status, coordination) {
        const agent = this.agents.find(a => a.id === agentId);
        if (agent) {
            agent.status = status;
            if (coordination !== undefined) {
                agent.coordination = coordination;
            }
            this._onDidChangeTreeData.fire();
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    updateAgent(agent) {
        const index = this.agents.findIndex(a => a.id === agent.id);
        if (index !== -1) {
            this.agents[index] = agent;
            this._onDidChangeTreeData.fire();
        }
    }
    get isLiveData() {
        return this._isLiveData;
    }
    getTreeItem(element) {
        const statusIcons = {
            active: '🟢',
            idle: '🟡',
            offline: '⚫',
            processing: '🔵',
        };
        const treeItem = new vscode.TreeItem(`${element.emoji} ${element.name}`, vscode.TreeItemCollapsibleState.None);
        treeItem.description = `${statusIcons[element.status]} ${element.codename}`;
        treeItem.tooltip = new vscode.MarkdownString(`### ${element.emoji} ${element.name}\n\n` +
            `**Codename:** ${element.codename}\n\n` +
            `**Status:** ${element.status}\n\n` +
            `**Layer:** ${element.layer}\n\n` +
            `**Performance Score:** ${element.coordination !== null ? `${element.coordination}%` : '—'}`);
        treeItem.contextValue = `agent-${element.status}`;
        treeItem.command = {
            command: 'helix.selectAgent',
            title: 'Select Agent',
            arguments: [element],
        };
        treeItem.iconPath = this.getAgentIcon(element);
        return treeItem;
    }
    getAgentIcon(agent) {
        const iconMap = {
            active: 'symbol-event',
            idle: 'circle-large-outline',
            offline: 'circle-slash',
            processing: 'sync~spin',
        };
        return new vscode.ThemeIcon(iconMap[agent.status] || 'symbol-event');
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        // Sort by status: active first, then idle, then offline
        const sorted = [...this.agents].sort((a, b) => {
            const order = { active: 0, processing: 1, idle: 2, offline: 3 };
            return order[a.status] - order[b.status];
        });
        return Promise.resolve(sorted);
    }
    getAgent(agentId) {
        return this.agents.find(a => a.id === agentId);
    }
    getActiveAgents() {
        return this.agents.filter(a => a.status === 'active' || a.status === 'processing');
    }
}
exports.AgentTreeDataProvider = AgentTreeDataProvider;
function registerAgentTreeView(context) {
    const provider = new AgentTreeDataProvider();
    const treeView = vscode.window.createTreeView('helixAgentView', {
        treeDataProvider: provider,
        showCollapseAll: false,
    });
    // Register select agent command — sets the active agent for the chat panel
    context.subscriptions.push(vscode.commands.registerCommand('helix.selectAgent', async (agent) => {
        // Persist active agent in workspace state so chat panel can read it
        await context.workspaceState.update('helix.activeAgent', agent.id);
        vscode.window.showInformationMessage(`Active agent set to ${agent.emoji} ${agent.name}`);
    }));
    // Note: helix.refreshAgents is registered in extension.ts where it can
    // also trigger a live API re-fetch alongside the tree refresh.
    context.subscriptions.push(treeView);
    return provider;
}
//# sourceMappingURL=agentTreeView.js.map