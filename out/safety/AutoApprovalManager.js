"use strict";
/**
 * Helix VS Code Extension - Auto Approval Manager
 * Granular control over auto-approval for different operations
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
exports.AutoApprovalManager = exports.AutoApproveOperation = void 0;
const vscode = __importStar(require("vscode"));
var AutoApproveOperation;
(function (AutoApproveOperation) {
    AutoApproveOperation["Read"] = "read";
    AutoApproveOperation["Write"] = "write";
    AutoApproveOperation["Delete"] = "delete";
    AutoApproveOperation["Execute"] = "execute";
    AutoApproveOperation["Browser"] = "browser";
    AutoApproveOperation["MCP"] = "mcp";
    AutoApproveOperation["Mode"] = "mode";
    AutoApproveOperation["Subtasks"] = "subtasks";
})(AutoApproveOperation || (exports.AutoApproveOperation = AutoApproveOperation = {}));
class AutoApprovalManager {
    constructor(context) {
        this.eventEmitter = new vscode.EventEmitter();
        /**
         * Event fired when settings change
         */
        this.onDidChangeSettings = this.eventEmitter.event;
        this.context = context;
        this.operationCounts = new Map();
        this.settings = this.getDefaultSettings();
        this.loadSettings();
        this.initializeOperationCounts();
    }
    static getInstance(context) {
        if (!AutoApprovalManager.instance) {
            if (!context) {
                throw new Error('AutoApprovalManager requires ExtensionContext on first initialization');
            }
            AutoApprovalManager.instance = new AutoApprovalManager(context);
        }
        return AutoApprovalManager.instance;
    }
    /**
     * Get default auto-approve settings
     */
    getDefaultSettings() {
        return {
            enabled: false,
            yoloMode: false,
            operations: new Map([
                [AutoApproveOperation.Read, false],
                [AutoApproveOperation.Write, false],
                [AutoApproveOperation.Delete, false],
                [AutoApproveOperation.Execute, false],
                [AutoApproveOperation.Browser, false],
                [AutoApproveOperation.MCP, false],
                [AutoApproveOperation.Mode, false],
                [AutoApproveOperation.Subtasks, false],
            ]),
            allowCommands: [],
            denyCommands: [],
            safetyGatekeeperEnabled: false,
        };
    }
    /**
     * Load settings from storage
     */
    loadSettings() {
        try {
            const storageKey = 'autoApprovalSettings';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                this.settings = this.deserializeSettings(stored);
            }
        }
        catch (error) {
            console.error('Failed to load auto-approval settings:', error);
        }
    }
    /**
     * Save settings to storage
     */
    saveSettings() {
        try {
            const storageKey = 'autoApprovalSettings';
            this.context.globalState.update(storageKey, this.serializeSettings(this.settings));
            this.eventEmitter.fire(this.settings);
        }
        catch (error) {
            console.error('Failed to save auto-approval settings:', error);
        }
    }
    /**
     * Serialize settings for storage
     */
    serializeSettings(settings) {
        return {
            enabled: settings.enabled,
            yoloMode: settings.yoloMode,
            operations: Object.fromEntries(settings.operations),
            maxCount: Object.fromEntries(settings.maxCount || []),
            maxCost: Object.fromEntries(settings.maxCost || []),
            allowCommands: settings.allowCommands,
            denyCommands: settings.denyCommands,
            safetyGatekeeperEnabled: settings.safetyGatekeeperEnabled,
            safetyGatekeeperModel: settings.safetyGatekeeperModel,
        };
    }
    /**
     * Deserialize settings from storage
     */
    deserializeSettings(data) {
        return {
            enabled: data.enabled || false,
            yoloMode: data.yoloMode || false,
            operations: new Map(Object.entries(data.operations || {})),
            maxCount: data.maxCount
                ? new Map(Object.entries(data.maxCount))
                : undefined,
            maxCost: data.maxCost
                ? new Map(Object.entries(data.maxCost))
                : undefined,
            allowCommands: data.allowCommands || [],
            denyCommands: data.denyCommands || [],
            safetyGatekeeperEnabled: data.safetyGatekeeperEnabled || false,
            safetyGatekeeperModel: data.safetyGatekeeperModel,
        };
    }
    /**
     * Initialize operation counts
     */
    initializeOperationCounts() {
        Object.values(AutoApproveOperation).forEach(op => {
            this.operationCounts.set(op, 0);
        });
    }
    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }
    /**
     * Update settings
     */
    updateSettings(updates) {
        if (updates.operations) {
            this.settings.operations = new Map([
                ...this.settings.operations,
                ...updates.operations,
            ]);
        }
        if (updates.maxCount) {
            this.settings.maxCount = new Map([
                ...(this.settings.maxCount || new Map()),
                ...updates.maxCount,
            ]);
        }
        if (updates.maxCost) {
            this.settings.maxCost = new Map([
                ...(this.settings.maxCost || new Map()),
                ...updates.maxCost,
            ]);
        }
        Object.assign(this.settings, updates);
        this.saveSettings();
    }
    /**
     * Check if operation should be auto-approved
     */
    async shouldAutoApprove(context) {
        // YOLO mode approves everything
        if (this.settings.yoloMode) {
            return true;
        }
        // If auto-approve is disabled, require manual approval
        if (!this.settings.enabled) {
            return false;
        }
        // Check if operation type is enabled for auto-approve
        const operationEnabled = this.settings.operations.get(context.operation);
        if (!operationEnabled) {
            return false;
        }
        // Check command allow/deny lists for execute operations
        if (context.operation === AutoApproveOperation.Execute && context.command) {
            if (!this.isCommandAllowed(context.command)) {
                return false;
            }
        }
        // Check max count limit
        const maxCount = this.settings.maxCount?.get(context.operation);
        if (maxCount !== undefined) {
            const currentCount = this.operationCounts.get(context.operation) || 0;
            if (currentCount >= maxCount) {
                return false;
            }
        }
        // Check max cost limit
        if (context.estimatedCost !== undefined) {
            const maxCost = this.settings.maxCost?.get(context.operation);
            if (maxCost !== undefined && context.estimatedCost > maxCost) {
                return false;
            }
        }
        // If safety gatekeeper is enabled, run it
        if (this.settings.safetyGatekeeperEnabled) {
            return await this.runSafetyGatekeeper(context);
        }
        // Increment operation count
        this.incrementOperationCount(context.operation);
        return true;
    }
    /**
     * Check if command is allowed
     */
    isCommandAllowed(command) {
        // Check deny list first (longest match wins)
        const denied = this.settings.denyCommands.some(pattern => {
            if (pattern === '*')
                return true;
            return command.startsWith(pattern);
        });
        if (denied) {
            return false;
        }
        // If allow list is empty, allow all
        if (this.settings.allowCommands.length === 0) {
            return true;
        }
        // Check allow list
        const allowed = this.settings.allowCommands.some(pattern => {
            if (pattern === '*')
                return true;
            return command.startsWith(pattern);
        });
        return allowed;
    }
    /**
     * Run safety gatekeeper to evaluate operation safety.
     *
     * Computes a risk score from operation type, file-path sensitivity,
     * and command dangerousness.  Operations that score at or above
     * RISK_THRESHOLD are denied.  Lower-risk operations are approved
     * and their count is incremented.
     */
    async runSafetyGatekeeper(context) {
        let riskScore = AutoApprovalManager.OPERATION_BASE_RISK[context.operation] ?? 5;
        // --- File-path sensitivity check ---
        if (context.filePath) {
            const isSensitive = AutoApprovalManager.SENSITIVE_PATH_PATTERNS.some(p => p.test(context.filePath));
            if (isSensitive) {
                // Sensitive file paths push risk up significantly
                riskScore = Math.max(riskScore + 3, AutoApprovalManager.RISK_THRESHOLD);
            }
        }
        // --- Dangerous command check ---
        if (context.command) {
            const isDangerous = AutoApprovalManager.DANGEROUS_COMMAND_PATTERNS.some(p => p.test(context.command));
            if (isDangerous) {
                riskScore = Math.max(riskScore + 3, AutoApprovalManager.RISK_THRESHOLD);
            }
        }
        // --- High estimated cost check ---
        if (context.estimatedCost !== undefined && context.estimatedCost > 1.0) {
            riskScore += 2;
        }
        // Deny if risk exceeds threshold
        if (riskScore >= AutoApprovalManager.RISK_THRESHOLD) {
            console.warn(`[Helix Safety] Denied auto-approval: op=${context.operation} risk=${riskScore} ` +
                `file=${context.filePath ?? 'n/a'} cmd=${context.command ?? 'n/a'}`);
            return false;
        }
        // Approved — increment counter
        this.incrementOperationCount(context.operation);
        return true;
    }
    /**
     * Increment operation count
     */
    incrementOperationCount(operation) {
        const current = this.operationCounts.get(operation) || 0;
        this.operationCounts.set(operation, current + 1);
    }
    /**
     * Reset operation counts
     */
    resetOperationCounts() {
        this.initializeOperationCounts();
    }
    /**
     * Get operation counts
     */
    getOperationCounts() {
        return new Map(this.operationCounts);
    }
    /**
     * Add allowed command prefix
     */
    addAllowedCommand(pattern) {
        if (!this.settings.allowCommands.includes(pattern)) {
            this.settings.allowCommands.push(pattern);
            this.saveSettings();
        }
    }
    /**
     * Remove allowed command prefix
     */
    removeAllowedCommand(pattern) {
        this.settings.allowCommands = this.settings.allowCommands.filter(p => p !== pattern);
        this.saveSettings();
    }
    /**
     * Add denied command prefix
     */
    addDeniedCommand(pattern) {
        if (!this.settings.denyCommands.includes(pattern)) {
            this.settings.denyCommands.push(pattern);
            this.saveSettings();
        }
    }
    /**
     * Remove denied command prefix
     */
    removeDeniedCommand(pattern) {
        this.settings.denyCommands = this.settings.denyCommands.filter(p => p !== pattern);
        this.saveSettings();
    }
    /**
     * Enable YOLO mode (with warning)
     */
    async enableYoloMode() {
        const warning = '⚡ YOLO Mode is active - all operations will be automatically approved without confirmation.\n\n' +
            'This includes file modifications, command execution, MCP tools, browser actions, and all other operations.\n' +
            'Use with extreme caution!';
        const result = await vscode.window.showWarningMessage(warning, 'Enable YOLO Mode', 'Cancel');
        if (result === 'Enable YOLO Mode') {
            this.settings.yoloMode = true;
            this.settings.enabled = true;
            this.saveSettings();
            vscode.window.showInformationMessage('YOLO Mode enabled. Be careful!');
            return true;
        }
        return false;
    }
    /**
     * Disable YOLO mode
     */
    disableYoloMode() {
        this.settings.yoloMode = false;
        this.saveSettings();
    }
    /**
     * Set max count for operation
     */
    setMaxCount(operation, count) {
        if (!this.settings.maxCount) {
            this.settings.maxCount = new Map();
        }
        this.settings.maxCount.set(operation, count);
        this.saveSettings();
    }
    /**
     * Set max cost for operation
     */
    setMaxCost(operation, cost) {
        if (!this.settings.maxCost) {
            this.settings.maxCost = new Map();
        }
        this.settings.maxCost.set(operation, cost);
        this.saveSettings();
    }
    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.settings = this.getDefaultSettings();
        this.resetOperationCounts();
        this.saveSettings();
    }
}
exports.AutoApprovalManager = AutoApprovalManager;
/** File path patterns that indicate sensitive/credential files */
AutoApprovalManager.SENSITIVE_PATH_PATTERNS = [
    /\.env($|\.)/i,
    /credentials/i,
    /secrets?[/\\]/i,
    /\.ssh[/\\]/i,
    /\.aws[/\\]/i,
    /\.gnupg[/\\]/i,
    /id_rsa/i,
    /\.pem$/i,
    /\.key$/i,
    /\.p12$/i,
    /\.pfx$/i,
    /\.keystore$/i,
    /password/i,
    /[/\\]\.git[/\\]config$/i,
    /settings\.local\.json$/i,
];
/** Command patterns considered dangerous for auto-execution */
AutoApprovalManager.DANGEROUS_COMMAND_PATTERNS = [
    /\brm\s+(-[a-z]*f|-[a-z]*r){1,2}\s+[/\\]/i,
    /\bformat\b/i,
    /\bdiskpart\b/i,
    /\bmkfs\b/i,
    /\bdd\s+if=/i,
    /\bchmod\s+777\b/i,
    /\bcurl\b.*\|\s*(bash|sh)\b/i,
    /\bwget\b.*\|\s*(bash|sh)\b/i,
    /\bpowershell\b.*-enc/i,
    /\b(kill|pkill|killall)\s+-9\b/i,
    /\bgit\s+push\s+.*--force\b/i,
    /\bgit\s+reset\s+--hard\b/i,
    />\s*\/dev\/sd[a-z]/i,
    /\bdrop\s+(database|table)\b/i,
    /\btruncate\s+table\b/i,
];
/** Base risk scores per operation type (0-10 scale) */
AutoApprovalManager.OPERATION_BASE_RISK = {
    [AutoApproveOperation.Read]: 1,
    [AutoApproveOperation.Mode]: 2,
    [AutoApproveOperation.Subtasks]: 2,
    [AutoApproveOperation.Browser]: 4,
    [AutoApproveOperation.MCP]: 5,
    [AutoApproveOperation.Write]: 5,
    [AutoApproveOperation.Execute]: 7,
    [AutoApproveOperation.Delete]: 8,
};
/** Risk threshold — operations scoring at or above this value are denied */
AutoApprovalManager.RISK_THRESHOLD = 8;
//# sourceMappingURL=AutoApprovalManager.js.map