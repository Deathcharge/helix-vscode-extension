import * as vscode from 'vscode';
import {
  Session,
  SessionMetrics,
  SessionContext,
  SessionAlert,
  SessionRecommendation,
} from '../types/session';

export interface SessionState {
  session: Session | null;
  metrics: SessionMetrics[];
  context: SessionContext;
  alerts: SessionAlert[];
  recommendations: SessionRecommendation[];
  lastUpdated: Date;
  isActive: boolean;
}

export class SessionStore {
  private state: SessionState;
  private context: vscode.ExtensionContext;
  private sessionTimer: NodeJS.Timeout | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.state = {
      session: null,
      metrics: [],
      context: this.getDefaultContext(),
      alerts: [],
      recommendations: [],
      lastUpdated: new Date(0),
      isActive: false,
    };
    this.loadState();
    this.startSessionMonitoring();
  }

  /**
   * Gets current session
   */
  getSession(): Session | null {
    return this.state.session;
  }

  /**
   * Gets session metrics
   */
  getMetrics(): SessionMetrics[] {
    return [...this.state.metrics];
  }

  /**
   * Gets session context
   */
  getContext(): SessionContext {
    return { ...this.state.context };
  }

  /**
   * Gets session alerts
   */
  getAlerts(): SessionAlert[] {
    return [...this.state.alerts];
  }

  /**
   * Gets session recommendations
   */
  getRecommendations(): SessionRecommendation[] {
    return [...this.state.recommendations];
  }

  /**
   * Gets session state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Creates a new session
   */
  async createSession(): Promise<Session> {
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const workspacePaths = workspaceFolders.map(folder => folder.uri.fsPath);

    const session: Session = {
      sessionId: this.generateSessionId(),
      userId: this.getUserId(),
      timestamp: new Date(),
      coordinationLevel: 5,
      ucfMetrics: {
        harmony: 5,
        resilience: 5,
        throughput: 5,
        friction: 5,
        focus: 5,
        velocity: 5,
      },
      activeAgents: [],
      workspaceContext: {
        workspaceFolders: workspacePaths,
        recentFiles: [],
        gitStatus: await this.getGitStatus(),
        language: this.detectLanguage(workspacePaths),
        projectType: this.detectProjectType(workspacePaths),
        userActions: [],
        lastActivity: new Date(),
      },
      lastActivity: new Date(),
    };

    this.state.session = session;
    this.state.isActive = true;
    this.state.lastUpdated = new Date();
    this.saveState();

    return session;
  }

  /**
   * Updates coordination metrics
   */
  async updateCoordinationMetrics(metrics: {
    harmony: number;
    resilience: number;
    throughput: number;
    friction: number;
    focus: number;
    velocity: number;
  }): Promise<void> {
    if (!this.state.session) {
      await this.createSession();
    }

    this.state.session!.ucfMetrics = metrics;
    this.state.session!.coordinationLevel =
      this.calculatePerformanceScore(metrics);
    this.state.session!.lastActivity = new Date();
    this.state.lastUpdated = new Date();

    // Add metrics to history
    this.state.metrics.push({
      timestamp: new Date(),
      ...metrics,
    });

    // Keep only last 1000 metrics
    if (this.state.metrics.length > 1000) {
      this.state.metrics.shift();
    }

    this.saveState();
    this.checkForAlerts(metrics);
    this.generateRecommendations(metrics);
  }

  /**
   * Updates active agents
   */
  async updateActiveAgents(agents: string[]): Promise<void> {
    if (!this.state.session) {
      await this.createSession();
    }

    this.state.session!.activeAgents = agents;
    this.state.session!.lastActivity = new Date();
    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Updates session context
   */
  async updateContext(context: Partial<SessionContext>): Promise<void> {
    this.state.context = {
      ...this.state.context,
      ...context,
      lastActivity: new Date(),
    };
    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Records file access
   */
  async recordFileAccess(filePath: string): Promise<void> {
    if (!this.state.session) return;

    const recentFiles = this.state.session.workspaceContext.recentFiles;
    const index = recentFiles.indexOf(filePath);

    if (index > 0) {
      recentFiles.splice(index, 1);
    } else if (index === -1) {
      recentFiles.unshift(filePath);
    }

    // Keep only last 20 files
    if (recentFiles.length > 20) {
      recentFiles.length = 20;
    }

    this.state.session.workspaceContext.recentFiles = recentFiles;
    this.state.session.lastActivity = new Date();
    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Records user action
   */
  async recordUserAction(action: string, details?: any): Promise<void> {
    if (!this.state.session) return;

    const actionRecord = {
      action,
      timestamp: new Date(),
      details: details || {},
    };

    this.state.context.userActions.push(actionRecord);

    // Keep only last 100 actions
    if (this.state.context.userActions.length > 100) {
      this.state.context.userActions.shift();
    }

    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Adds alert
   */
  addAlert(alert: Omit<SessionAlert, 'id' | 'timestamp'>): void {
    const fullAlert: SessionAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
    };

    this.state.alerts.push(fullAlert);

    // Keep only last 100 alerts
    if (this.state.alerts.length > 100) {
      this.state.alerts.shift();
    }

    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Clears alerts
   */
  clearAlerts(): void {
    this.state.alerts = [];
    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Gets coordination trends
   */
  getCoordinationTrends(): {
    harmony: number[];
    resilience: number[];
    throughput: number[];
    friction: number[];
    focus: number[];
    velocity: number[];
  } {
    const recentMetrics = this.state.metrics.slice(-20);

    return {
      harmony: recentMetrics.map(m => m.harmony),
      resilience: recentMetrics.map(m => m.resilience),
      throughput: recentMetrics.map(m => m.throughput),
      friction: recentMetrics.map(m => m.friction),
      focus: recentMetrics.map(m => m.focus),
      velocity: recentMetrics.map(m => m.velocity),
    };
  }

  /**
   * Gets session statistics
   */
  getSessionStatistics(): {
    sessionDuration: number;
    totalFilesAccessed: number;
    totalActions: number;
    averageCoordination: number;
    activeAgentsCount: number;
    lastActivity: Date;
  } {
    if (!this.state.session) {
      return {
        sessionDuration: 0,
        totalFilesAccessed: 0,
        totalActions: 0,
        averageCoordination: 0,
        activeAgentsCount: 0,
        lastActivity: new Date(),
      };
    }

    const duration = Date.now() - this.state.session.timestamp.getTime();
    const totalFiles = this.state.session.workspaceContext.recentFiles.length;
    const totalActions = this.state.context.userActions.length;
    const averageCoordination = this.calculateAverageCoordination();
    const activeAgentsCount = this.state.session.activeAgents.length;

    return {
      sessionDuration: duration,
      totalFilesAccessed: totalFiles,
      totalActions: totalActions,
      averageCoordination,
      activeAgentsCount,
      lastActivity: this.state.session.lastActivity,
    };
  }

  /**
   * Clears session data
   */
  clear(): void {
    this.state = {
      session: null,
      metrics: [],
      context: this.getDefaultContext(),
      alerts: [],
      recommendations: [],
      lastUpdated: new Date(0),
      isActive: false,
    };
    this.saveState();
  }

  /**
   * Exports session data
   */
  exportData(): string {
    return JSON.stringify(
      {
        state: this.state,
        exportTime: new Date(),
      },
      null,
      2
    );
  }

  /**
   * Imports session data
   */
  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.state) {
        this.state = parsed.state;
      }
    } catch (error) {
      console.error('Failed to import session data:', error);
    }
  }

  async initialize(): Promise<void> {
    // Initialize session store
    this.loadState();
  }

  getPerformanceScore(): number {
    // Returns the last known coordination level received from the backend.
    // Defaults to 0 (unknown) rather than a fake value — callers should
    // check for 0 and show a "—" placeholder instead of a misleading score.
    return this.state.session?.coordinationLevel ?? 0;
  }

  dispose(): void {
    this.stopSessionMonitoring();
    this.disposables.forEach(d => d.dispose());
  }

  private async getGitStatus(): Promise<any> {
    try {
      const gitExtension =
        vscode.extensions.getExtension('vscode.git')?.exports;
      if (!gitExtension) return null;

      const git = gitExtension.getAPI(1);
      if (git.repositories.length === 0) return null;

      const repository = git.repositories[0];
      const state = repository.state;

      return {
        branch: state.HEAD?.name || 'unknown',
        status: state.workingTreeChanges.length > 0 ? 'modified' : 'clean',
        ahead: state.HEAD?.ahead || 0,
        behind: state.HEAD?.behind || 0,
        lastCommit: state.HEAD?.commit,
      };
    } catch (error) {
      return null;
    }
  }

  private detectLanguage(workspacePaths: string[]): string {
    // Simple language detection based on file extensions
    const fileExtensions = new Set<string>();

    // This would need to be implemented with actual file scanning
    // For now, return a default
    return 'typescript';
  }

  private detectProjectType(workspacePaths: string[]): string {
    // Simple project type detection
    // This would need to be implemented with actual file scanning
    return 'web-application';
  }

  private calculatePerformanceScore(metrics: {
    harmony: number;
    resilience: number;
    throughput: number;
    friction: number;
    focus: number;
    velocity: number;
  }): number {
    const frictionAdjusted = 10 - metrics.friction;
    return (
      (metrics.harmony +
        metrics.resilience +
        metrics.throughput +
        frictionAdjusted +
        metrics.focus +
        metrics.velocity) /
      6
    );
  }

  private calculateAverageCoordination(): number {
    if (this.state.metrics.length === 0) return 0;

    const total = this.state.metrics.reduce((sum, metrics) => {
      const frictionAdjusted = 10 - metrics.friction;
      return (
        sum +
        (metrics.harmony +
          metrics.resilience +
          metrics.throughput +
          frictionAdjusted +
          metrics.focus +
          metrics.velocity) /
          6
      );
    }, 0);

    return total / this.state.metrics.length;
  }

  private generateSessionId(): string {
    return `session-${crypto.randomUUID()}`;
  }

  private generateAlertId(): string {
    return `alert-${crypto.randomUUID()}`;
  }

  private getUserId(): string {
    let userId = this.context.globalState.get<string>('helix.userId');
    if (!userId) {
      userId = `user-${crypto.randomUUID()}`;
      this.context.globalState.update('helix.userId', userId);
    }
    return userId;
  }

  private getDefaultContext(): SessionContext {
    return {
      workspaceFolders: [],
      recentFiles: [],
      gitStatus: null,
      language: 'unknown',
      projectType: 'unknown',
      userActions: [],
      lastActivity: new Date(),
    };
  }

  private checkForAlerts(metrics: {
    harmony: number;
    resilience: number;
    throughput: number;
    friction: number;
    focus: number;
    velocity: number;
  }): void {
    const alerts: SessionAlert[] = [];

    // Check for critical levels
    if (
      metrics.harmony < 2 ||
      metrics.resilience < 2 ||
      metrics.throughput < 2
    ) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'crisis',
        message:
          'Critical coordination levels detected. Immediate attention required.',
        severity: 'critical',
        timestamp: new Date(),
        actionable: true,
      });
    }

    // Check for opportunities
    if (
      metrics.harmony > 8 &&
      metrics.resilience > 8 &&
      metrics.throughput > 8
    ) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'opportunity',
        message:
          'Excellent coordination levels! Optimal time for challenging tasks.',
        severity: 'low',
        timestamp: new Date(),
        actionable: false,
      });
    }

    // Add new alerts
    alerts.forEach(alert => {
      this.state.alerts.push(alert);
    });

    // Keep only last 100 alerts
    if (this.state.alerts.length > 100) {
      this.state.alerts.shift();
    }
  }

  private generateRecommendations(metrics: {
    harmony: number;
    resilience: number;
    throughput: number;
    friction: number;
    focus: number;
    velocity: number;
  }): void {
    const recommendations: SessionRecommendation[] = [];

    if (metrics.throughput < 4) {
      recommendations.push({
        id: `rec-${Date.now()}-energy`,
        type: 'suggestion',
        title: 'Low Energy Levels',
        description:
          'Your throughput (energy) is low. Consider a short walk or some light exercise.',
        priority: 'medium',
        category: 'performance',
        actionable: true,
      });
    }

    if (metrics.harmony < 4) {
      recommendations.push({
        id: `rec-${Date.now()}-harmony`,
        type: 'suggestion',
        title: 'Low Harmony',
        description:
          'Your harmony levels are low. Consider taking a short break and practicing mindfulness.',
        priority: 'medium',
        category: 'wellbeing',
        actionable: true,
      });
    }

    if (metrics.friction > 7) {
      recommendations.push({
        id: `rec-${Date.now()}-clutter`,
        type: 'warning',
        title: 'High Mental Clutter',
        description:
          'Your friction levels are high, indicating mental clutter. Try clearing your workspace.',
        priority: 'high',
        category: 'focus',
        actionable: true,
      });
    }

    if (metrics.velocity > 8) {
      recommendations.push({
        id: `rec-${Date.now()}-creativity`,
        type: 'opportunity',
        title: 'High Creativity',
        description:
          'Your creativity levels are excellent! Perfect time for brainstorming and creative tasks.',
        priority: 'low',
        category: 'creativity',
        actionable: false,
      });
    }

    // Add new recommendations
    recommendations.forEach(rec => {
      this.state.recommendations.push(rec);
    });

    // Keep only last 50 recommendations
    if (this.state.recommendations.length > 50) {
      this.state.recommendations.shift();
    }
  }

  private startSessionMonitoring(): void {
    this.sessionTimer = setInterval(() => {
      if (this.state.session) {
        this.state.session.lastActivity = new Date();
        this.state.lastUpdated = new Date();
        this.saveState();
      }
    }, 30000); // Update every 30 seconds

    // Set up event listeners
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument(e => {
        this.recordFileAccess(e.fileName);
      })
    );

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(e => {
        if (e && e.document) {
          this.recordFileAccess(e.document.fileName);
        }
      })
    );
  }

  private stopSessionMonitoring(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  private loadState(): void {
    try {
      const data = this.context.globalState.get<string>('session.state');
      if (data) {
        const parsed = JSON.parse(data);
        this.state = {
          ...this.state,
          ...parsed,
        };
      }
    } catch (error) {
      console.error('Failed to load session state:', error);
    }
  }

  private saveState(): void {
    try {
      const data = JSON.stringify(this.state);
      this.context.globalState.update('session.state', data);
    } catch (error) {
      console.error('Failed to save session state:', error);
    }
  }
}
