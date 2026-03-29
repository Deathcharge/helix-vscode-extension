export type WorkflowStatus = 'active' | 'inactive' | 'error' | 'maintenance';
export type WorkflowNodeType =
  | 'agent'
  | 'condition'
  | 'action'
  | 'input'
  | 'output'
  | 'loop'
  | 'parallel';
export type WorkflowConnectionType = 'success' | 'failure' | 'conditional';
export type WorkflowExecutionStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  status: WorkflowStatus;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  category: string;
  tags: string[];
  version: string;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description: string;
  position: { x: number; y: number };
  configuration: NodeConfiguration;
  metadata: NodeMetadata;
}

export interface NodeConfiguration {
  agentId?: string;
  actionType?: string;
  condition?: string;
  input?: any;
  output?: any;
  parameters: Record<string, any>;
  settings: Record<string, any>;
}

export interface NodeMetadata {
  dependencies: string[];
  capabilities: string[];
  estimatedExecutionTime: number;
  retryPolicy: RetryPolicy;
  timeout: number;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryConditions: string[];
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: WorkflowConnectionType;
  condition?: string;
  metadata: ConnectionMetadata;
}

export interface ConnectionMetadata {
  weight: number;
  description: string;
  enabled: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  startTime: Date;
  endTime?: Date;
  input: any;
  output?: any;
  error?: string;
  executionTime: number;
  nodesExecuted: string[];
  progress: ExecutionProgress[];
  metadata: ExecutionMetadata;
}

export interface ExecutionProgress {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  output?: any;
  error?: string;
}

export interface ExecutionMetadata {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  parallelExecutions: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  version: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  dependencies: string[];
}

export interface WorkflowValidation {
  workflowId: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  performanceMetrics: PerformanceMetrics;
}

export interface ValidationError {
  type: 'node' | 'connection' | 'configuration';
  nodeId?: string;
  connectionId?: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  type: 'performance' | 'best_practice' | 'deprecated';
  message: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
}

export interface PerformanceMetrics {
  estimatedExecutionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkCalls: number;
  databaseQueries: number;
  parallelNodes: number;
}

export interface WorkflowDebugInfo {
  workflowId: string;
  executionId: string;
  debugLog: DebugLogEntry[];
  variableState: Record<string, any>;
  nodeStates: NodeDebugState[];
  breakpoints: string[];
  stepMode: boolean;
}

export interface DebugLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  data?: any;
}

export interface NodeDebugState {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: any;
  output?: any;
  error?: string;
  executionTime: number;
  variables: Record<string, any>;
}

export interface WorkflowImport {
  workflows: Workflow[];
  templates: WorkflowTemplate[];
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  importStrategy: 'replace' | 'merge' | 'append';
  conflictResolution: 'overwrite' | 'skip' | 'rename';
}

export interface WorkflowExport {
  version: string;
  exportDate: Date;
  workflows: Workflow[];
  templates: WorkflowTemplate[];
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  source: string;
  format: string;
  includesTemplates: boolean;
  includesExecutions: boolean;
  exportOptions: Record<string, any>;
}

