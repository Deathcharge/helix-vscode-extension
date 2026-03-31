import * as vscode from 'vscode';
import { errorHandler } from './errorHandler';
import { logger } from '../utils/logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    refreshToken: string;
    user: {
      id: string;
      username: string;
      email: string;
    };
  };
  error?: string;
  statusCode: number;
}

export interface AgentTask {
  id: string;
  type:
    | 'code_analysis'
    | 'test_generation'
    | 'refactoring'
    | 'documentation'
    | 'custom';
  prompt: string;
  context?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
}

export interface AgentResult {
  taskId: string;
  success: boolean;
  output: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface UCFFullMetrics {
  harmony: number; // 0-10 scale
  resilience: number; // 0-10 scale
  throughput: number; // 0-10 scale
  friction: number; // 0-10 scale (lower is better)
  focus: number; // 0-10 scale
  velocity: number; // 0-10 scale
}

export interface CoordinationAlert {
  id: string;
  type: 'crisis' | 'opportunity' | 'recommendation';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  actionable: boolean;
  action?: () => void;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  category: 'agent' | 'tool' | 'integration' | 'template';
  price: number;
  rating: number;
  downloads: number;
  capabilities: string[];
  compatibility: string[];
  thumbnail?: string;
  demoUrl?: string;
}

export interface InstallationResult {
  success: boolean;
  productId: string;
  version: string;
  message: string;
}

export interface WorkflowConfig {
  name: string;
  description: string;
  nodes: SpiralNode[];
  connections: SpiralConnection[];
}

export interface SpiralNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'agent';
  agentId?: string;
  configuration: Record<string, any>;
  position: { x: number; y: number };
}

export interface SpiralConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: string;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'success' | 'failed' | 'cancelled';
  output?: any;
  error?: string;
  executionTime: number;
  nodesExecuted: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DebugResult {
  workflowId: string;
  executionLog: DebugLogEntry[];
  errors: string[];
  performanceMetrics: {
    executionTime: number;
    memoryUsage: number;
    nodeExecutionTimes: Record<string, number>;
  };
}

export interface DebugLogEntry {
  nodeId: string;
  timestamp: Date;
  action: string;
  input?: any;
  output?: any;
  error?: string;
}

// Subscription tier features configuration
const TIER_FEATURES: Record<string, string[]> = {
  free: ['basic_agents', 'community_support'],
  hobby: ['basic_agents', 'email_support', 'export'],
  starter: [
    'advanced_agents',
    'priority_support',
    'export',
    'api_access',
    'workflows',
  ],
  pro: [
    'all_agents',
    'priority_support',
    'export',
    'api_access',
    'workflows',
    'advanced_analytics',
    'webhooks',
  ],
  enterprise: [
    'all_agents',
    'dedicated_support',
    'export',
    'api_access',
    'workflows',
    'advanced_analytics',
    'webhooks',
    'custom_agents',
    'sso',
    'sla',
  ],
};

// Feature requirements by tier (minimum tier required)
const FEATURE_REQUIREMENTS: Record<string, string> = {
  agentic_analyze: 'free',
  agentic_generate: 'hobby',
  agentic_refactor: 'hobby',
  agentic_explain: 'free',
  agentic_tests: 'starter',
  workflows_create: 'starter',
  workflows_execute: 'starter',
  marketplace_install: 'free',
  forum_post: 'free',
  export_results: 'hobby',
  advanced_metrics: 'starter',
  coordination_alerts: 'pro',
  agent_swarm: 'pro',
  custom_agents: 'enterprise',
};

const TIER_ORDER = ['free', 'hobby', 'starter', 'pro', 'enterprise'];

