/**
 * Helix VS Code Extension - Browser Manager
 * Controls browser automation for web interaction
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export interface BrowserSettings {
  enabled: boolean;
  viewportSize: ViewportSize;
  screenshotQuality: number;
  remoteDebuggingHost?: string;
  remoteDebuggingPort: number;
  autoDiscoverChrome: boolean;
}

export type ViewportSize = 'small' | 'medium' | 'large' | 'custom';

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface BrowserAction {
  type:
    | 'navigate'
    | 'click'
    | 'input'
    | 'scroll'
    | 'wait'
    | 'screenshot'
    | 'evaluate';
  url?: string;
  selector?: string;
  text?: string;
  amount?: number;
  code?: string;
  timeout?: number;
}

export interface BrowserActionResult {
  success: boolean;
  result?: any;
  error?: string;
  screenshot?: string;
}

export class BrowserManager extends EventEmitter {
  private static instance: BrowserManager;
  private settings: BrowserSettings;
  private context: vscode.ExtensionContext;
  private eventEmitter: vscode.EventEmitter<BrowserSettings> =
    new vscode.EventEmitter<BrowserSettings>();
  private browserConnected: boolean = false;

  private readonly VIEWPORT_SIZES: Record<ViewportSize, ViewportDimensions> = {
    small: { width: 900, height: 600 },
    medium: { width: 1280, height: 720 },
    large: { width: 1920, height: 1080 },
    custom: { width: 1280, height: 720 },
  };

  private constructor(context: vscode.ExtensionContext) {
    super();
    this.context = context;
    this.settings = this.getDefaultSettings();

    this.loadSettings();
  }

  public static getInstance(context?: vscode.ExtensionContext): BrowserManager {
    if (!BrowserManager.instance) {
      if (!context) {
        throw new Error(
          'BrowserManager requires ExtensionContext on first initialization'
        );
      }
      BrowserManager.instance = new BrowserManager(context);
    }
    return BrowserManager.instance;
  }

  /**
   * Get default browser settings
   */
  private getDefaultSettings(): BrowserSettings {
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
  private loadSettings(): void {
    try {
      const storageKey = 'browserSettings';
      const stored = this.context.globalState.get<BrowserSettings>(storageKey);
      if (stored) {
        this.settings = stored;
      }
    } catch (error) {
      console.error('Failed to load browser settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    try {
      const storageKey = 'browserSettings';
      this.context.globalState.update(storageKey, this.settings);
      this.eventEmitter.fire(this.settings);
    } catch (error) {
      console.error('Failed to save browser settings:', error);
    }
  }

  /**
   * Get current browser settings
   */
  public getSettings(): BrowserSettings {
    return { ...this.settings };
  }

  /**
   * Update browser settings
   */
  public updateSettings(updates: Partial<BrowserSettings>): void {
    Object.assign(this.settings, updates);
    this.saveSettings();
  }

  /**
   * Get viewport dimensions
   */
  public getViewportDimensions(): ViewportDimensions {
    if (this.settings.viewportSize === 'custom') {
      // Load custom dimensions from storage if they exist
      const custom = this.context.globalState.get<ViewportDimensions>(
        'customViewportDimensions'
      );
      return custom || this.VIEWPORT_SIZES['custom'];
    }
    return this.VIEWPORT_SIZES[this.settings.viewportSize];
  }

  /**
   * Set custom viewport dimensions
   */
  public setCustomViewportDimensions(dimensions: ViewportDimensions): void {
    this.context.globalState.update('customViewportDimensions', dimensions);
    this.updateSettings({ viewportSize: 'custom' });
  }

  /**
   * Test connection to Chrome
   */
  public async testConnection(): Promise<boolean> {
    try {
      const host = this.settings.remoteDebuggingHost || 'localhost';
      const port = this.settings.remoteDebuggingPort;

      // This would actually connect to Chrome's DevTools Protocol
      // For now, we'll simulate a connection test
      const connected = await this.simulateConnectionTest(host, port);
      this.browserConnected = connected;

      return connected;
    } catch (error) {
      console.error('Failed to test browser connection:', error);
      this.browserConnected = false;
      return false;
    }
  }

  /**
   * Simulate connection test
   */
  private async simulateConnectionTest(
    host: string,
    port: number
  ): Promise<boolean> {
    // In a real implementation, this would use Chrome DevTools Protocol
    // For now, we'll just return true to simulate a successful connection
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 1000);
    });
  }

  /**
   * Execute browser action
   */
  public async executeAction(
    action: BrowserAction
  ): Promise<BrowserActionResult> {
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
          return await this.navigate(action.url!);
        case 'click':
          return await this.click(action.selector!);
        case 'input':
          return await this.input(action.selector!, action.text!);
        case 'scroll':
          return await this.scroll(action.amount!);
        case 'wait':
          return await this.wait(action.timeout!);
        case 'screenshot':
          return await this.screenshot();
        case 'evaluate':
          return await this.evaluate(action.code!);
        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  }

  /**
   * Navigate to URL
   */
  private async navigate(url: string): Promise<BrowserActionResult> {
    // In a real implementation, this would use Chrome DevTools Protocol
    return {
      success: true,
      result: { url },
    };
  }

  /**
   * Click element
   */
  private async click(selector: string): Promise<BrowserActionResult> {
    // In a real implementation, this would use Chrome DevTools Protocol
    return {
      success: true,
      result: { selector },
    };
  }

  /**
   * Input text into element
   */
  private async input(
    selector: string,
    text: string
  ): Promise<BrowserActionResult> {
    // In a real implementation, this would use Chrome DevTools Protocol
    return {
      success: true,
      result: { selector, text },
    };
  }

  /**
   * Scroll page
   */
  private async scroll(amount: number): Promise<BrowserActionResult> {
    // In a real implementation, this would use Chrome DevTools Protocol
    return {
      success: true,
      result: { amount },
    };
  }

  /**
   * Wait for timeout
   */
  private async wait(timeout: number): Promise<BrowserActionResult> {
    await new Promise(resolve => setTimeout(resolve, timeout));
    return {
      success: true,
      result: { timeout },
    };
  }

  /**
   * Take screenshot
   */
  private async screenshot(): Promise<BrowserActionResult> {
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
  private async evaluate(code: string): Promise<BrowserActionResult> {
    // In a real implementation, this would use Chrome DevTools Protocol
    try {
      const result = eval(code);
      return {
        success: true,
        result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  }

  /**
   * Execute sequence of actions
   */
  public async executeActions(
    actions: BrowserAction[]
  ): Promise<BrowserActionResult[]> {
    const results: BrowserActionResult[] = [];

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
  public async discoverChromeInstances(): Promise<string[]> {
    // In a real implementation, this would scan for Chrome processes
    // with remote debugging enabled

    // For now, return a placeholder
    return ['localhost:9222'];
  }

  /**
   * Reset to default settings
   */
  public resetToDefaults(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
  }

  /**
   * Event fired when settings change
   */
  public readonly onDidChangeSettings = this.eventEmitter.event;
}
