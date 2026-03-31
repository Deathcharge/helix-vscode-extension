"use strict";
/**
 * Helix VS Code Extension - Provider Status View
 * ================================================
 * Shows the active AI provider in the VS Code status bar and provides
 * a QuickPick dropdown listing all providers with their status.
 *
 * Polls GET /api/llm/routing/providers every 60 seconds.
 * Handles 429 (rate limited), network errors (offline), and
 * respects the `helix.providers.showActiveProviderInStatusBar` setting.
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
exports.ProviderStatusView = void 0;
exports.getProviderStatusView = getProviderStatusView;
const vscode = __importStar(require("vscode"));
// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------
let _instance;
/**
 * Return the singleton ProviderStatusView.
 * Call `activate()` once during extension activation; after that, use this
 * accessor anywhere you need a reference.
 */
function getProviderStatusView() {
    return _instance;
}
// ---------------------------------------------------------------------------
// ProviderStatusView
// ---------------------------------------------------------------------------
/** Key used to persist the user's chosen model in VS Code settings. */
const PREFERRED_MODEL_KEY = 'helix.preferredModel';
/** Key used to persist account tier (set after successful auth). */
const ACCOUNT_TIER_KEY = 'helix.accountTier';
class ProviderStatusView {
    // -----------------------------------------------------------------------
    // Construction / singleton bootstrap
    // -----------------------------------------------------------------------
    constructor() {
        this._disposables = [];
        this._isRateLimited = false;
        this._isOffline = false;
        // Priority 99 — slightly to the left of the main Helix status bar item (100)
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        this._statusBarItem.command = 'helix.showProviderPicker';
    }
    /**
     * Create and activate the singleton. Safe to call multiple times — the
     * second call is a no-op.
     */
    static activate(context) {
        if (_instance) {
            return _instance;
        }
        const view = new ProviderStatusView();
        _instance = view;
        view._context = context;
        // Register the QuickPick command (now interactive — lets user pick a model)
        context.subscriptions.push(vscode.commands.registerCommand('helix.showProviderPicker', () => {
            view._showProviderPicker();
        }), 
        // Convenience alias for command palette
        vscode.commands.registerCommand('helix.selectModel', () => {
            view._showProviderPicker();
        }));
        // Listen for configuration changes
        view._disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('helix.providers.showActiveProviderInStatusBar') ||
                e.affectsConfiguration('helix.apiEndpoint')) {
                view._onConfigChanged();
            }
        }));
        // Kick off the first fetch + polling
        view._onConfigChanged();
        context.subscriptions.push(view);
        return view;
    }
    // -----------------------------------------------------------------------
    // Disposal
    // -----------------------------------------------------------------------
    dispose() {
        this._stopPolling();
        this._statusBarItem.dispose();
        for (const d of this._disposables) {
            d.dispose();
        }
        this._disposables.length = 0;
        _instance = undefined;
    }
    // -----------------------------------------------------------------------
    // Polling lifecycle
    // -----------------------------------------------------------------------
    _startPolling() {
        this._stopPolling();
        // Fetch immediately, then every POLL_INTERVAL_MS
        void this._fetchProviders();
        this._pollTimer = setInterval(() => {
            void this._fetchProviders();
        }, ProviderStatusView.POLL_INTERVAL_MS);
    }
    _stopPolling() {
        if (this._pollTimer !== undefined) {
            clearInterval(this._pollTimer);
            this._pollTimer = undefined;
        }
    }
    _onConfigChanged() {
        const config = vscode.workspace.getConfiguration('helix');
        const enabled = config.get('providers.showActiveProviderInStatusBar', true);
        if (enabled) {
            this._startPolling();
        }
        else {
            this._stopPolling();
            this._statusBarItem.hide();
        }
    }
    // -----------------------------------------------------------------------
    // API fetch
    // -----------------------------------------------------------------------
    async _fetchProviders() {
        const config = vscode.workspace.getConfiguration('helix');
        const baseUrl = config.get('apiEndpoint', 'http://localhost:8000');
        const url = `${baseUrl}/api/llm/routing/providers`;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Helix-VSCode-Extension/1.0.0',
                    'X-Helix-Platform': 'vscode_copilot',
                },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (response.status === 429) {
                this._isRateLimited = true;
                this._isOffline = false;
                this._updateStatusBar();
                return;
            }
            if (!response.ok) {
                console.warn(`ProviderStatusView: API returned ${response.status} ${response.statusText}`);
                this._isOffline = true;
                this._isRateLimited = false;
                this._updateStatusBar();
                return;
            }
            const data = (await response.json());
            this._lastResponse = data;
            this._isRateLimited = false;
            this._isOffline = false;
            this._updateStatusBar();
        }
        catch (err) {
            // Network error or timeout — mark offline
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`ProviderStatusView: fetch failed — ${message}`);
            this._isOffline = true;
            this._isRateLimited = false;
            this._updateStatusBar();
        }
    }
    // -----------------------------------------------------------------------
    // Status bar rendering
    // -----------------------------------------------------------------------
    _updateStatusBar() {
        if (this._isRateLimited) {
            this._statusBarItem.text = '$(warning) Helix: Rate limited';
            this._statusBarItem.tooltip =
                'API rate limited — consider upgrading your plan';
            this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this._statusBarItem.show();
            return;
        }
        if (this._isOffline) {
            this._statusBarItem.text = '$(cloud-offline) Helix: Offline';
            this._statusBarItem.tooltip = 'Cannot reach the Helix API';
            this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this._statusBarItem.show();
            return;
        }
        if (!this._lastResponse) {
            this._statusBarItem.text = '$(loading~spin) Helix: Connecting...';
            this._statusBarItem.tooltip = 'Fetching provider status...';
            this._statusBarItem.backgroundColor = undefined;
            this._statusBarItem.show();
            return;
        }
        const tier = this._context?.globalState.get(ACCOUNT_TIER_KEY);
        const tierLabel = tier ? ` · ${tier.toUpperCase()}` : '';
        // Show user-pinned model if set, otherwise show the auto-resolved one
        const pinnedModel = vscode.workspace
            .getConfiguration('helix')
            .get('preferredModel');
        const active = this._resolveActiveProvider(this._lastResponse);
        if (pinnedModel) {
            this._statusBarItem.text = `$(robot) Helix${tierLabel} · ${pinnedModel}`;
            this._statusBarItem.tooltip = `Selected model: ${pinnedModel}\nClick to change model${active ? `\nAuto-route: ${active.display_name}` : ''}`;
            this._statusBarItem.backgroundColor = undefined;
        }
        else if (active) {
            const modelName = active.models[0]?.model ?? 'auto';
            this._statusBarItem.text = `$(cloud) Helix${tierLabel} · ${active.display_name} (${modelName})`;
            this._statusBarItem.tooltip = `${this._buildTooltip(active)}\nClick to pin a specific model`;
            this._statusBarItem.backgroundColor = undefined;
        }
        else {
            this._statusBarItem.text = '$(error) Helix: No providers';
            this._statusBarItem.tooltip = 'No LLM providers are currently available';
            this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
        this._statusBarItem.show();
    }
    /**
     * Called by AuthService after successful login to show tier in status bar.
     */
    static setAccountTier(context, tier) {
        void context.globalState.update(ACCOUNT_TIER_KEY, tier);
        _instance?._updateStatusBar();
    }
    /**
     * Resolve the first available provider from the free_tier_chain.
     * Falls back to the primary_provider if no free-tier provider is available.
     */
    _resolveActiveProvider(resp) {
        const providerMap = new Map();
        for (const p of resp.providers) {
            providerMap.set(p.provider, p);
        }
        // Walk the free_tier_chain and return the first available provider
        for (const key of resp.free_tier_chain) {
            const p = providerMap.get(key);
            if (p && p.available && p.circuit_state !== 'open') {
                return p;
            }
        }
        // Fallback: try primary_provider
        const primary = providerMap.get(resp.primary_provider);
        if (primary && primary.available) {
            return primary;
        }
        // Last resort: any available provider
        return resp.providers.find(p => p.available);
    }
    _buildTooltip(provider) {
        const lines = [
            `Provider: ${provider.display_name}`,
            `Cost tier: ${provider.cost_tier}`,
            `Circuit: ${provider.circuit_state}`,
            `RPM: ${provider.current_rpm}/${provider.rpm_limit}`,
            `Latency: ${provider.avg_latency_ms}ms`,
        ];
        if (provider.models.length > 0) {
            lines.push(`Models: ${provider.models.map(m => m.model).join(', ')}`);
        }
        return lines.join('\n');
    }
    // -----------------------------------------------------------------------
    // QuickPick
    // -----------------------------------------------------------------------
    async _showProviderPicker() {
        if (!this._lastResponse) {
            vscode.window.showWarningMessage('Provider status not yet available. Ensure the Helix API is reachable.');
            return;
        }
        const currentModel = vscode.workspace
            .getConfiguration('helix')
            .get('preferredModel', '');
        const items = [];
        // "Auto" option first
        items.push({
            label: currentModel === ''
                ? '$(check) Auto (backend routes best model)'
                : '$(cloud) Auto (backend routes best model)',
            description: 'Let Helix pick the best available model automatically',
            modelId: '',
        });
        items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
        for (const p of this._lastResponse.providers) {
            if (!p.available || p.models.length === 0)
                continue;
            const statusIcon = p.circuit_state === 'open' ? '$(error)' : '$(check)';
            items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator,
            });
            // Provider header row (not selectable as a model)
            items.push({
                label: `${statusIcon} ${p.display_name}`,
                description: `${p.cost_tier} · ${p.avg_latency_ms}ms avg`,
                kind: vscode.QuickPickItemKind.Separator,
            });
            for (const m of p.models) {
                const isCurrent = m.model === currentModel;
                items.push({
                    label: `  ${isCurrent ? '$(check) ' : ''}${m.model}`,
                    description: isCurrent ? 'currently selected' : p.display_name,
                    modelId: m.model,
                });
            }
        }
        // Routing info at the bottom
        items.push({ label: '', kind: vscode.QuickPickItemKind.Separator }, {
            label: '$(settings) Open Helix Settings',
            description: 'Configure API endpoint, tier, and more',
            modelId: '__settings__',
        });
        const picked = await vscode.window.showQuickPick(items, {
            title: 'Helix — Select Model',
            placeHolder: currentModel
                ? `Current: ${currentModel}`
                : 'Auto-routing active · pick a model to pin',
            matchOnDescription: true,
        });
        if (!picked || picked.modelId === undefined)
            return;
        if (picked.modelId === '__settings__') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'helix');
            return;
        }
        // Save to settings and refresh status bar
        await vscode.workspace.getConfiguration('helix').update('preferredModel', picked.modelId || undefined, // undefined removes the setting (= auto)
        vscode.ConfigurationTarget.Global);
        this._updateStatusBar();
        const label = picked.modelId
            ? `Helix will now use ${picked.modelId} for all requests.`
            : 'Helix is back to auto-routing — best available model will be used.';
        vscode.window.showInformationMessage(label);
    }
}
exports.ProviderStatusView = ProviderStatusView;
/** How often to poll the backend (ms). */
ProviderStatusView.POLL_INTERVAL_MS = 60000;
//# sourceMappingURL=ProviderStatusView.js.map