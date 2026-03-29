export type ProductCategory = 'agent' | 'tool' | 'integration' | 'template';
export type ProductStatus =
  | 'available'
  | 'unavailable'
  | 'beta'
  | 'deprecated'
  | 'enabled'
  | 'disabled';
export type ProductInstallationStatus =
  | 'not-installed'
  | 'installing'
  | 'installed'
  | 'failed'
  | 'updating';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  rating: number;
  downloads: number;
  capabilities: string[];
  compatibility: string[];
  version: string;
  thumbnail: string;
  demoUrl?: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  license: string;
  author: string;
  tags: string[];
  dependencies: string[];
  installedAt?: Date;
}

export interface ProductFilter {
  category?: ProductCategory;
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  compatibility?: string[];
  tags?: string[];
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductUpdate {
  productId: string;
  productName: string;
  currentVersion: string;
  newVersion: string;
  description: string;
  changelog: string[];
  breakingChanges: boolean;
  downloadUrl?: string;
}

export interface ProductInstallation {
  productId: string;
  status: ProductInstallationStatus;
  progress: number;
  error?: string;
  installedAt?: Date;
  version?: string;
}

export interface ProductLicense {
  productId: string;
  licenseKey: string;
  expiresAt?: Date;
  isActive: boolean;
  features: string[];
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  verified: boolean;
}

export interface ProductAnalytics {
  productId: string;
  installs: number;
  uninstalls: number;
  activeUsers: number;
  averageRating: number;
  totalReviews: number;
  lastUpdated: Date;
}

export interface ProductBundle {
  id: string;
  name: string;
  description: string;
  products: string[];
  price: number;
  discount: number;
  createdAt: Date;
}

export interface ProductCompatibility {
  productIds: string[];
  compatibilityMatrix: Record<string, string[]>;
  conflicts: string[];
  dependencies: string[];
}

export interface ProductConfiguration {
  productId: string;
  settings: Record<string, any>;
  defaults: Record<string, any>;
  schema: any;
  validation: (config: any) => boolean;
}

export interface ProductMetrics {
  productId: string;
  usage: {
    totalUses: number;
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    averageRevenuePerUser: number;
  };
}

export interface ProductHealth {
  productId: string;
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  lastCheck: Date;
  issues: string[];
  recommendations: string[];
  dependencies: ProductHealth[];
}

export interface ProductMigration {
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  rollbackSteps: MigrationStep[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MigrationStep {
  id: string;
  description: string;
  type: 'backup' | 'update' | 'validate' | 'cleanup';
  required: boolean;
  estimatedTime: number;
  rollbackRequired: boolean;
}

export interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  templateData: any;
  variables: TemplateVariable[];
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  defaultValue: any;
  description: string;
  required: boolean;
  validation?: (value: any) => boolean;
}

export interface ProductIntegration {
  productId: string;
  integrationId: string;
  name: string;
  description: string;
  configuration: Record<string, any>;
  enabled: boolean;
  lastSync?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface ProductDependency {
  productId: string;
  dependencyId: string;
  version: string;
  optional: boolean;
  description: string;
  compatibility: string[];
}

export interface ProductChangelog {
  version: string;
  date: Date;
  changes: ChangelogEntry[];
  breakingChanges: string[];
  migrationGuide?: string;
}

export interface ChangelogEntry {
  type:
    | 'feature'
    | 'enhancement'
    | 'bugfix'
    | 'security'
    | 'deprecation'
    | 'removal';
  description: string;
  issue?: string;
  author?: string;
}

export interface ProductSupport {
  productId: string;
  supportLevel: 'community' | 'standard' | 'premium' | 'enterprise';
  responseTime: string;
  supportChannels: string[];
  documentation: string;
  community: string;
  enterpriseSupport?: {
    dedicatedAccountManager: boolean;
    priorityResponse: boolean;
    customSLA: boolean;
  };
}

export interface ProductTrial {
  productId: string;
  trialPeriod: number; // days
  features: string[];
  limitations: string[];
  autoRenew: boolean;
  expiresAt: Date;
  activatedAt?: Date;
}

export interface ProductSubscription {
  productId: string;
  subscriptionId: string;
  userId: string;
  plan: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  startDate: Date;
  endDate: Date;
  billingCycle: 'monthly' | 'yearly';
  autoRenew: boolean;
  lastBilledAt?: Date;
  nextBillingAt?: Date;
}

export interface ProductUsage {
  productId: string;
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  actions: UsageAction[];
  resources: UsageResource[];
  metrics: Record<string, number>;
}

export interface UsageAction {
  type: string;
  timestamp: Date;
  details: Record<string, any>;
  duration?: number;
}

export interface UsageResource {
  type: string;
  resourceId: string;
  action: 'created' | 'read' | 'updated' | 'deleted';
  timestamp: Date;
  size?: number;
}

export interface ProductFeedback {
  productId: string;
  userId: string;
  feedback: string;
  rating: number;
  category: 'bug' | 'feature' | 'improvement' | 'question';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ProductAnnouncement {
  id: string;
  productId: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  publishedAt: Date;
  expiresAt?: Date;
  readBy: string[];
}

export interface ProductBackup {
  productId: string;
  backupId: string;
  name: string;
  description: string;
  createdAt: Date;
  size: number;
  location: string;
  status: 'creating' | 'completed' | 'failed' | 'expired';
  expiresAt?: Date;
  restorePoints: RestorePoint[];
}

export interface RestorePoint {
  id: string;
  timestamp: Date;
  description: string;
  size: number;
  type: 'full' | 'incremental' | 'snapshot';
}

export interface ProductMonitoring {
  productId: string;
  metrics: ProductMetrics;
  health: ProductHealth;
  alerts: ProductAlert[];
  logs: ProductLog[];
  dashboards: ProductDashboard[];
}

export interface ProductAlert {
  id: string;
  productId: string;
  type: 'metric' | 'health' | 'usage' | 'security';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface ProductLog {
  productId: string;
  logId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  source: string;
  metadata: Record<string, any>;
}

export interface ProductDashboard {
  id: string;
  productId: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'log';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  configuration: Record<string, any>;
  data: any;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date' | 'category' | 'metric' | 'user';
  defaultValue: any;
  options?: any[];
}
