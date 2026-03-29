export interface Session {
  sessionId: string;
  userId: string;
  timestamp: Date;
  coordinationLevel: number;
  ucfMetrics: {
    harmony: number;
    resilience: number;
    throughput: number;
    friction: number;
    focus: number;
    velocity: number;
  };
  activeAgents: string[];
  workspaceContext: SessionContext;
  lastActivity: Date;
}

export interface SessionMetrics {
  timestamp: Date;
  harmony: number;
  resilience: number;
  throughput: number;
  friction: number;
  focus: number;
  velocity: number;
}

export interface SessionContext {
  workspaceFolders: string[];
  recentFiles: string[];
  gitStatus: GitStatus | null;
  language: string;
  projectType: string;
  userActions: UserAction[];
  lastActivity: Date;
}

export interface GitStatus {
  branch: string;
  status: 'clean' | 'modified' | 'untracked';
  ahead: number;
  behind: number;
  lastCommit?: string;
}

export interface UserAction {
  action: string;
  timestamp: Date;
  details: Record<string, any>;
}

export interface SessionAlert {
  id: string;
  type: 'crisis' | 'warning' | 'opportunity' | 'info';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  actionable: boolean;
}

export interface SessionRecommendation {
  id: string;
  type: 'suggestion' | 'warning' | 'opportunity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'wellbeing' | 'focus' | 'creativity' | 'security';
  actionable: boolean;
}

export interface SessionSnapshot {
  session: Session;
  metrics: SessionMetrics[];
  context: SessionContext;
  alerts: SessionAlert[];
  recommendations: SessionRecommendation[];
  timestamp: Date;
}

export interface SessionHistory {
  sessions: Session[];
  totalDuration: number;
  averageCoordination: number;
  mostUsedAgents: string[];
  productivityTrends: ProductivityTrend[];
}

export interface ProductivityTrend {
  date: Date;
  averageCoordination: number;
  totalActions: number;
  activeHours: number;
  filesAccessed: number;
}

export interface SessionConfiguration {
  autoStart: boolean;
  autoSave: boolean;
  metricsCollection: boolean;
  alertThresholds: AlertThresholds;
  privacySettings: PrivacySettings;
}

export interface AlertThresholds {
  coordinationLevel: {
    critical: number;
    warning: number;
  };
  ucfMetrics: {
    harmony: { critical: number; warning: number };
    resilience: { critical: number; warning: number };
    throughput: { critical: number; warning: number };
    friction: { critical: number; warning: number };
    focus: { critical: number; warning: number };
    velocity: { critical: number; warning: number };
  };
}

export interface PrivacySettings {
  collectMetrics: boolean;
  collectUserActions: boolean;
  collectFileAccess: boolean;
  shareWithAgents: boolean;
  anonymizeData: boolean;
}

export interface SessionExport {
  version: string;
  exportDate: Date;
  sessions: Session[];
  metrics: SessionMetrics[];
  context: SessionContext[];
  alerts: SessionAlert[];
  recommendations: SessionRecommendation[];
  configuration: SessionConfiguration;
}

export interface SessionImport {
  sessions: Session[];
  metrics: SessionMetrics[];
  context: SessionContext[];
  alerts: SessionAlert[];
  recommendations: SessionRecommendation[];
  mergeStrategy: 'replace' | 'merge' | 'append';
}

export interface SessionAnalytics {
  totalSessions: number;
  totalDuration: number;
  averageSessionLength: number;
  peakProductivityHours: number[];
  mostActiveDays: string[];
  coordinationLevelDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  agentUsageStats: AgentUsageStats[];
  productivityScore: number;
}

export interface AgentUsageStats {
  agentId: string;
  agentName: string;
  totalUsage: number;
  averageResponseTime: number;
  successRate: number;
  lastUsed: Date;
}

export interface SessionReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalSessions: number;
    totalDuration: number;
    averageCoordination: number;
    productivityScore: number;
  };
  trends: {
    coordinationTrend: number[];
    productivityTrend: number[];
    agentUsageTrend: AgentUsageTrend[];
  };
  insights: string[];
  recommendations: SessionRecommendation[];
  exportDate: Date;
}

export interface AgentUsageTrend {
  date: Date;
  agentId: string;
  usageCount: number;
  averageResponseTime: number;
}

export interface SessionBackup {
  id: string;
  sessionId: string;
  backupDate: Date;
  data: SessionExport;
  size: number;
  location: string;
  status: 'creating' | 'completed' | 'failed';
}

export interface SessionRestore {
  backupId: string;
  restoreDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  conflicts: string[];
  restoredItems: string[];
}

export interface SessionMigration {
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  estimatedTime: number;
  rollbackSteps: MigrationStep[];
}

export interface MigrationStep {
  id: string;
  description: string;
  type: 'backup' | 'transform' | 'validate' | 'cleanup';
  required: boolean;
  estimatedTime: number;
}

export interface SessionHealthCheck {
  sessionId: string;
  checkDate: Date;
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
}

export interface SessionCollaboration {
  sessionId: string;
  collaborators: Collaborator[];
  sharedResources: SharedResource[];
  permissions: CollaborationPermissions;
  lastSync: Date;
}

export interface Collaborator {
  userId: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActivity: Date;
}

export interface SharedResource {
  type: 'file' | 'agent' | 'workflow' | 'configuration';
  resourceId: string;
  permissions: 'read' | 'write' | 'execute';
  sharedAt: Date;
}

export interface CollaborationPermissions {
  canShareFiles: boolean;
  canInviteUsers: boolean;
  canModifySettings: boolean;
  canDeleteSession: boolean;
}

export interface SessionNotification {
  id: string;
  sessionId: string;
  type: 'alert' | 'recommendation' | 'reminder' | 'update';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  command: string;
  args?: any[];
}

export interface SessionIntegration {
  sessionId: string;
  integrations: IntegrationConfig[];
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSync: Date;
  errors: string[];
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'git' | 'ci_cd' | 'monitoring' | 'communication';
  enabled: boolean;
  configuration: Record<string, any>;
  lastActivity: Date;
}

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  configuration: SessionConfiguration;
  defaultContext: Partial<SessionContext>;
  defaultMetrics: Partial<SessionMetrics>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SessionPreference {
  userId: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      enabled: boolean;
      types: string[];
      quietHours: {
        start: string;
        end: string;
      };
    };
    performance: {
      metricsCollection: boolean;
      autoSaveInterval: number;
      maxHistorySize: number;
    };
  };
  lastUpdated: Date;
}

export interface SessionAuditLog {
  sessionId: string;
  entries: AuditEntry[];
  lastCleared: Date;
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionBenchmark {
  sessionId: string;
  benchmarks: BenchmarkResult[];
  baseline: BenchmarkBaseline;
  comparisonDate: Date;
}

export interface BenchmarkResult {
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'improved' | 'degraded' | 'unchanged';
}

export interface BenchmarkBaseline {
  metrics: Record<string, number>;
  timestamp: Date;
  configuration: SessionConfiguration;
}

export interface SessionWorkflow {
  sessionId: string;
  workflows: WorkflowState[];
  executionHistory: WorkflowExecution[];
  triggers: WorkflowTrigger[];
}

export interface WorkflowState {
  workflowId: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastExecuted: Date;
  executionCount: number;
  averageExecutionTime: number;
}

export interface WorkflowExecution {
  workflowId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  input: any;
  output?: any;
  error?: string;
}

export interface WorkflowTrigger {
  workflowId: string;
  triggerType: 'time' | 'event' | 'condition';
  configuration: Record<string, any>;
  enabled: boolean;
  lastTriggered: Date;
}
