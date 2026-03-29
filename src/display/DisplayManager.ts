/**
 * Helix VS Code Extension - Display Manager
 * Controls display settings for UI elements (thinking blocks, timeline, cost tracking)
 */

import * as vscode from 'vscode';

export interface DisplaySettings {
  collapseThinkingBlocks: boolean;
  showVisualTimeline: boolean;
  showTimestamps: boolean;
  showDiffStatistics: boolean;
  sendOnEnter: boolean;
  hideCostBelowThreshold: number;
}

export interface TimelineMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error' | 'thinking';
  timestamp: Date;
  content: string;
  metadata?: {
    cost?: number;
    linesAdded?: number;
    linesRemoved?: number;
    agent?: string;
    mode?: string;
  };
}

export class DisplayManager {
  private static instance: DisplayManager;
  private settings: DisplaySettings;
  private context: vscode.ExtensionContext;
  private eventEmitter: vscode.EventEmitter<DisplaySettings> =
    new vscode.EventEmitter<DisplaySettings>();

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.settings = this.getDefaultSettings();

    this.loadSettings();
  }

  public static getInstance(context?: vscode.ExtensionContext): DisplayManager {
    if (!DisplayManager.instance) {
      if (!context) {
        throw new Error(
          'DisplayManager requires ExtensionContext on first initialization'
        );
      }
      DisplayManager.instance = new DisplayManager(context);
    }
    return DisplayManager.instance;
  }

  /**
   * Get default display settings
   */
  private getDefaultSettings(): DisplaySettings {
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
  private loadSettings(): void {
    try {
      const storageKey = 'displaySettings';
      const stored = this.context.globalState.get<DisplaySettings>(storageKey);
      if (stored) {
        this.settings = stored;
      }
    } catch (error) {
      console.error('Failed to load display settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    try {
      const storageKey = 'displaySettings';
      this.context.globalState.update(storageKey, this.settings);
      this.eventEmitter.fire(this.settings);
    } catch (error) {
      console.error('Failed to save display settings:', error);
    }
  }

  /**
   * Get current display settings
   */
  public getSettings(): DisplaySettings {
    return { ...this.settings };
  }

  /**
   * Update display settings
   */
  public updateSettings(updates: Partial<DisplaySettings>): void {
    Object.assign(this.settings, updates);
    this.saveSettings();
  }

  /**
   * Check if thinking blocks should be collapsed
   */
  public shouldCollapseThinkingBlocks(): boolean {
    return this.settings.collapseThinkingBlocks;
  }

  /**
   * Toggle thinking block collapse
   */
  public toggleThinkingBlocks(): void {
    this.settings.collapseThinkingBlocks =
      !this.settings.collapseThinkingBlocks;
    this.saveSettings();
  }

  /**
   * Check if visual timeline should be shown
   */
  public shouldShowVisualTimeline(): boolean {
    return this.settings.showVisualTimeline;
  }

  /**
   * Toggle visual timeline
   */
  public toggleVisualTimeline(): void {
    this.settings.showVisualTimeline = !this.settings.showVisualTimeline;
    this.saveSettings();
  }

  /**
   * Check if timestamps should be shown
   */
  public shouldShowTimestamps(): boolean {
    return this.settings.showTimestamps;
  }

  /**
   * Toggle timestamps
   */
  public toggleTimestamps(): void {
    this.settings.showTimestamps = !this.settings.showTimestamps;
    this.saveSettings();
  }

  /**
   * Check if diff statistics should be shown
   */
  public shouldShowDiffStatistics(): boolean {
    return this.settings.showDiffStatistics;
  }

  /**
   * Toggle diff statistics
   */
  public toggleDiffStatistics(): void {
    this.settings.showDiffStatistics = !this.settings.showDiffStatistics;
    this.saveSettings();
  }

  /**
   * Check if Enter sends message
   */
  public shouldSendOnEnter(): boolean {
    return this.settings.sendOnEnter;
  }

  /**
   * Toggle send on Enter
   */
  public toggleSendOnEnter(): void {
    this.settings.sendOnEnter = !this.settings.sendOnEnter;
    this.saveSettings();
  }

  /**
   * Set cost threshold
   */
  public setCostThreshold(threshold: number): void {
    this.settings.hideCostBelowThreshold = threshold;
    this.saveSettings();
  }

  /**
   * Check if cost should be hidden
   */
  public shouldHideCost(cost: number): boolean {
    return cost < this.settings.hideCostBelowThreshold;
  }

  /**
   * Format cost for display
   */
  public formatCost(cost: number): string {
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
  public formatTimestamp(timestamp: Date): string {
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
  public formatDiffStatistics(
    linesAdded: number,
    linesRemoved: number
  ): string {
    const added = linesAdded > 0 ? `+${linesAdded}` : '0';
    const removed = linesRemoved > 0 ? `-${linesRemoved}` : '0';
    return `${added}, ${removed}`;
  }

  /**
   * Get color for message type (for timeline visualization)
   */
  public getMessageTypeColor(type: TimelineMessage['type']): string {
    const colors: Record<TimelineMessage['type'], string> = {
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
  public formatTimelineMessage(message: TimelineMessage): string {
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
    if (
      message.metadata?.linesAdded !== undefined ||
      message.metadata?.linesRemoved !== undefined
    ) {
      metadata += ` | ${this.formatDiffStatistics(
        message.metadata.linesAdded || 0,
        message.metadata.linesRemoved || 0
      )}`;
    }
    if (message.metadata?.agent) {
      metadata += ` | ${message.metadata.agent}`;
    }

    return `[${timestamp}] ${message.type}: ${preview}${metadata}`;
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