export class ApiService {
  private baseUrl: string;
  private headers: Record<string, string>;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;
  private cachedSubscription: SubscriptionStatus | null = null;
  private subscriptionCacheTime: number = 0;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Get base URL from configuration
    const config = vscode.workspace.getConfiguration('helix');
    this.baseUrl = config.get('apiEndpoint', 'https://api.helixcollective.io');

    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Helix-VSCode-Extension/1.0.0',
      'X-Helix-Platform': 'vscode_copilot',
    };
  }

  async initialize(): Promise<void> {
    // Test connection to API
    try {
      await this.get('/api/health');
      logger.info('APIService initialized successfully');
    } catch (error) {
      logger.warn(
        'API health check failed, but continuing initialization:',
        error
      );
    }
  }

  dispose(): void {
    // Clean up any resources if needed
  }

  setEndpoint(endpoint: string): void {
    this.baseUrl = endpoint;
  }

  // Authentication methods
  async authenticate(credentials: {
    username: string;
    password: string;
  }): Promise<AuthResponse> {
    try {
      const response = await this.post<AuthResponse>(
        '/api/auth/login',
        credentials
      );
      return response;
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.authenticate(credentials),
        this.retryAttempts
      );
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await this.post<AuthResponse>('/api/auth/refresh', {
        refreshToken,
      });
      return response;
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.refreshToken(refreshToken),
        this.retryAttempts
      );
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout', {});
    } catch (error) {
      logger.warn('Logout request failed:', error);
      // Don't throw error for logout failures
    }
  }

  // Agent-related methods
  async getAgents(): Promise<ApiResponse<any[]>> {
    try {
      return await this.get('/api/agents/list');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getAgents(),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getAgentStatus(agentId: string): Promise<ApiResponse<any>> {
    try {
      return await this.get(`/api/agents/agents/${agentId}`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getAgentStatus(agentId),
        this.retryAttempts
      );
      throw error;
    }
  }

  async executeAgentTask(task: AgentTask): Promise<ApiResponse<AgentResult>> {
    try {
      return await this.post('/api/agents/collaboration/run', task);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.executeAgentTask(task),
        this.retryAttempts
      );
      throw error;
    }
  }

  // Coordination-related methods
  async getCoordinationMetrics(): Promise<ApiResponse<UCFFullMetrics>> {
    // Real UCF metrics are on /api/health/detailed under the ucf_metrics key.
    // The legacy /api/coordination/metrics route does not exist.
    try {
      const res = await this.get<{
        ucf_metrics?: Partial<UCFFullMetrics>;
        coordination?: { level?: number };
      }>('/api/health/detailed');
      const resData = res as any;
      if (resData.data?.ucf_metrics) {
        return {
          success: true,
          statusCode: 200,
          data: resData.data.ucf_metrics as UCFFullMetrics,
        };
      }
      return res as unknown as ApiResponse<UCFFullMetrics>;
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getCoordinationMetrics(),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getCoordinationAlerts(): Promise<ApiResponse<CoordinationAlert[]>> {
    try {
      return await this.get('/api/coordination/alerts');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getCoordinationAlerts(),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getCoordinationRecommendations(): Promise<
    ApiResponse<CoordinationAlert[]>
  > {
    try {
      return await this.get('/api/coordination/recommendations');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getCoordinationRecommendations(),
        this.retryAttempts
      );
      throw error;
    }
  }

  // Marketplace-related methods
  async browseProducts(
    category?: string
  ): Promise<ApiResponse<MarketplaceProduct[]>> {
    try {
      const params = category ? `?category=${category}` : '';
      return await this.get(`/api/marketplace/products${params}`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.browseProducts(category),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getProduct(
    productId: string
  ): Promise<ApiResponse<MarketplaceProduct>> {
    try {
      return await this.get(`/api/marketplace/products/${productId}`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getProduct(productId),
        this.retryAttempts
      );
      throw error;
    }
  }

  async installProduct(
    productId: string
  ): Promise<ApiResponse<InstallationResult>> {
    try {
      return await this.post(
        `/api/marketplace/products/${productId}/install`,
        {}
      );
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.installProduct(productId),
        this.retryAttempts
      );
      throw error;
    }
  }

  async uninstallProduct(productId: string): Promise<ApiResponse<void>> {
    try {
      return await this.delete(
        `/api/marketplace/products/${productId}/uninstall`
      );
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.uninstallProduct(productId),
        this.retryAttempts
      );
      throw error;
    }
  }

  async checkProductUpdates(): Promise<ApiResponse<any[]>> {
    try {
      return await this.get('/api/marketplace/updates');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.checkProductUpdates(),
        this.retryAttempts
      );
      throw error;
    }
  }

  // Workflow-related methods
  async createWorkflow(config: WorkflowConfig): Promise<ApiResponse<any>> {
    try {
      return await this.post('/api/spirals', config);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.createWorkflow(config),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getWorkflow(workflowId: string): Promise<ApiResponse<any>> {
    try {
      return await this.get(`/api/spirals/${workflowId}`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getWorkflow(workflowId),
        this.retryAttempts
      );
      throw error;
    }
  }

  async executeWorkflow(
    workflowId: string,
    context: Record<string, any>
  ): Promise<ApiResponse<WorkflowResult>> {
    try {
      return await this.post(`/api/spirals/${workflowId}/execute`, context);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.executeWorkflow(workflowId, context),
        this.retryAttempts
      );
      throw error;
    }
  }

  async validateWorkflow(
    workflowId: string
  ): Promise<ApiResponse<ValidationResult>> {
    try {
      return await this.post(`/api/spirals/${workflowId}/validate`, {});
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.validateWorkflow(workflowId),
        this.retryAttempts
      );
      throw error;
    }
  }

  async debugWorkflow(workflowId: string): Promise<ApiResponse<DebugResult>> {
    try {
      return await this.get(`/api/spirals/${workflowId}/debug`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.debugWorkflow(workflowId),
        this.retryAttempts
      );
      throw error;
    }
  }

  // Basic HTTP methods
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const requestOptions: RequestInit = {
      method,
      headers: this.headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      return responseData as T;
    } catch (error) {
      logger.error(`API request failed for ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  setAuthToken(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.headers['Authorization'];
  }

  updateBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // =====================================================
  // Agentic Coder - AI-Powered Code Operations
  // =====================================================
  async agenticAnalyzeCode(
    code: string,
    language: string
  ): Promise<ApiResponse<AgenticAnalysisResult>> {
    try {
      return await this.post('/api/agentic/analyze', { code, language });
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.agenticAnalyzeCode(code, language),
        this.retryAttempts
      );
      throw error;
    }
  }

  async agenticGenerateCode(
    prompt: string,
    context?: string
  ): Promise<ApiResponse<AgenticGenerationResult>> {
    try {
      return await this.post('/api/agentic/generate', { prompt, context });
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.agenticGenerateCode(prompt, context),
        this.retryAttempts
      );
      throw error;
    }
  }

  async agenticRefactorCode(
    code: string,
    instructions: string
  ): Promise<ApiResponse<AgenticRefactorResult>> {
    try {
      return await this.post('/api/agentic/refactor', { code, instructions });
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.agenticRefactorCode(code, instructions),
        this.retryAttempts
      );
      throw error;
    }
  }

  async agenticExplainCode(
    code: string
  ): Promise<ApiResponse<AgenticExplanation>> {
    try {
      return await this.post('/api/agentic/explain', { code });
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.agenticExplainCode(code),
        this.retryAttempts
      );
      throw error;
    }
  }

  async agenticApplyDiff(
    filePath: string,
    diff: string
  ): Promise<ApiResponse<DiffApplyResult>> {
    try {
      return await this.post('/api/agentic/apply-diff', {
        file_path: filePath,
        diff,
      });
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.agenticApplyDiff(filePath, diff),
        this.retryAttempts
      );
      throw error;
    }
  }

  async agenticGenerateTests(
    code: string,
    language?: string,
    framework?: string,
    filePath?: string
  ): Promise<ApiResponse<AgenticTestResult>> {
    try {
      return await this.post('/api/agentic/generate-tests', {
        code,
        language,
        framework,
        file_path: filePath,
      });
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.agenticGenerateTests(code, language, framework, filePath),
        this.retryAttempts
      );
      throw error;
    }
  }

  // =====================================================
  // Forum Integration
  // =====================================================
  async getForumPosts(
    category?: string,
    page = 1
  ): Promise<ApiResponse<ForumPost[]>> {
    try {
      const params = category
        ? `?category=${category}&page=${page}`
        : `?page=${page}`;
      return await this.get(`/api/forum/posts${params}`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getForumPosts(category, page),
        this.retryAttempts
      );
      throw error;
    }
  }

  async createForumPost(
    title: string,
    content: string,
    categoryId: string
  ): Promise<ApiResponse<ForumPost>> {
    try {
      return await this.post('/api/forum/posts', {
        title,
        content,
        category_id: categoryId,
      });
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.createForumPost(title, content, categoryId),
        this.retryAttempts
      );
      throw error;
    }
  }

  async shareCodeSnippet(
    code: string,
    language: string,
    title: string
  ): Promise<ApiResponse<ForumPost>> {
    try {
      const content = `\`\`\`${language}\n${code}\n\`\`\``;
      return await this.post('/api/forum/posts', {
        title,
        content,
        category_id: 'code-snippets',
        tags: [language, 'code-share'],
      });
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.shareCodeSnippet(code, language, title),
        this.retryAttempts
      );
      throw error;
    }
  }

  // =====================================================
  // Billing & Subscription Status with Caching
  // =====================================================
  async getSubscriptionStatus(): Promise<ApiResponse<SubscriptionStatus>> {
    try {
      return await this.get('/api/billing/subscription');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getSubscriptionStatus(),
        this.retryAttempts
      );
      throw error;
    }
  }

  /**
   * Get cached subscription status with automatic refresh
   */
  async getCachedSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    const now = Date.now();

    // Check if cache is still valid
    if (
      this.cachedSubscription &&
      now - this.subscriptionCacheTime < this.CACHE_DURATION_MS
    ) {
      return this.cachedSubscription;
    }

    // Fetch fresh data
    try {
      const response = await this.getSubscriptionStatus();
      if (response.success && response.data) {
        this.cachedSubscription = response.data;
        this.subscriptionCacheTime = now;
        return response.data;
      }
    } catch (error) {
      logger.warn('Failed to fetch subscription status:', error);
    }

    // Return cached data even if stale, or null
    return this.cachedSubscription;
  }

  /**
   * Clear subscription cache (call after login/logout)
   */
  clearSubscriptionCache(): void {
    this.cachedSubscription = null;
    this.subscriptionCacheTime = 0;
  }

  /**
   * Check if user has access to a specific feature based on their tier
   */
  async checkFeatureAccess(
    feature: string
  ): Promise<{ allowed: boolean; tier: string; required: string }> {
    const subscription = await this.getCachedSubscriptionStatus();

    if (!subscription) {
      return {
        allowed: false,
        tier: 'unknown',
        required: FEATURE_REQUIREMENTS[feature] || 'free',
      };
    }

    const userTier = subscription.tier || 'free';
    const requiredTier = FEATURE_REQUIREMENTS[feature] || 'free';

    const userTierIndex = TIER_ORDER.indexOf(userTier);
    const requiredTierIndex = TIER_ORDER.indexOf(requiredTier);

    return {
      allowed: userTierIndex >= requiredTierIndex,
      tier: userTier,
      required: requiredTier,
    };
  }

  /**
   * Check if feature is available for the user's tier and show upgrade prompt if not
   */
  async requireFeature(feature: string, featureName: string): Promise<boolean> {
    const access = await this.checkFeatureAccess(feature);

    if (access.allowed) {
      return true;
    }

    // Show upgrade notification
    const message = `${featureName} requires ${access.required} tier or higher. You are on ${access.tier} tier.`;
    const selection = await vscode.window.showWarningMessage(
      message,
      'Upgrade',
      'Learn More',
      'Cancel'
    );

    if (selection === 'Upgrade') {
      vscode.env.openExternal(
        vscode.Uri.parse('https://helixspiral.work/marketplace/pricing')
      );
    } else if (selection === 'Learn More') {
      vscode.env.openExternal(
        vscode.Uri.parse('https://helixspiral.work/pricing')
      );
    }

    return false;
  }

  /**
   * Get usage stats with warning notifications for high usage
   */
  async getUsageStatsWithWarnings(): Promise<ApiResponse<UsageStats>> {
    const response = await this.getUsageStats();

    if (response.success && response.data) {
      const stats = response.data;

      // Check API calls
      if (stats.apiCalls.limit > 0) {
        const apiPercent = (stats.apiCalls.used / stats.apiCalls.limit) * 100;
        if (apiPercent >= 90) {
          vscode.window
            .showWarningMessage(
              `You've used ${apiPercent.toFixed(
                0
              )}% of your daily API calls. Upgrade for more.`,
              'Upgrade'
            )
            .then(selection => {
              if (selection === 'Upgrade') {
                vscode.env.openExternal(
                  vscode.Uri.parse(
                    'https://helixspiral.work/marketplace/pricing'
                  )
                );
              }
            });
        }
      }

      // Check agent tasks
      if (stats.agentTasks.limit > 0) {
        const taskPercent =
          (stats.agentTasks.used / stats.agentTasks.limit) * 100;
        if (taskPercent >= 90) {
          vscode.window
            .showWarningMessage(
              `You've used ${taskPercent.toFixed(
                0
              )}% of your daily agent tasks.`,
              'Upgrade'
            )
            .then(selection => {
              if (selection === 'Upgrade') {
                vscode.env.openExternal(
                  vscode.Uri.parse(
                    'https://helixspiral.work/marketplace/pricing'
                  )
                );
              }
            });
        }
      }
    }

    return response;
  }

  async getUsageStats(): Promise<ApiResponse<UsageStats>> {
    try {
      return await this.get('/api/billing/usage');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getUsageStats(),
        this.retryAttempts
      );
      throw error;
    }
  }

  // =====================================================
  // Knowledge Base
  // =====================================================
  async searchKnowledgeBase(
    query: string
  ): Promise<ApiResponse<KnowledgeArticle[]>> {
    try {
      return await this.get(
        `/api/knowledge/search?q=${encodeURIComponent(query)}`
      );
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.searchKnowledgeBase(query),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getKnowledgeArticle(
    articleId: string
  ): Promise<ApiResponse<KnowledgeArticle>> {
    try {
      return await this.get(`/api/knowledge/articles/${articleId}`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getKnowledgeArticle(articleId),
        this.retryAttempts
      );
      throw error;
    }
  }

  // =====================================================
  // Video Streaming (Preview in Editor)
  // =====================================================
  async getVideoList(): Promise<ApiResponse<VideoInfo[]>> {
    try {
      return await this.get('/stream/videos');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getVideoList(),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getVideoDetails(videoId: string): Promise<ApiResponse<VideoDetails>> {
    try {
      return await this.get(`/stream/videos/${videoId}`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getVideoDetails(videoId),
        this.retryAttempts
      );
      throw error;
    }
  }

  // =====================================================
  // Analytics & Metrics
  // =====================================================
  async getAnalyticsDashboard(): Promise<ApiResponse<AnalyticsDashboard>> {
    try {
      return await this.get('/api/analytics/dashboard');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getAnalyticsDashboard(),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getAgentPerformanceMetrics(
    agentId: string
  ): Promise<ApiResponse<AgentMetrics>> {
    try {
      return await this.get(`/api/analytics/agents/${agentId}`);
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getAgentPerformanceMetrics(agentId),
        this.retryAttempts
      );
      throw error;
    }
  }

  // =====================================================
  // System Health
  // =====================================================
  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    try {
      return await this.get('/health');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getSystemHealth(),
        this.retryAttempts
      );
      throw error;
    }
  }

  async getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
    try {
      return await this.get('/api/status');
    } catch (error) {
      await errorHandler.handleApiError(
        error as Error,
        () => this.getSystemStatus(),
        this.retryAttempts
      );
      throw error;
    }
  }
}

// =====================================================
// Extended Type Definitions
// =====================================================
export interface AgenticAnalysisResult {
  issues: CodeIssue[];
  suggestions: string[];
  complexity: number;
  maintainability: number;
}

export interface CodeIssue {
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
}

export interface AgenticGenerationResult {
  code: string;
  language: string;
  explanation: string;
  alternatives?: string[];
}

export interface AgenticRefactorResult {
  originalCode: string;
  refactoredCode: string;
  diff: string;
  changes: RefactorChange[];
}

export interface RefactorChange {
  type: 'rename' | 'extract' | 'inline' | 'move' | 'restructure';
  description: string;
  before: string;
  after: string;
}

export interface AgenticExplanation {
  summary: string;
  detailedExplanation: string;
  codeFlow: string[];
  keyConceptsUsed: string[];
}

export interface DiffApplyResult {
  success: boolean;
  filePath: string;
  linesChanged: number;
  errors?: string[];
}

export interface AgenticTestResult {
  tests: string;
  framework: string;
  coverage: number;
  testCount: number;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: { id: string; username: string; avatar?: string };
  categoryId: string;
  tags: string[];
  votes: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionStatus {
  tier: 'free' | 'hobby' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  features: string[];
  limits: Record<string, number>;
}

export interface UsageStats {
  apiCalls: { used: number; limit: number };
  agentTasks: { used: number; limit: number };
  storage: { used: number; limit: number };
  bandwidth: { used: number; limit: number };
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  relevanceScore?: number;
}

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  createdAt: Date;
}

export interface VideoDetails extends VideoInfo {
  hlsUrl: string;
  mp4Url?: string;
  resolution: string;
  fileSize: number;
}

export interface AnalyticsDashboard {
  totalApiCalls: number;
  totalAgentTasks: number;
  activeUsers: number;
  coordinationLevel: number;
  trends: { date: string; value: number }[];
}

export interface AgentMetrics {
  agentId: string;
  tasksCompleted: number;
  successRate: number;
  avgResponseTime: number;
  satisfaction: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: { name: string; status: string; latency: number }[];
  uptime: number;
}

export interface SystemStatus {
  version: string;
  environment: string;
  activeConnections: number;
  queuedTasks: number;
}

// ============================================================================
// v19.0 — WORKFLOW ENGINE & AGENT PROTOCOL v2 INTEGRATION
// ============================================================================

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  params: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: Array<{
    from_node: string;
    to_node: string;
    condition?: string;
  }>;
  is_active: boolean;
}

