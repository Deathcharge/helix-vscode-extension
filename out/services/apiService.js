"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowApiService = exports.ApiService = void 0;
const vscode = __importStar(require("vscode"));
const errorHandler_1 = require("./errorHandler");
const logger_1 = require("../utils/logger");
// Subscription tier features configuration
const TIER_FEATURES = {
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
const FEATURE_REQUIREMENTS = {
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
class ApiService {
    constructor() {
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.cachedSubscription = null;
        this.subscriptionCacheTime = 0;
        this.CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
        // Get base URL from configuration
        const config = vscode.workspace.getConfiguration('helix');
        this.baseUrl = config.get('apiEndpoint', 'https://api.helixcollective.io');
        this.headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
            'X-Helix-Platform': 'vscode_copilot',
        };
    }
    async initialize() {
        // Test connection to API
        try {
            await this.get('/api/health');
            logger_1.logger.info('APIService initialized successfully');
        }
        catch (error) {
            logger_1.logger.warn('API health check failed, but continuing initialization:', error);
        }
    }
    dispose() {
        // Clean up any resources if needed
    }
    setEndpoint(endpoint) {
        this.baseUrl = endpoint;
    }
    // Authentication methods
    async authenticate(credentials) {
        try {
            const response = await this.post('/api/auth/login', credentials);
            return response;
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.authenticate(credentials), this.retryAttempts);
            throw error;
        }
    }
    async refreshToken(refreshToken) {
        try {
            const response = await this.post('/api/auth/refresh', {
                refreshToken,
            });
            return response;
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.refreshToken(refreshToken), this.retryAttempts);
            throw error;
        }
    }
    async logout() {
        try {
            await this.post('/api/auth/logout', {});
        }
        catch (error) {
            logger_1.logger.warn('Logout request failed:', error);
            // Don't throw error for logout failures
        }
    }
    // Agent-related methods
    async getAgents() {
        try {
            return await this.get('/api/agents/list');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getAgents(), this.retryAttempts);
            throw error;
        }
    }
    async getAgentStatus(agentId) {
        try {
            return await this.get(`/api/agents/agents/${agentId}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getAgentStatus(agentId), this.retryAttempts);
            throw error;
        }
    }
    async executeAgentTask(task) {
        try {
            return await this.post('/api/agents/collaboration/run', task);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.executeAgentTask(task), this.retryAttempts);
            throw error;
        }
    }
    // Coordination-related methods
    async getCoordinationMetrics() {
        // Real UCF metrics are on /api/health/detailed under the ucf_metrics key.
        // The legacy /api/coordination/metrics route does not exist.
        try {
            const res = await this.get('/api/health/detailed');
            const resData = res;
            if (resData.data?.ucf_metrics) {
                return {
                    success: true,
                    statusCode: 200,
                    data: resData.data.ucf_metrics,
                };
            }
            return res;
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getCoordinationMetrics(), this.retryAttempts);
            throw error;
        }
    }
    async getCoordinationAlerts() {
        try {
            return await this.get('/api/coordination/alerts');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getCoordinationAlerts(), this.retryAttempts);
            throw error;
        }
    }
    async getCoordinationRecommendations() {
        try {
            return await this.get('/api/coordination/recommendations');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getCoordinationRecommendations(), this.retryAttempts);
            throw error;
        }
    }
    // Marketplace-related methods
    async browseProducts(category) {
        try {
            const params = category ? `?category=${category}` : '';
            return await this.get(`/api/marketplace/products${params}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.browseProducts(category), this.retryAttempts);
            throw error;
        }
    }
    async getProduct(productId) {
        try {
            return await this.get(`/api/marketplace/products/${productId}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getProduct(productId), this.retryAttempts);
            throw error;
        }
    }
    async installProduct(productId) {
        try {
            return await this.post(`/api/marketplace/products/${productId}/install`, {});
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.installProduct(productId), this.retryAttempts);
            throw error;
        }
    }
    async uninstallProduct(productId) {
        try {
            return await this.delete(`/api/marketplace/products/${productId}/uninstall`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.uninstallProduct(productId), this.retryAttempts);
            throw error;
        }
    }
    async checkProductUpdates() {
        try {
            return await this.get('/api/marketplace/updates');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.checkProductUpdates(), this.retryAttempts);
            throw error;
        }
    }
    // Workflow-related methods
    async createWorkflow(config) {
        try {
            return await this.post('/api/spirals', config);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.createWorkflow(config), this.retryAttempts);
            throw error;
        }
    }
    async getWorkflow(workflowId) {
        try {
            return await this.get(`/api/spirals/${workflowId}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getWorkflow(workflowId), this.retryAttempts);
            throw error;
        }
    }
    async executeWorkflow(workflowId, context) {
        try {
            return await this.post(`/api/spirals/${workflowId}/execute`, context);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.executeWorkflow(workflowId, context), this.retryAttempts);
            throw error;
        }
    }
    async validateWorkflow(workflowId) {
        try {
            return await this.post(`/api/spirals/${workflowId}/validate`, {});
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.validateWorkflow(workflowId), this.retryAttempts);
            throw error;
        }
    }
    async debugWorkflow(workflowId) {
        try {
            return await this.get(`/api/spirals/${workflowId}/debug`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.debugWorkflow(workflowId), this.retryAttempts);
            throw error;
        }
    }
    // Basic HTTP methods
    async get(endpoint) {
        return this.request('GET', endpoint);
    }
    async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }
    async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }
    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
    async request(method, endpoint, data) {
        const url = `${this.baseUrl}${endpoint}`;
        const requestOptions = {
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
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            return responseData;
        }
        catch (error) {
            logger_1.logger.error(`API request failed for ${method} ${endpoint}:`, error);
            throw error;
        }
    }
    setAuthToken(token) {
        this.headers['Authorization'] = `Bearer ${token}`;
    }
    removeAuthToken() {
        delete this.headers['Authorization'];
    }
    updateBaseUrl(url) {
        this.baseUrl = url;
    }
    getBaseUrl() {
        return this.baseUrl;
    }
    // =====================================================
    // Agentic Coder - AI-Powered Code Operations
    // =====================================================
    async agenticAnalyzeCode(code, language) {
        try {
            return await this.post('/api/agentic/analyze', { code, language });
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.agenticAnalyzeCode(code, language), this.retryAttempts);
            throw error;
        }
    }
    async agenticGenerateCode(prompt, context) {
        try {
            return await this.post('/api/agentic/generate', { prompt, context });
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.agenticGenerateCode(prompt, context), this.retryAttempts);
            throw error;
        }
    }
    async agenticRefactorCode(code, instructions) {
        try {
            return await this.post('/api/agentic/refactor', { code, instructions });
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.agenticRefactorCode(code, instructions), this.retryAttempts);
            throw error;
        }
    }
    async agenticExplainCode(code) {
        try {
            return await this.post('/api/agentic/explain', { code });
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.agenticExplainCode(code), this.retryAttempts);
            throw error;
        }
    }
    async agenticApplyDiff(filePath, diff) {
        try {
            return await this.post('/api/agentic/apply-diff', {
                file_path: filePath,
                diff,
            });
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.agenticApplyDiff(filePath, diff), this.retryAttempts);
            throw error;
        }
    }
    async agenticGenerateTests(code, language, framework, filePath) {
        try {
            return await this.post('/api/agentic/generate-tests', {
                code,
                language,
                framework,
                file_path: filePath,
            });
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.agenticGenerateTests(code, language, framework, filePath), this.retryAttempts);
            throw error;
        }
    }
    // =====================================================
    // Forum Integration
    // =====================================================
    async getForumPosts(category, page = 1) {
        try {
            const params = category
                ? `?category=${category}&page=${page}`
                : `?page=${page}`;
            return await this.get(`/api/forum/posts${params}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getForumPosts(category, page), this.retryAttempts);
            throw error;
        }
    }
    async createForumPost(title, content, categoryId) {
        try {
            return await this.post('/api/forum/posts', {
                title,
                content,
                category_id: categoryId,
            });
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.createForumPost(title, content, categoryId), this.retryAttempts);
            throw error;
        }
    }
    async shareCodeSnippet(code, language, title) {
        try {
            const content = `\`\`\`${language}\n${code}\n\`\`\``;
            return await this.post('/api/forum/posts', {
                title,
                content,
                category_id: 'code-snippets',
                tags: [language, 'code-share'],
            });
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.shareCodeSnippet(code, language, title), this.retryAttempts);
            throw error;
        }
    }
    // =====================================================
    // Billing & Subscription Status with Caching
    // =====================================================
    async getSubscriptionStatus() {
        try {
            return await this.get('/api/billing/subscription');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getSubscriptionStatus(), this.retryAttempts);
            throw error;
        }
    }
    /**
     * Get cached subscription status with automatic refresh
     */
    async getCachedSubscriptionStatus() {
        const now = Date.now();
        // Check if cache is still valid
        if (this.cachedSubscription &&
            now - this.subscriptionCacheTime < this.CACHE_DURATION_MS) {
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
        }
        catch (error) {
            logger_1.logger.warn('Failed to fetch subscription status:', error);
        }
        // Return cached data even if stale, or null
        return this.cachedSubscription;
    }
    /**
     * Clear subscription cache (call after login/logout)
     */
    clearSubscriptionCache() {
        this.cachedSubscription = null;
        this.subscriptionCacheTime = 0;
    }
    /**
     * Check if user has access to a specific feature based on their tier
     */
    async checkFeatureAccess(feature) {
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
    async requireFeature(feature, featureName) {
        const access = await this.checkFeatureAccess(feature);
        if (access.allowed) {
            return true;
        }
        // Show upgrade notification
        const message = `${featureName} requires ${access.required} tier or higher. You are on ${access.tier} tier.`;
        const selection = await vscode.window.showWarningMessage(message, 'Upgrade', 'Learn More', 'Cancel');
        if (selection === 'Upgrade') {
            vscode.env.openExternal(vscode.Uri.parse('https://helixspiral.work/marketplace/pricing'));
        }
        else if (selection === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://helixspiral.work/pricing'));
        }
        return false;
    }
    /**
     * Get usage stats with warning notifications for high usage
     */
    async getUsageStatsWithWarnings() {
        const response = await this.getUsageStats();
        if (response.success && response.data) {
            const stats = response.data;
            // Check API calls
            if (stats.apiCalls.limit > 0) {
                const apiPercent = (stats.apiCalls.used / stats.apiCalls.limit) * 100;
                if (apiPercent >= 90) {
                    vscode.window
                        .showWarningMessage(`You've used ${apiPercent.toFixed(0)}% of your daily API calls. Upgrade for more.`, 'Upgrade')
                        .then(selection => {
                        if (selection === 'Upgrade') {
                            vscode.env.openExternal(vscode.Uri.parse('https://helixspiral.work/marketplace/pricing'));
                        }
                    });
                }
            }
            // Check agent tasks
            if (stats.agentTasks.limit > 0) {
                const taskPercent = (stats.agentTasks.used / stats.agentTasks.limit) * 100;
                if (taskPercent >= 90) {
                    vscode.window
                        .showWarningMessage(`You've used ${taskPercent.toFixed(0)}% of your daily agent tasks.`, 'Upgrade')
                        .then(selection => {
                        if (selection === 'Upgrade') {
                            vscode.env.openExternal(vscode.Uri.parse('https://helixspiral.work/marketplace/pricing'));
                        }
                    });
                }
            }
        }
        return response;
    }
    async getUsageStats() {
        try {
            return await this.get('/api/billing/usage');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getUsageStats(), this.retryAttempts);
            throw error;
        }
    }
    // =====================================================
    // Knowledge Base
    // =====================================================
    async searchKnowledgeBase(query) {
        try {
            return await this.get(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.searchKnowledgeBase(query), this.retryAttempts);
            throw error;
        }
    }
    async getKnowledgeArticle(articleId) {
        try {
            return await this.get(`/api/knowledge/articles/${articleId}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getKnowledgeArticle(articleId), this.retryAttempts);
            throw error;
        }
    }
    // =====================================================
    // Video Streaming (Preview in Editor)
    // =====================================================
    async getVideoList() {
        try {
            return await this.get('/stream/videos');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getVideoList(), this.retryAttempts);
            throw error;
        }
    }
    async getVideoDetails(videoId) {
        try {
            return await this.get(`/stream/videos/${videoId}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getVideoDetails(videoId), this.retryAttempts);
            throw error;
        }
    }
    // =====================================================
    // Analytics & Metrics
    // =====================================================
    async getAnalyticsDashboard() {
        try {
            return await this.get('/api/analytics/dashboard');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getAnalyticsDashboard(), this.retryAttempts);
            throw error;
        }
    }
    async getAgentPerformanceMetrics(agentId) {
        try {
            return await this.get(`/api/analytics/agents/${agentId}`);
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getAgentPerformanceMetrics(agentId), this.retryAttempts);
            throw error;
        }
    }
    // =====================================================
    // System Health
    // =====================================================
    async getSystemHealth() {
        try {
            return await this.get('/health');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getSystemHealth(), this.retryAttempts);
            throw error;
        }
    }
    async getSystemStatus() {
        try {
            return await this.get('/api/status');
        }
        catch (error) {
            await errorHandler_1.errorHandler.handleApiError(error, () => this.getSystemStatus(), this.retryAttempts);
            throw error;
        }
    }
}
exports.ApiService = ApiService;
class WorkflowApiService {
    constructor(apiService) {
        this.apiService = apiService;
    }
    // Workflow Engine
    async listWorkflows() {
        return this.apiService.get('/api/workflows/engine/workflows');
    }
    async getWorkflow(id) {
        return this.apiService.get(`/api/workflows/engine/workflows/${id}`);
    }
    async createWorkflow(workflow) {
        return this.apiService.post('/api/workflows/engine/workflows', workflow);
    }
    async executeWorkflow(id, triggerData = {}) {
        return this.apiService.post(`/api/workflows/engine/workflows/${id}/execute`, { trigger_data: triggerData });
    }
    async getExecution(id) {
        return this.apiService.get(`/api/workflows/engine/executions/${id}`);
    }
    async getNodeTypes() {
        return this.apiService.get('/api/workflows/engine/node-types');
    }
    // Agent Protocol v2
    async listAgents() {
        return this.apiService.get('/api/agent-protocol/v2/agents');
    }
    async getAgent(id) {
        return this.apiService.get(`/api/agent-protocol/v2/agents/${id}`);
    }
    async sendAgentMessage(message, agentId) {
        return this.apiService.post('/api/agent-protocol/v2/tasks', {
            input: message,
            agent_id: agentId,
            stream: false,
        });
    }
    // Template Marketplace
    async listTemplates(category, search) {
        const params = new URLSearchParams();
        if (category)
            params.set('category', category);
        if (search)
            params.set('search', search);
        return this.apiService.get(`/api/marketplace/templates/?${params}`);
    }
    async installTemplate(id) {
        return this.apiService.post(`/api/marketplace/templates/${id}/install`);
    }
    // LLM Training
    async getTrainingStatus() {
        return this.apiService.get('/api/llm/training/status');
    }
    async startTraining(config) {
        return this.apiService.post('/api/llm/training/start', config);
    }
}
exports.WorkflowApiService = WorkflowApiService;
//# sourceMappingURL=apiService.js.map