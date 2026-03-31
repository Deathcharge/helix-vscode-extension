"use strict";
/**
 * Helix VS Code Extension - Browser Manager
 * Controls browser automation for web interaction
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
exports.BrowserManager = void 0;
const vscode = __importStar(require("vscode"));
const events_1 = require("events");
class BrowserManager extends events_1.EventEmitter {
    constructor(context) {
        super();
        this.eventEmitter = new vscode.EventEmitter();
        this.browserConnected = false;
        this.VIEWPORT_SIZES = {
            small: { width: 900, height: 600 },
            medium: { width: 1280, height: 720 },
            large: { width: 1920, height: 1080 },
            custom: { width: 1280, height: 720 },
        };
        /**
         * Event fired when settings change
         */
        this.onDidChangeSettings = this.eventEmitter.event;
        this.context = context;
        this.settings = this.getDefaultSettings();
        this.loadSettings();
    }
    static getInstance(context) {
        if (!BrowserManager.instance) {
            if (!context) {
                throw new Error('BrowserManager requires ExtensionContext on first initialization');
            }
            BrowserManager.instance = new BrowserManager(context);
        }
        return BrowserManager.instance;
    }
    /**
     * Get default browser settings
     */
    getDefaultSettings() {
        return {
            enabled: true,
            viewportSize: 'medium',
            screenshotQuality: 75,
            remoteDebuggingPort: 9222,
            autoDiscoverChrome: true,
        };
    }
    /**
     * Load settings from storage
     */
    loadSettings() {
        try {
            const storageKey = 'browserSettings';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                this.settings = stored;
            }
        }
        catch (error) {
            console.error('Failed to load browser settings:', error);
        }
    }
    /**
     * Save settings to storage
     */
    saveSettings() {
        try {
            const storageKey = 'browserSettings';
            this.context.globalState.update(storageKey, this.settings);
            this.eventEmitter.fire(this.settings);
        }
        catch (error) {
            console.error('Failed to save browser settings:', error);
        }
    }
    /**
     * Get current browser settings
     */
    getSettings() {
        return { ...this.settings };
    }
    /**
     * Update browser settings
     */
    updateSettings(updates) {
        Object.assign(this.settings, updates);
        this.saveSettings();
    }
    /**
     * Get viewport dimensions
     */
    getViewportDimensions() {
        if (this.settings.viewportSize === 'custom') {
            // Load custom dimensions from storage if they exist
            const custom = this.context.globalState.get('customViewportDimensions');
            return custom || this.VIEWPORT_SIZES['custom'];
        }
        return this.VIEWPORT_SIZES[this.settings.viewportSize];
    }
    /**
     * Set custom viewport dimensions
     */
    setCustomViewportDimensions(dimensions) {
        this.context.globalState.update('customViewportDimensions', dimensions);
        this.updateSettings({ viewportSize: 'custom' });
    }
    /**
     * Test connection to Chrome
     */
    async testConnection() {
        try {
            const host = this.settings.remoteDebuggingHost || 'localhost';
            const port = this.settings.remoteDebuggingPort;
            // This would actually connect to Chrome's DevTools Protocol
            // For now, we'll simulate a connection test
            const connected = await this.simulateConnectionTest(host, port);
            this.browserConnected = connected;
            return connected;
        }
        catch (error) {
            console.error('Failed to test browser connection:', error);
            this.browserConnected = false;
            return false;
        }
    }
    /**
     * Simulate connection test
     */
    async simulateConnectionTest(host, port) {
        // In a real implementation, this would use Chrome DevTools Protocol
        // For now, we'll just return true to simulate a successful connection
        return new Promise(resolve => {
            setTimeout(() => resolve(true), 1000);
        });
    }
    /**
     * Execute browser action
     */
    async executeAction(action) {
        if (!this.settings.enabled) {
            return {
                success: false,
                error: 'Browser automation is disabled',
            };
        }
        if (!this.browserConnected) {
            const connected = await this.testConnection();
            if (!connected) {
                return {
                    success: false,
                    error: 'Browser not connected. Please test connection first.',
                };
            }
        }
        try {
            switch (action.type) {
                case 'navigate':
                    return await this.navigate(action.url);
                case 'click':
                    return await this.click(action.selector);
                case 'input':
                    return await this.input(action.selector, action.text);
                case 'scroll':
                    return await this.scroll(action.amount);
                case 'wait':
                    return await this.wait(action.timeout);
                case 'screenshot':
                    return await this.screenshot();
                case 'evaluate':
                    return await this.evaluate(action.code);
                default:
                    return {
                        success: false,
                        error: `Unknown action type: ${action.type}`,
                    };
            }
        }
        catch (error) {
            return {
                success: false,
                error: error.message || String(error),
            };
        }
    }
    /**
     * Navigate to URL
     */
    async navigate(url) {
        // In a real implementation, this would use Chrome DevTools Protocol
        return {
            success: true,
            result: { url },
        };
    }
    /**
     * Click element
     */
    async click(selector) {
        // In a real implementation, this would use Chrome DevTools Protocol
        return {
            success: true,
            result: { selector },
        };
    }
    /**
     * Input text into element
     */
    async input(selector, text) {
        // In a real implementation, this would use Chrome DevTools Protocol
        return {
            success: true,
            result: { selector, text },
        };
    }
    /**
     * Scroll page
     */
    async scroll(amount) {
        // In a real implementation, this would use Chrome DevTools Protocol
        return {
            success: true,
            result: { amount },
        };
    }
    /**
     * Wait for timeout
     */
    async wait(timeout) {
        await new Promise(resolve => setTimeout(resolve, timeout));
        return {
            success: true,
            result: { timeout },
        };
    }
    /**
     * Take screenshot
     */
    async screenshot() {
        // In a real implementation, this would use Chrome DevTools Protocol
        // The screenshot would be encoded as base64
        const quality = this.settings.screenshotQuality;
        const viewport = this.getViewportDimensions();
        return {
            success: true,
            result: {
                viewport,
                quality,
            },
            screenshot: 'base64_encoded_screenshot_placeholder',
        };
    }
    /**
     * Evaluate JavaScript
     */
    async evaluate(code) {
        // In a real implementation, this would use Chrome DevTools Protocol
        try {
            const result = eval(code);
            return {
                success: true,
                result,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || String(error),
            };
        }
    }
    /**
     * Execute sequence of actions
     */
    async executeActions(actions) {
        const results = [];
        for (const action of actions) {
            const result = await this.executeAction(action);
            results.push(result);
            if (!result.success) {
                break;
            }
        }
        return results;
    }
    /**
     * Discover Chrome instances
     */
    async discoverChromeInstances() {
        // In a real implementation, this would scan for Chrome processes
        // with remote debugging enabled
        // For now, return a placeholder
        return ['localhost:9222'];
    }
    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
    }
}
exports.BrowserManager = BrowserManager;
//# sourceMappingURL=BrowserManager.js.map