export interface WorkflowExecution {
  execution_id: string;
  workflow_id: string;
  status: string;
  node_results: Record<string, any>;
  coordination_metrics: Record<string, number>;
}

export interface AgentProtocolAgent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  personality: string;
  capabilities: string[];
  coordination_state: Record<string, number>;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  difficulty: string;
  total_downloads: number;
  avg_rating: number;
}

export class WorkflowApiService {
  private apiService: ApiService;

  constructor(apiService: ApiService) {
    this.apiService = apiService;
  }

  // Workflow Engine
  async listWorkflows(): Promise<ApiResponse<WorkflowDefinition[]>> {
    return this.apiService.get('/api/workflows/engine/workflows');
  }

  async getWorkflow(id: string): Promise<ApiResponse<WorkflowDefinition>> {
    return this.apiService.get(`/api/workflows/engine/workflows/${id}`);
  }

  async createWorkflow(
    workflow: Partial<WorkflowDefinition>
  ): Promise<ApiResponse<{ workflow_id: string }>> {
    return this.apiService.post('/api/workflows/engine/workflows', workflow);
  }

  async executeWorkflow(
    id: string,
    triggerData: Record<string, any> = {}
  ): Promise<ApiResponse<WorkflowExecution>> {
    return this.apiService.post(
      `/api/workflows/engine/workflows/${id}/execute`,
      { trigger_data: triggerData }
    );
  }

