import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  sound: boolean;
  timeout: number;
  showInStatusBar: boolean;
}

export interface NotificationChannel {
  type: 'vscode' | 'slack' | 'discord' | 'email';
  enabled: boolean;
  config: {
    webhookUrl?: string;
    apiKey?: string;
    email?: string;
    channel?: string;
  };
}

export interface HelixNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  category: string;
  actionable: boolean;
  actions?: NotificationAction[];
  persistent: boolean;
  read: boolean;
}

export interface NotificationAction {
  label: string;
  command: string;
  args?: any[];
}

export interface NotificationHistory {
  notifications: HelixNotification[];
  lastCleared: Date;
  totalNotifications: number;
  unreadCount: number;
}

export class NotificationManager {
  private config: NotificationConfig;
  private notifications: HelixNotification[] = [];
  private history: NotificationHistory;
  private disposables: vscode.Disposable[] = [];
  private statusBarItem: vscode.StatusBarItem;
  private isInitialized: boolean = false;

  constructor() {
    this.config = this.loadConfig();
    this.history = this.loadHistory();
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'helix.showNotifications';
    this.setupEventListeners();
  }

  /**
   * Initializes the notification system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.isInitialized = true;
    this.updateStatusBar();
    console.log('Notification system initialized');
  }

  /**
   * Shows a notification
   */
  async showNotification(
    type: HelixNotification['type'],
    title: string,
    message: string,
    category: string = 'general',
    actionable: boolean = false,
    actions?: NotificationAction[],
    persistent: boolean = false
  ): Promise<void> {
    const notification: HelixNotification = {
      id: this.generateNotificationId(),
      type,
      title,
      message,
      timestamp: new Date(),
      category,
      actionable,
      actions: actions || [],
      persistent,
      read: false,
    };

    // Add to notifications list
    this.notifications.push(notification);
    this.history.unreadCount++;
    this.history.totalNotifications++;

    // Update status bar
    this.updateStatusBar();

    // Show VSCode notification if enabled
    if (this.isChannelEnabled('vscode')) {
      await this.showVSCodeNotification(notification);
    }

    // Send to other channels
    await this.sendToChannels(notification);

    // Save history
    this.saveHistory();
  }

  /**
   * Shows an info notification
   */
  async showInfo(
    title: string,
    message: string,
    category?: string
  ): Promise<void> {
    await this.showNotification('info', title, message, category);
  }

  /**
   * Shows a warning notification
   */
  async showWarning(
    title: string,
    message: string,
    category?: string
  ): Promise<void> {
    await this.showNotification('warning', title, message, category);
  }

  /**
   * Shows an error notification
   */
  async showError(
    title: string,
    message: string,
    category?: string
  ): Promise<void> {
    await this.showNotification('error', title, message, category, true, [
      { label: 'View Logs', command: 'helix.showLogs' },
      { label: 'Report Issue', command: 'helix.reportIssue' },
    ]);
  }

  /**
   * Shows a success notification
   */
  async showSuccess(
    title: string,
    message: string,
    category?: string
  ): Promise<void> {
    await this.showNotification('success', title, message, category);
  }

  /**
   * Gets all notifications
   */
  getNotifications(): HelixNotification[] {
    return [...this.notifications];
  }

