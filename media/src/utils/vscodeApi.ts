/**
 * VS Code Webview API Utility
 * Provides typed communication between webviews and extension host
 */

// Declare the VS Code API for TypeScript
declare function acquireVsCodeApi(): VSCodeAPI;

interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

interface MessageHandler {
  (data: any): void;
}

class VSCodeWebviewAPI {
  private vscode: VSCodeAPI | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private state: any = {};

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof acquireVsCodeApi !== 'undefined') {
      this.vscode = acquireVsCodeApi();
      this.state = this.vscode.getState() || {};

      // Set up message listener
      window.addEventListener('message', event => {
        const message = event.data;
        if (message && message.type) {
          this.handleMessage(message.type, message.data);
        }
      });
    }
  }

  /**
   * Check if running inside VS Code webview
   */
  isInVSCode(): boolean {
    return this.vscode !== null;
  }

  /**
   * Send message to extension host
   */
  postMessage(type: string, data?: any): void {
    if (this.vscode) {
      this.vscode.postMessage({ type, data });
    } else {
      console.warn('VS Code API not available, message not sent:', {
        type,
        data,
      });
    }
  }

  /**
   * Subscribe to messages from extension host
   */
  onMessage(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(type: string, data: any): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler({ type, data }));
    }
  }

  /**
   * Get persisted state
   */
  getState<T = any>(): T {
    return this.state as T;
  }

  /**
   * Update persisted state
   */
  setState(newState: any): void {
    this.state = { ...this.state, ...newState };
    if (this.vscode) {
      this.vscode.setState(this.state);
    }
  }

  /**
   * Show notification in VS Code
   */
  showNotification(
    message: string,
    type: 'info' | 'warning' | 'error' = 'info'
  ): void {
    this.postMessage('notification', { message, type });
  }

  /**
   * Request data from extension host
   */
  async request<T = any>(type: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      const unsubscribe = this.onMessage(`response:${requestId}`, response => {
        unsubscribe();
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      });

      this.postMessage('request', { requestId, type, data });

      // Timeout after 30 seconds
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Request timed out'));
      }, 30000);
    });
  }
}

// Singleton instance
export const vscodeApi = new VSCodeWebviewAPI();

// Export types for use in webviews
export type { VSCodeAPI, MessageHandler };