  async getExecution(id: string): Promise<ApiResponse<WorkflowExecution>> {
    return this.apiService.get(`/api/workflows/engine/executions/${id}`);
  }

  async getNodeTypes(): Promise<ApiResponse<any[]>> {
    return this.apiService.get('/api/workflows/engine/node-types');
  }

  // Agent Protocol v2
  async listAgents(): Promise<ApiResponse<AgentProtocolAgent[]>> {
    return this.apiService.get('/api/agent-protocol/v2/agents');
  }

  async getAgent(id: string): Promise<ApiResponse<AgentProtocolAgent>> {
    return this.apiService.get(`/api/agent-protocol/v2/agents/${id}`);
  }

  async sendAgentMessage(
    message: string,
    agentId?: string
  ): Promise<ApiResponse<any>> {
    return this.apiService.post('/api/agent-protocol/v2/tasks', {
      input: message,
      agent_id: agentId,
      stream: false,
    });
  }

  // Template Marketplace
  async listTemplates(
    category?: string,
    search?: string
  ): Promise<ApiResponse<MarketplaceTemplate[]>> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    return this.apiService.get(`/api/marketplace/templates/?${params}`);
  }

  async installTemplate(id: string): Promise<ApiResponse<any>> {
    return this.apiService.post(`/api/marketplace/templates/${id}/install`);
  }

  // LLM Training
  async getTrainingStatus(): Promise<ApiResponse<any>> {
    return this.apiService.get('/api/llm/training/status');
  }

  async startTraining(config: Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiService.post('/api/llm/training/start', config);
  }
}
