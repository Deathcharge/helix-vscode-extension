/**
 * Helix VS Code Extension - Notification Manager
 * Enhanced notifications with text-to-speech, sound effects, and system notifications
 */

import * as vscode from 'vscode';

export interface NotificationSettings {
  textToSpeechEnabled: boolean;
  soundEffectsEnabled: boolean;
  systemNotificationsEnabled: boolean;
  taskCompletionSound?: string;
  errorSound?: string;
  notificationThreshold: 'all' | 'important' | 'errors-only';
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  read: boolean;
  metadata?: {
    taskId?: string;
    agent?: string;
    operation?: string;
  };
}

export class NotificationManager {
  private static instance: NotificationManager;
  private context: vscode.ExtensionContext;
  private settings: NotificationSettings;
  private notifications: Notification[];
  private eventEmitter: vscode.EventEmitter<Notification[]> =
    new vscode.EventEmitter<Notification[]>();
  private unreadCount: number = 0;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.settings = this.getDefaultSettings();
    this.notifications = [];

    this.loadSettings();
    this.loadNotifications();
  }

  public static getInstance(
    context?: vscode.ExtensionContext
  ): NotificationManager {
    if (!NotificationManager.instance) {
      if (!context) {
        throw new Error(
          'NotificationManager requires ExtensionContext on first initialization'
        );
      }
      NotificationManager.instance = new NotificationManager(context);
    }
    return NotificationManager.instance;
  }

  /**
   * Get default notification settings
   */
  private getDefaultSettings(): NotificationSettings {
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
  private loadSettings(): void {
    try {
      const storageKey = 'notificationSettings';
      const stored =
        this.context.globalState.get<NotificationSettings>(storageKey);
      if (stored) {
        this.settings = stored;
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    try {
      const storageKey = 'notificationSettings';
      this.context.globalState.update(storageKey, this.settings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  /**
   * Load notifications from storage
   */
  private loadNotifications(): void {
    try {
      const storageKey = 'notifications';
      const stored = this.context.globalState.get<Notification[]>(storageKey);
      if (stored) {
        this.notifications = stored;
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  /**
   * Save notifications to storage
   */
  private saveNotifications(): void {
    try {
      const storageKey = 'notifications';
      this.context.globalState.update(storageKey, this.notifications);
      this.eventEmitter.fire(this.notifications);
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  /**
   * Update unread count
   */
  private updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  /**
   * Get current notification settings
   */
  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Update notification settings
   */
  public updateSettings(updates: Partial<NotificationSettings>): void {
    Object.assign(this.settings, updates);
    this.saveSettings();
  }

  /**
   * Send notification
   */
  public sendNotification(
    message: string,
    type: Notification['type'] = 'info',
    metadata?: Notification['metadata']
  ): void {
    // Check threshold
    if (!this.shouldNotify(type)) {
      return;
    }

    const notification: Notification = {
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
  private shouldNotify(type: Notification['type']): boolean {
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
  private showVisualNotification(notification: Notification): void {
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
  private showSystemNotification(notification: Notification): void {
    // VS Code doesn't have built-in system notifications API
    // This would need to use a Node.js notification library
    // For now, we'll just show the visual notification
  }

  /**
   * Play sound effect
   */
  private playSound(type: Notification['type']): void {
    // VS Code doesn't have built-in sound API
    // This would need to use a Node.js audio library
    // For now, this is a placeholder
    console.log(`Playing ${type} sound`);
  }

  /**
   * Speak message using text-to-speech
   */
  private speak(message: string): void {
    // VS Code doesn't have built-in TTS API
    // This would need to use a Node.js TTS library
    // For now, this is a placeholder
    console.log(`Speaking: ${message}`);
  }

  /**
   * Get all notifications
   */
  public getAllNotifications(limit?: number): Notification[] {
    const notifications = [...this.notifications];
    return limit ? notifications.slice(0, limit) : notifications;
  }

  /**
   * Get unread notifications
   */
  public getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Get unread count
   */
  public getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Mark notification as read
   */
  public markAsRead(id: string): boolean {
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
  public markAllAsRead(): void {
    this.notifications.forEach(n => (n.read = true));
    this.updateUnreadCount();
    this.saveNotifications();
  }

  /**
   * Delete notification
   */
  public deleteNotification(id: string): boolean {
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
  public clearAllNotifications(): void {
    this.notifications = [];
    this.updateUnreadCount();
    this.saveNotifications();
  }

  /**
   * Test notification
   */
  public testNotification(type: Notification['type'] = 'info'): void {
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
  public resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }

  /**
   * Event fired when notifications change
   */
  public readonly onDidChangeNotifications = this.eventEmitter.event;
}
