"use strict";
/**
 * Helix VS Code Extension - Notification Manager
 * Enhanced notifications with text-to-speech, sound effects, and system notifications
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
exports.NotificationManager = void 0;
const vscode = __importStar(require("vscode"));
class NotificationManager {
    constructor(context) {
        this.eventEmitter = new vscode.EventEmitter();
        this.unreadCount = 0;
        /**
         * Event fired when notifications change
         */
        this.onDidChangeNotifications = this.eventEmitter.event;
        this.context = context;
        this.settings = this.getDefaultSettings();
        this.notifications = [];
        this.loadSettings();
        this.loadNotifications();
    }
    static getInstance(context) {
        if (!NotificationManager.instance) {
            if (!context) {
                throw new Error('NotificationManager requires ExtensionContext on first initialization');
            }
            NotificationManager.instance = new NotificationManager(context);
        }
        return NotificationManager.instance;
    }
    /**
     * Get default notification settings
     */
    getDefaultSettings() {
        return {
            textToSpeechEnabled: false,
            soundEffectsEnabled: false,
            systemNotificationsEnabled: true,
            notificationThreshold: 'important',
        };
    }
    /**
     * Load settings from storage
     */
    loadSettings() {
        try {
            const storageKey = 'notificationSettings';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                this.settings = stored;
            }
        }
        catch (error) {
            console.error('Failed to load notification settings:', error);
        }
    }
    /**
     * Save settings to storage
     */
    saveSettings() {
        try {
            const storageKey = 'notificationSettings';
            this.context.globalState.update(storageKey, this.settings);
        }
        catch (error) {
            console.error('Failed to save notification settings:', error);
        }
    }
    /**
     * Load notifications from storage
     */
    loadNotifications() {
        try {
            const storageKey = 'notifications';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                this.notifications = stored;
                this.updateUnreadCount();
            }
        }
        catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }
    /**
     * Save notifications to storage
     */
    saveNotifications() {
        try {
            const storageKey = 'notifications';
            this.context.globalState.update(storageKey, this.notifications);
            this.eventEmitter.fire(this.notifications);
        }
        catch (error) {
            console.error('Failed to save notifications:', error);
        }
    }
    /**
     * Update unread count
     */
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
    }
    /**
     * Get current notification settings
     */
    getSettings() {
        return { ...this.settings };
    }
    /**
     * Update notification settings
     */
    updateSettings(updates) {
        Object.assign(this.settings, updates);
        this.saveSettings();
    }
    /**
     * Send notification
     */
    sendNotification(message, type = 'info', metadata) {
        // Check threshold
        if (!this.shouldNotify(type)) {
            return;
        }
        const notification = {
            id: `notification-${Date.now()}`,
            type,
            message,
            timestamp: new Date(),
            read: false,
            metadata,
        };
        this.notifications.unshift(notification);
        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        this.updateUnreadCount();
        this.saveNotifications();
        // Show visual notification
        this.showVisualNotification(notification);
        // Play sound if enabled
        if (this.settings.soundEffectsEnabled) {
            this.playSound(type);
        }
        // Use text-to-speech if enabled
        if (this.settings.textToSpeechEnabled) {
            this.speak(message);
        }
        // Show system notification if enabled
        if (this.settings.systemNotificationsEnabled) {
            this.showSystemNotification(notification);
        }
    }
    /**
     * Check if notification should be sent based on threshold
     */
    shouldNotify(type) {
        switch (this.settings.notificationThreshold) {
            case 'all':
                return true;
            case 'important':
                return type === 'warning' || type === 'error' || type === 'success';
            case 'errors-only':
                return type === 'error';
            default:
                return true;
        }
    }
    /**
     * Show visual notification in VS Code
     */
    showVisualNotification(notification) {
        switch (notification.type) {
            case 'info':
                vscode.window.showInformationMessage(notification.message);
                break;
            case 'warning':
                vscode.window.showWarningMessage(notification.message);
                break;
            case 'error':
                vscode.window.showErrorMessage(notification.message);
                break;
            case 'success':
                vscode.window.showInformationMessage(`✓ ${notification.message}`);
                break;
        }
    }
    /**
     * Show system notification
     */
    showSystemNotification(notification) {
        // VS Code doesn't have built-in system notifications API
        // This would need to use a Node.js notification library
        // For now, we'll just show the visual notification
    }
    /**
     * Play sound effect
     */
    playSound(type) {
        // VS Code doesn't have built-in sound API
        // This would need to use a Node.js audio library
        // For now, this is a placeholder
        console.log(`Playing ${type} sound`);
    }
    /**
     * Speak message using text-to-speech
     */
    speak(message) {
        // VS Code doesn't have built-in TTS API
        // This would need to use a Node.js TTS library
        // For now, this is a placeholder
        console.log(`Speaking: ${message}`);
    }
    /**
     * Get all notifications
     */
    getAllNotifications(limit) {
        const notifications = [...this.notifications];
        return limit ? notifications.slice(0, limit) : notifications;
    }
    /**
     * Get unread notifications
     */
    getUnreadNotifications() {
        return this.notifications.filter(n => !n.read);
    }
    /**
     * Get unread count
     */
    getUnreadCount() {
        return this.unreadCount;
    }
    /**
     * Mark notification as read
     */
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateUnreadCount();
            this.saveNotifications();
            return true;
        }
        return false;
    }
    /**
     * Mark all notifications as read
     */
    markAllAsRead() {
        this.notifications.forEach(n => (n.read = true));
        this.updateUnreadCount();
        this.saveNotifications();
    }
    /**
     * Delete notification
     */
    deleteNotification(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications.splice(index, 1);
            this.updateUnreadCount();
            this.saveNotifications();
            return true;
        }
        return false;
    }
    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        this.notifications = [];
        this.updateUnreadCount();
        this.saveNotifications();
    }
    /**
     * Test notification
     */
    testNotification(type = 'info') {
        const messages = {
            info: 'This is a test information notification',
            warning: 'This is a test warning notification',
            error: 'This is a test error notification',
            success: 'This is a test success notification',
        };
        this.sendNotification(messages[type], type);
    }
    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
    }
}
exports.NotificationManager = NotificationManager;
//# sourceMappingURL=NotificationManager.js.map