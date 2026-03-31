"use strict";
/**
 * Helix VS Code Extension - Display Manager
 * Controls display settings for UI elements (thinking blocks, timeline, cost tracking)
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
exports.DisplayManager = void 0;
const vscode = __importStar(require("vscode"));
class DisplayManager {
    constructor(context) {
        this.eventEmitter = new vscode.EventEmitter();
        /**
         * Event fired when settings change
         */
        this.onDidChangeSettings = this.eventEmitter.event;
        this.context = context;
        this.settings = this.getDefaultSettings();
        this.loadSettings();
    }
    static getInstance(context) {
        if (!DisplayManager.instance) {
            if (!context) {
                throw new Error('DisplayManager requires ExtensionContext on first initialization');
            }
            DisplayManager.instance = new DisplayManager(context);
        }
        return DisplayManager.instance;
    }
    /**
     * Get default display settings
     */
    getDefaultSettings() {
        return {
            collapseThinkingBlocks: true,
            showVisualTimeline: true,
            showTimestamps: false,
            showDiffStatistics: true,
            sendOnEnter: true,
            hideCostBelowThreshold: 0,
        };
    }
    /**
     * Load settings from storage
     */
    loadSettings() {
        try {
            const storageKey = 'displaySettings';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                this.settings = stored;
            }
        }
        catch (error) {
            console.error('Failed to load display settings:', error);
        }
    }
    /**
     * Save settings to storage
     */
    saveSettings() {
        try {
            const storageKey = 'displaySettings';
            this.context.globalState.update(storageKey, this.settings);
            this.eventEmitter.fire(this.settings);
        }
        catch (error) {
            console.error('Failed to save display settings:', error);
        }
    }
    /**
     * Get current display settings
     */
    getSettings() {
        return { ...this.settings };
    }
    /**
     * Update display settings
     */
    updateSettings(updates) {
        Object.assign(this.settings, updates);
        this.saveSettings();
    }
    /**
     * Check if thinking blocks should be collapsed
     */
    shouldCollapseThinkingBlocks() {
        return this.settings.collapseThinkingBlocks;
    }
    /**
     * Toggle thinking block collapse
     */
    toggleThinkingBlocks() {
        this.settings.collapseThinkingBlocks =
            !this.settings.collapseThinkingBlocks;
        this.saveSettings();
    }
    /**
     * Check if visual timeline should be shown
     */
    shouldShowVisualTimeline() {
        return this.settings.showVisualTimeline;
    }
    /**
     * Toggle visual timeline
     */
    toggleVisualTimeline() {
        this.settings.showVisualTimeline = !this.settings.showVisualTimeline;
        this.saveSettings();
    }
    /**
     * Check if timestamps should be shown
     */
    shouldShowTimestamps() {
        return this.settings.showTimestamps;
    }
    /**
     * Toggle timestamps
     */
    toggleTimestamps() {
        this.settings.showTimestamps = !this.settings.showTimestamps;
        this.saveSettings();
    }
    /**
     * Check if diff statistics should be shown
     */
    shouldShowDiffStatistics() {
        return this.settings.showDiffStatistics;
    }
    /**
     * Toggle diff statistics
     */
    toggleDiffStatistics() {
        this.settings.showDiffStatistics = !this.settings.showDiffStatistics;
        this.saveSettings();
    }
    /**
     * Check if Enter sends message
     */
    shouldSendOnEnter() {
        return this.settings.sendOnEnter;
    }
    /**
     * Toggle send on Enter
     */
    toggleSendOnEnter() {
        this.settings.sendOnEnter = !this.settings.sendOnEnter;
        this.saveSettings();
    }
    /**
     * Set cost threshold
     */
    setCostThreshold(threshold) {
        this.settings.hideCostBelowThreshold = threshold;
        this.saveSettings();
    }
    /**
     * Check if cost should be hidden
     */
    shouldHideCost(cost) {
        return cost < this.settings.hideCostBelowThreshold;
    }
    /**
     * Format cost for display
     */
    formatCost(cost) {
        if (cost === 0) {
            return '$0.00';
        }
        // Hide cost below threshold
        if (this.shouldHideCost(cost)) {
            return '';
        }
        return `$${cost.toFixed(4)}`;
    }
    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        // Less than a minute
        if (diff < 60000) {
            return 'Just now';
        }
        // Less than an hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }
        // Less than a day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        // Otherwise show date
        return timestamp.toLocaleDateString();
    }
    /**
     * Format diff statistics for display
     */
    formatDiffStatistics(linesAdded, linesRemoved) {
        const added = linesAdded > 0 ? `+${linesAdded}` : '0';
        const removed = linesRemoved > 0 ? `-${linesRemoved}` : '0';
        return `${added}, ${removed}`;
    }
    /**
     * Get color for message type (for timeline visualization)
     */
    getMessageTypeColor(type) {
        const colors = {
            user: '#4ec9b0', // Teal
            assistant: '#569cd6', // Blue
            system: '#808080', // Gray
            error: '#f44747', // Red
            thinking: '#c586c0', // Purple
        };
        return colors[type];
    }
    /**
     * Format message for timeline display
     */
    formatTimelineMessage(message) {
        const timestamp = this.formatTimestamp(message.timestamp);
        const typeColor = this.getMessageTypeColor(message.type);
        let preview = message.content;
        if (preview.length > 50) {
            preview = preview.substring(0, 50) + '...';
        }
        let metadata = '';
        if (message.metadata?.cost) {
            metadata += ` | Cost: ${this.formatCost(message.metadata.cost)}`;
        }
        if (message.metadata?.linesAdded !== undefined ||
            message.metadata?.linesRemoved !== undefined) {
            metadata += ` | ${this.formatDiffStatistics(message.metadata.linesAdded || 0, message.metadata.linesRemoved || 0)}`;
        }
        if (message.metadata?.agent) {
            metadata += ` | ${message.metadata.agent}`;
        }
        return `[${timestamp}] ${message.type}: ${preview}${metadata}`;
    }
    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
    }
}
exports.DisplayManager = DisplayManager;
//# sourceMappingURL=DisplayManager.js.map