  /**
   * Gets unread notifications
   */
  getUnreadNotifications(): HelixNotification[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Marks a notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.history.unreadCount--;
      this.saveHistory();
    }
  }

  /**
   * Marks all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => (n.read = true));
    this.history.unreadCount = 0;
    this.saveHistory();
  }

  /**
   * Clears notifications
   */
  clearNotifications(keepPersistent: boolean = false): void {
    if (keepPersistent) {
      this.notifications = this.notifications.filter(n => n.persistent);
    } else {
      this.notifications = [];
    }
    this.history.unreadCount = 0;
    this.history.lastCleared = new Date();
    this.updateStatusBar();
    this.saveHistory();
  }

  /**
   * Gets notification history
   */
  getHistory(): NotificationHistory {
    return { ...this.history };
  }

  /**
   * Sets notification configuration
   */
  setConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    this.updateStatusBar();
  }

  /**
   * Gets notification configuration
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Sets channel configuration
   */
  setChannelConfig(
    channelType: string,
    config: Partial<NotificationChannel>
  ): void {
    const channelIndex = this.config.channels.findIndex(
      c => c.type === channelType
    );
    if (channelIndex >= 0) {
      const existingChannel = this.config.channels[channelIndex];
      if (existingChannel) {
        this.config.channels[channelIndex] = {
          ...existingChannel,
          enabled: config.enabled ?? existingChannel.enabled,
          config: config.config ?? existingChannel.config,
        };
      }
    } else {
      this.config.channels.push({
        type: channelType as 'vscode' | 'slack' | 'discord' | 'email',
        enabled: config.enabled ?? true,
        config: config.config || {},
      });
    }
    this.saveConfig();
  }

  /**
   * Tests notification channels
   */
  async testChannels(): Promise<void> {
    const testNotification: HelixNotification = {
      id: 'test',
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to verify channel configuration',
      timestamp: new Date(),
      category: 'test',
      actionable: false,
      persistent: false,
      read: false,
    };

    for (const channel of this.config.channels) {
      if (channel.enabled) {
        try {
          await this.sendToChannel(channel, testNotification);
          vscode.window.showInformationMessage(
            `Test notification sent to ${channel.type}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to send test notification to ${channel.type}: ${error}`
          );
        }
      }
    }
  }

  /**
   * Exports notification data
   */
  exportData(): string {
    return JSON.stringify(
      {
        config: this.config,
        history: this.history,
        notifications: this.notifications,
        exportTime: new Date(),
      },
      null,
      2
    );
  }

  /**
   * Imports notification data
   */
  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.config) {
        this.config = parsed.config;
      }
      if (parsed.history) {
        this.history = parsed.history;
      }
      if (parsed.notifications) {
        this.notifications = parsed.notifications;
      }
      this.updateStatusBar();
    } catch (error) {
      console.error('Failed to import notification data:', error);
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.statusBarItem.dispose();
  }

  private async showVSCodeNotification(
    notification: HelixNotification
  ): Promise<void> {
    let showMethod: (
      message: string,
      ...items: string[]
    ) => Thenable<string | undefined>;

    switch (notification.type) {
      case 'error':
        showMethod = vscode.window.showErrorMessage;
        break;
      case 'warning':
        showMethod = vscode.window.showWarningMessage;
        break;
      case 'success':
        showMethod = vscode.window.showInformationMessage;
        break;
      default:
        showMethod = vscode.window.showInformationMessage;
    }

    const actions = notification.actions?.map(a => a.label) || [];
    const result = await showMethod(
      `${notification.title}: ${notification.message}`,
      ...actions
    );

    if (result && notification.actions) {
      const action = notification.actions.find(a => a.label === result);
      if (action) {
        vscode.commands.executeCommand(action.command, ...(action.args || []));
      }
    }
  }

  private async sendToChannels(notification: HelixNotification): Promise<void> {
    for (const channel of this.config.channels) {
      if (channel.enabled) {
        try {
          await this.sendToChannel(channel, notification);
        } catch (error) {
          console.error(
            `Failed to send notification to ${channel.type}:`,
            error
          );
        }
      }
    }
  }

  private async sendToChannel(
    channel: NotificationChannel,
    notification: HelixNotification
  ): Promise<void> {
    switch (channel.type) {
      case 'slack':
        await this.sendSlackNotification(channel, notification);
        break;
      case 'discord':
        await this.sendDiscordNotification(channel, notification);
        break;
      case 'email':
        await this.sendEmailNotification(channel, notification);
        break;
    }
  }

  private async sendSlackNotification(
    channel: NotificationChannel,
    notification: HelixNotification
  ): Promise<void> {
    if (!channel.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const payload = {
      text: `${notification.title}\n${notification.message}`,
      username: 'Helix VSCode Extension',
      icon_emoji: this.getEmojiForType(notification.type),
    };

    await this.sendWebhook(channel.config.webhookUrl, payload);
  }

  private async sendDiscordNotification(
    channel: NotificationChannel,
    notification: HelixNotification
  ): Promise<void> {
    if (!channel.config.webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const color = this.getColorForType(notification.type);
    const payload = {
      embeds: [
        {
          title: notification.title,
          description: notification.message,
          color: color,
          timestamp: notification.timestamp.toISOString(),
          footer: {
            text: 'Helix VSCode Extension',
          },
        },
      ],
    };

    await this.sendWebhook(channel.config.webhookUrl, payload);
  }

  private async sendEmailNotification(
    channel: NotificationChannel,
    notification: HelixNotification
  ): Promise<void> {
    // This would integrate with an email service
    // For now, just log the attempt
    console.log(
      `Email notification would be sent to ${channel.config.email}: ${notification.title}`
    );
  }

  private async sendWebhook(url: string, payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = (urlObj.protocol === 'https:' ? https : http).request(
        options,
        res => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `Webhook request failed with status ${
                  res.statusCode || 'unknown'
                }`
              )
            );
          }
        }
      );

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  private getEmojiForType(type: HelixNotification['type']): string {
    switch (type) {
      case 'error':
        return ':x:';
      case 'warning':
        return ':warning:';
      case 'success':
        return ':white_check_mark:';
      default:
        return ':information_source:';
    }
  }

  private getColorForType(type: HelixNotification['type']): number {
    switch (type) {
      case 'error':
        return 0xff0000;
      case 'warning':
        return 0xffa500;
      case 'success':
        return 0x00ff00;
      default:
        return 0x007acc;
    }
  }

  private generateNotificationId(): string {
    return `notif-${crypto.randomUUID()}`;
  }

  private isChannelEnabled(type: string): boolean {
    const channel = this.config.channels.find(c => c.type === type);
    return channel ? channel.enabled : false;
  }

  private updateStatusBar(): void {
    if (this.config.showInStatusBar && this.history.unreadCount > 0) {
      this.statusBarItem.text = `$(bell) ${this.history.unreadCount}`;
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  private setupEventListeners(): void {
    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('helix.notifications')) {
          this.config = this.loadConfig();
          this.updateStatusBar();
        }
      })
    );

    // Register commands
    this.disposables.push(
      vscode.commands.registerCommand('helix.showNotifications', () => {
        this.showNotificationPanel();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('helix.markAllNotificationsRead', () => {
        this.markAllAsRead();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('helix.clearNotifications', () => {
        this.clearNotifications();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('helix.testNotificationChannels', () => {
        this.testChannels();
      })
    );
  }

  private async showNotificationPanel(): Promise<void> {
    const notifications = this.getNotifications();

    if (notifications.length === 0) {
      vscode.window.showInformationMessage('No notifications');
      return;
    }

    const items = notifications.map(n => ({
      label: `${this.getIconForType(n.type)} ${n.title}`,
      description:
        n.message.substring(0, 50) + (n.message.length > 50 ? '...' : ''),
      detail: `Category: ${n.category} • ${n.timestamp.toLocaleString()}${
        n.read ? ' • Read' : ' • Unread'
      }`,
      notification: n,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a notification to view details',
      canPickMany: false,
    });

    if (selected) {
      const notification = selected.notification;
      const actions = ['Mark as Read', 'Clear Notification'];

      const action = await vscode.window.showInformationMessage(
        `${notification.title}\n\n${notification.message}`,
        ...actions
      );

      if (action === 'Mark as Read') {
        this.markAsRead(notification.id);
      } else if (action === 'Clear Notification') {
        this.notifications = this.notifications.filter(
          n => n.id !== notification.id
        );
        this.saveHistory();
      }
    }
  }

  private getIconForType(type: HelixNotification['type']): string {
    switch (type) {
      case 'error':
        return '$(error)';
      case 'warning':
        return '$(warning)';
      case 'success':
        return '$(check)';
      default:
        return '$(info)';
    }
  }

  private loadConfig(): NotificationConfig {
    const config = vscode.workspace.getConfiguration('helix.notifications');
    return {
      enabled: config.get('enabled', true),
      channels: config.get('channels', [
        { type: 'vscode', enabled: true, config: {} },
      ]),
      sound: config.get('sound', true),
      timeout: config.get('timeout', 5000),
      showInStatusBar: config.get('showInStatusBar', true),
    };
  }

  private saveConfig(): void {
    const config = vscode.workspace.getConfiguration('helix.notifications');
    config.update(
      'enabled',
      this.config.enabled,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      'channels',
      this.config.channels,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      'sound',
      this.config.sound,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      'timeout',
      this.config.timeout,
      vscode.ConfigurationTarget.Global
    );
    config.update(
      'showInStatusBar',
      this.config.showInStatusBar,
      vscode.ConfigurationTarget.Global
    );
  }

  private loadHistory(): NotificationHistory {
    try {
      const config = vscode.workspace.getConfiguration('helix.notifications');
      const historyData = config.get('history', {}) as any;
      return {
        notifications: historyData.notifications || [],
        lastCleared: historyData.lastCleared
          ? new Date(historyData.lastCleared)
          : new Date(),
        totalNotifications: historyData.totalNotifications || 0,
        unreadCount: historyData.unreadCount || 0,
      };
    } catch (error) {
      return {
        notifications: [],
        lastCleared: new Date(),
        totalNotifications: 0,
        unreadCount: 0,
      };
    }
  }

  private saveHistory(): void {
    const config = vscode.workspace.getConfiguration('helix.notifications');
    config.update(
      'history',
      {
        notifications: this.notifications,
        lastCleared: this.history.lastCleared,
        totalNotifications: this.history.totalNotifications,
        unreadCount: this.history.unreadCount,
      },
      vscode.ConfigurationTarget.Global
    );
  }
}
