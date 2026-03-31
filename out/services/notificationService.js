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
exports.notificationService = exports.NotificationService = void 0;
const vscode = __importStar(require("vscode"));
class NotificationService {
    constructor() {
        this.lastNotificationTime = 0;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'helix.showAgentPanel';
    }
    /**
     * Shows a notification to the user
     */
    showNotification(options) {
        const now = Date.now();
        // Throttle notifications to prevent spam
        if (now - this.lastNotificationTime < 1000) {
            return;
        }
        this.lastNotificationTime = now;
        switch (options.type) {
            case 'info':
                vscode.window.showInformationMessage(options.message, ...this.getActionTitles(options.actions));
                break;
            case 'warning':
                vscode.window.showWarningMessage(options.message, ...this.getActionTitles(options.actions));
                break;
            case 'error':
                vscode.window.showErrorMessage(options.message, ...this.getActionTitles(options.actions));
                break;
            case 'success':
                vscode.window.showInformationMessage(`✅ ${options.message}`, ...this.getActionTitles(options.actions));
                break;
        }
        // Handle actions
        if (options.actions) {
            this.handleActions(options.actions);
        }
        // Update status bar if requested
        if (options.showInStatusBar) {
            this.updateStatusBar(options.statusBarItemText || options.message, options.type);
        }
    }
    /**
     * Shows a progress notification
     */
    async showProgress(title, task) {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: title,
            cancellable: true,
        }, task);
    }
    /**
     * Shows a quick pick selection
     */
    async showQuickPick(items, options = {}) {
        if (Array.isArray(items) &&
            items.length > 0 &&
            typeof items[0] === 'string') {
            return vscode.window.showQuickPick(items, options);
        }
        else {
            return vscode.window.showQuickPick(items, options);
        }
    }
    /**
     * Shows an input box
     */
    async showInputBox(options = {}) {
        return vscode.window.showInputBox(options);
    }
    /**
     * Shows a confirmation dialog
     */
    async showConfirmation(message, confirmText = 'Yes', cancelText = 'No') {
        const result = await vscode.window.showInformationMessage(message, { modal: true }, confirmText, cancelText);
        return result === confirmText;
    }
    /**
     * Updates the status bar with a message
     */
    updateStatusBar(text, type = 'info') {
        const icon = this.getStatusBarIcon(type);
        this.statusBarItem.text = `${icon} ${text}`;
        this.statusBarItem.show();
    }
    /**
     * Hides the status bar
     */
    hideStatusBar() {
        this.statusBarItem.hide();
    }
    /**
     * Clears all notifications
     */
    clear() {
        this.hideStatusBar();
    }
    /**
     * Gets the status bar icon for a notification type
     */
    getStatusBarIcon(type) {
        switch (type) {
            case 'info':
                return '$(info)';
            case 'warning':
                return '$(warning)';
            case 'error':
                return '$(error)';
            case 'success':
                return '$(check)';
            default:
                return '$(circle)';
        }
    }
    /**
     * Gets action titles from action objects
     */
    getActionTitles(actions) {
        return actions ? actions.map(action => action.title) : [];
    }
    /**
     * Handles notification actions
     */
    handleActions(actions) {
        // Actions are handled by VSCode automatically when clicked
        // This method can be extended for custom action handling
    }
    /**
     * Disposes of the notification service
     */
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.NotificationService = NotificationService;
// Global notification service instance
exports.notificationService = new NotificationService();
//# sourceMappingURL=notificationService.js.map