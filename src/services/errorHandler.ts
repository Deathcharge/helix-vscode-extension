import * as vscode from 'vscode';
import { notificationService, NotificationType } from './notificationService';

export interface ErrorContext {
  source: string;
  operation?: string;
  details?: any;
  timestamp: Date;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: ErrorContext[] = [];
  private maxErrorHistory: number = 100;
  private outputChannel: vscode.OutputChannel;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Helix');
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handles an error and shows appropriate user feedback
   */
  handleError(error: Error, context: Partial<ErrorContext> = {}): void {
    const errorContext: ErrorContext = {
      source: context.source || 'Unknown',
      ...(context.operation !== undefined && { operation: context.operation }),
      details: context.details,
      timestamp: new Date(),
    };

    // Add to error history
    this.addToHistory(errorContext);

    // Log the error
    this.logError(error, errorContext);

    // Show user notification
    this.showUserNotification(error, errorContext);

    // Handle specific error types
    this.handleSpecificErrorTypes(error, errorContext);
  }

  /**
   * Handles async errors with proper context
   */
  handleAsyncError(
    error: Error,
    source: string,
    operation?: string
  ): Promise<void> {
    return new Promise(resolve => {
      this.handleError(error, {
        source,
        ...(operation !== undefined && { operation }),
      });
      resolve();
    });
  }

  /**
   * Handles API errors with retry logic
   */
  async handleApiError(
    error: Error,
    retryFunction?: () => Promise<any>,
    maxRetries: number = 3
  ): Promise<void> {
    const isNetworkError = this.isNetworkError(error);
    const isAuthError = this.isAuthError(error);

    if (isAuthError) {
      this.handleAuthError(error);
      return;
    }

    if (isNetworkError && retryFunction) {
      await this.handleRetryableError(error, retryFunction, maxRetries);
      return;
    }

    this.handleError(error, { source: 'API', operation: 'Request' });
  }

  /**
   * Gets error history
   */
  getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory];
  }

  /**
   * Clears error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Logs error to console and VSCode output channel
   */
  private logError(error: Error, context: ErrorContext): void {
    const logMessage = `[${context.source}] ${
      context.operation ? `${context.operation}: ` : ''
    }${error.message}`;

    console.error(logMessage, {
      error: error.stack,
      context,
      details: context.details,
    });

    // Log to VSCode output channel
    this.outputChannel.appendLine(
      `[${new Date().toISOString()}] ERROR: ${logMessage}`
    );
    this.outputChannel.appendLine(`Stack: ${error.stack}`);
    if (context.details) {
      this.outputChannel.appendLine(
        `Details: ${JSON.stringify(context.details, null, 2)}`
      );
    }
    this.outputChannel.appendLine('---');
  }

  /**
   * Shows user notification for error
   */
  private showUserNotification(error: Error, context: ErrorContext): void {
    const userMessage = this.getUserFriendlyMessage(error, context);
    const notificationType = this.getNotificationType(error, context);

    notificationService.showNotification({
      type: notificationType,
      message: userMessage,
      showInStatusBar: true,
      statusBarItemText: `Error: ${context.source}`,
    });
  }

  /**
   * Handles specific error types
   */
  private handleSpecificErrorTypes(error: Error, context: ErrorContext): void {
    if (this.isAuthError(error)) {
      this.handleAuthError(error);
    } else if (this.isNetworkError(error)) {
      this.handleNetworkError(error);
    } else if (this.isValidationError(error)) {
      this.handleValidationError(error);
    }
  }

  /**
   * Handles authentication errors
   */
  private handleAuthError(error: Error): void {
    notificationService.showNotification({
      type: 'error',
      message: 'Authentication failed. Please log in again.',
      actions: [
        {
          title: 'Login',
          command: 'helix.login',
        },
      ],
    });
  }

  /**
   * Handles network errors
   */
  private handleNetworkError(error: Error): void {
    notificationService.showNotification({
      type: 'warning',
      message:
        'Network connection issue. Please check your internet connection.',
      duration: 5000,
    });
  }

  /**
   * Handles validation errors
   */
  private handleValidationError(error: Error): void {
    notificationService.showNotification({
      type: 'warning',
      message: `Invalid input: ${error.message}`,
    });
  }

  /**
   * Handles retryable errors
   */
  private async handleRetryableError(
    error: Error,
    retryFunction: () => Promise<any>,
    maxRetries: number
  ): Promise<void> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await retryFunction();
        return; // Success, exit retry loop
      } catch (retryError) {
        retries++;
        if (retries >= maxRetries) {
          this.handleError(retryError as Error, {
            source: 'Retry',
            operation: `Attempt ${retries}`,
            details: { originalError: error.message },
          });
          break;
        }

        // Wait before retrying (exponential backoff)
        await this.sleep(Math.pow(2, retries) * 1000);
      }
    }
  }

  /**
   * Adds error to history
   */
  private addToHistory(context: ErrorContext): void {
    this.errorHistory.push(context);

    // Limit history size
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * Gets user-friendly error message
   */
  private getUserFriendlyMessage(error: Error, context: ErrorContext): string {
    // Map specific error messages to user-friendly ones
    const messageMap: { [key: string]: string } = {
      'Network Error':
        'Unable to connect to the server. Please check your internet connection.',
      timeout: 'Request timed out. Please try again.',
      '401': 'Authentication required. Please log in.',
      '403':
        'Access denied. You do not have permission to perform this action.',
      '404': 'Resource not found.',
      '500': 'Server error. Please try again later.',
      ECONNREFUSED:
        'Unable to connect to the server. Please check if the server is running.',
    };

    // Check for mapped messages
    for (const [key, message] of Object.entries(messageMap)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    // Default message
    return `An error occurred in ${context.source}: ${error.message}`;
  }

  /**
   * Gets appropriate notification type for error
   */
  private getNotificationType(
    error: Error,
    context: ErrorContext
  ): NotificationType {
    if (this.isAuthError(error)) {
      return 'error';
    } else if (this.isNetworkError(error)) {
      return 'warning';
    } else if (this.isValidationError(error)) {
      return 'warning';
    }

    return 'error';
  }

  /**
   * Checks if error is an authentication error
   */
  private isAuthError(error: Error): boolean {
    return (
      error.message.toLowerCase().includes('unauthorized') ||
      error.message.toLowerCase().includes('401') ||
      error.message.toLowerCase().includes('token') ||
      error.message.toLowerCase().includes('auth')
    );
  }

  /**
   * Checks if error is a network error
   */
  private isNetworkError(error: Error): boolean {
    return (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('connection') ||
      error.message.toLowerCase().includes('econnrefused') ||
      error.message.toLowerCase().includes('fetch')
    );
  }

  /**
   * Checks if error is a validation error
   */
  private isValidationError(error: Error): boolean {
    return (
      error.message.toLowerCase().includes('validation') ||
      error.message.toLowerCase().includes('invalid') ||
      error.message.toLowerCase().includes('400')
    );
  }

  /**
   * Sleep utility for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();
