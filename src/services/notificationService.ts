import * as vscode from 'vscode';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface NotificationOptions {
  type: NotificationType;
  message: string;
  duration?: number; // milliseconds
  actions?: { title: string; command: string; arguments?: any[] }[];
  showInStatusBar?: boolean;
  statusBarItemText?: string;
}

export class NotificationService {
  private statusBarItem: vscode.StatusBarItem;
  private lastNotificationTime: number = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'helix.showAgentPanel';
  }

  /**
   * Shows a notification to the user
   */
  showNotification(options: NotificationOptions): void {
    const now = Date.now();

    // Throttle notifications to prevent spam
    if (now - this.lastNotificationTime < 1000) {
      return;
    }
    this.lastNotificationTime = now;

    switch (options.type) {
      case 'info':
        vscode.window.showInformationMessage(
          options.message,
          ...this.getActionTitles(options.actions)
        );
        break;
      case 'warning':
        vscode.window.showWarningMessage(
          options.message,
          ...this.getActionTitles(options.actions)
        );
        break;
      case 'error':
        vscode.window.showErrorMessage(
          options.message,
          ...this.getActionTitles(options.actions)
        );
        break;
      case 'success':
        vscode.window.showInformationMessage(
          `✅ ${options.message}`,
          ...this.getActionTitles(options.actions)
        );
        break;
    }

    // Handle actions
    if (options.actions) {
      this.handleActions(options.actions);
    }

    // Update status bar if requested
    if (options.showInStatusBar) {
      this.updateStatusBar(
        options.statusBarItemText || options.message,
        options.type
      );
    }
  }

  /**
   * Shows a progress notification
   */
  async showProgress<T>(
    title: string,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Thenable<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: title,
        cancellable: true,
      },
      task
    );
  }

  /**
   * Shows a quick pick selection
   */
  async showQuickPick(
    items: string[] | vscode.QuickPickItem[],
    options: vscode.QuickPickOptions = {}
  ): Promise<string | vscode.QuickPickItem | undefined> {
    if (
      Array.isArray(items) &&
      items.length > 0 &&
      typeof items[0] === 'string'
    ) {
      return vscode.window.showQuickPick(items as string[], options);
    } else {
      return vscode.window.showQuickPick(
        items as vscode.QuickPickItem[],
        options
      );
    }
  }

  /**
   * Shows an input box
   */
  async showInputBox(
    options: vscode.InputBoxOptions = {}
  ): Promise<string | undefined> {
    return vscode.window.showInputBox(options);
  }

  /**
   * Shows a confirmation dialog
   */
  async showConfirmation(
    message: string,
    confirmText: string = 'Yes',
    cancelText: string = 'No'
  ): Promise<boolean> {
    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      confirmText,
      cancelText
    );
    return result === confirmText;
  }

  /**
   * Updates the status bar with a message
   */
  updateStatusBar(text: string, type: NotificationType = 'info'): void {
    const icon = this.getStatusBarIcon(type);
    this.statusBarItem.text = `${icon} ${text}`;
    this.statusBarItem.show();
  }

  /**
   * Hides the status bar
   */
  hideStatusBar(): void {
    this.statusBarItem.hide();
  }

  /**
   * Clears all notifications
   */
  clear(): void {
    this.hideStatusBar();
  }

  /**
   * Gets the status bar icon for a notification type
   */
  private getStatusBarIcon(type: NotificationType): string {
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
  private getActionTitles(
    actions?: { title: string; command: string; arguments?: any[] }[]
  ): string[] {
    return actions ? actions.map(action => action.title) : [];
  }

  /**
   * Handles notification actions
   */
  private handleActions(
    actions: { title: string; command: string; arguments?: any[] }[]
  ): void {
    // Actions are handled by VSCode automatically when clicked
    // This method can be extended for custom action handling
  }

  /**
   * Disposes of the notification service
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}

// Global notification service instance
export const notificationService = new NotificationService();