export interface WorkflowMigration {
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  rollbackSteps: MigrationStep[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  validationRequired: boolean;
}

export interface MigrationStep {
  id: string;
  type: 'backup' | 'transform' | 'validate' | 'cleanup';
  description: string;
  required: boolean;
  estimatedTime: number;
  rollbackRequired: boolean;
  validation: (workflow: Workflow) => boolean;
}

export interface WorkflowOptimization {
  workflowId: string;
  optimizations: OptimizationSuggestion[];
  estimatedImprovements: PerformanceImprovement;
  riskAssessment: RiskAssessment;
}

export interface OptimizationSuggestion {
  type:
    | 'parallelization'
    | 'caching'
    | 'simplification'
    | 'resource_optimization';
  description: string;
  implementation: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  complexity: 'low' | 'medium' | 'high';
}

export interface PerformanceImprovement {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkCalls: number;
  costReduction: number;
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  potentialIssues: string[];
  mitigationStrategies: string[];
  testingRequired: boolean;
}

export interface WorkflowMonitoring {
  workflowId: string;
  metrics: WorkflowMetrics;
  alerts: WorkflowAlert[];
  dashboards: WorkflowDashboard[];
  reports: WorkflowReport[];
}

export interface WorkflowMetrics {
  executionCount: number;
  successRate: number;
  averageExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  errorRate: number;
  resourceUsage: ResourceUsage;
  throughput: ThroughputMetrics;
}

export interface ResourceUsage {
  averageMemory: number;
  peakMemory: number;
  averageCPU: number;
  peakCPU: number;
  networkUsage: number;
  storageUsage: number;
}

export interface ThroughputMetrics {
  executionsPerMinute: number;
  executionsPerHour: number;
  executionsPerDay: number;
  concurrentExecutions: number;
  queueDepth: number;
}

export interface WorkflowAlert {
  id: string;
  workflowId: string;
  type: 'performance' | 'error' | 'resource' | 'timeout';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface WorkflowDashboard {
  id: string;
  workflowId: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  refreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'log' | 'timeline';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  configuration: WidgetConfiguration;
  data: any;
}

export interface WidgetConfiguration {
  metricType: string;
  timeRange: TimeRange;
  aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count';
  filters: Record<string, any>;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date' | 'node' | 'status' | 'error';
  defaultValue: any;
  options?: any[];
}

export interface TimeRange {
  start: Date;
  end: Date;
  relative?: boolean;
  relativeUnit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  relativeValue?: number;
}

export interface WorkflowReport {
  id: string;
  workflowId: string;
  type: 'performance' | 'usage' | 'error' | 'optimization';
  period: TimeRange;
  generatedAt: Date;
  data: ReportData;
  format: 'json' | 'csv' | 'pdf' | 'html';
}

export interface ReportData {
  summary: ReportSummary;
  details: ReportDetail[];
  charts: ReportChart[];
  recommendations: string[];
}

export interface ReportSummary {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  totalErrors: number;
  resourceUsage: ResourceUsage;
}

export interface ReportDetail {
  timestamp: Date;
  executionId: string;
  status: WorkflowExecutionStatus;
  executionTime: number;
  error?: string;
  nodesExecuted: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ReportChart {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  title: string;
  data: any;
  configuration: ChartConfiguration;
}

export interface ChartConfiguration {
  xAxis: string;
  yAxis: string;
  colorScheme: string;
  aggregation: string;
  filters: Record<string, any>;
}

export interface WorkflowCollaboration {
  workflowId: string;
  collaborators: Collaborator[];
  permissions: CollaborationPermissions;
  versionHistory: WorkflowVersion[];
  comments: WorkflowComment[];
}

export interface Collaborator {
  userId: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActivity: Date;
  permissions: string[];
}

export interface CollaborationPermissions {
  canEdit: boolean;
  canExecute: boolean;
  canShare: boolean;
  canDelete: boolean;
  canManageCollaborators: boolean;
}

export interface WorkflowVersion {
  version: string;
  createdAt: Date;
  createdBy: string;
  changes: string[];
  isCurrent: boolean;
  rollbackAvailable: boolean;
}

export interface WorkflowComment {
  id: string;
  nodeId?: string;
  author: string;
  content: string;
  timestamp: Date;
  replies: WorkflowComment[];
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface WorkflowBackup {
  id: string;
  workflowId: string;
  backupDate: Date;
  data: WorkflowExport;
  size: number;
  location: string;
  status: 'creating' | 'completed' | 'failed';
  expiresAt?: Date;
}

export interface WorkflowRestore {
  backupId: string;
  restoreDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  conflicts: string[];
  restoredItems: string[];
  rollbackAvailable: boolean;
}

export interface WorkflowIntegration {
  workflowId: string;
  integrations: IntegrationConfig[];
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSync: Date;
  errors: string[];
  webhooks: WebhookConfig[];
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'git' | 'ci_cd' | 'monitoring' | 'communication' | 'database';
  enabled: boolean;
  configuration: Record<string, any>;
  lastActivity: Date;
  permissions: string[];
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
  retries: number;
  timeout: number;
}

export interface WorkflowSecurity {
  workflowId: string;
  securityLevel: 'public' | 'private' | 'restricted';
  accessControl: AccessControlList;
  encryption: EncryptionConfig;
  auditLog: SecurityAuditLog[];
  compliance: ComplianceStatus;
}

export interface AccessControlList {
  users: string[];
  groups: string[];
  permissions: Permission[];
  inheritance: boolean;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions: Record<string, any>;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyRotation: KeyRotationConfig;
  dataAtRest: boolean;
  dataInTransit: boolean;
}

export interface KeyRotationConfig {
  enabled: boolean;
  interval: number;
  algorithm: string;
  backupKeys: boolean;
}

export interface SecurityAuditLog {
  timestamp: Date;
  action: string;
  actor: string;
  resource: string;
  result: 'success' | 'failure';
  details: Record<string, any>;
}

export interface ComplianceStatus {
  standards: string[];
  lastAudit: Date;
  nextAudit: Date;
  violations: ComplianceViolation[];
  certifications: string[];
}

export interface ComplianceViolation {
  id: string;
  standard: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  resolvedAt?: Date;
  remediation: string;
}
