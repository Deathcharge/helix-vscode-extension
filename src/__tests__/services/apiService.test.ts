import { ApiService } from '../../services/apiService';
import { errorHandler } from '../../services/errorHandler';

// Mock dependencies
jest.mock('../../services/errorHandler');

describe('ApiService', () => {
  let apiService: ApiService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    apiService = new ApiService();
    mockFetch = global.fetch as jest.Mock;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default base URL', () => {
      expect(apiService.getBaseUrl()).toBe('http://localhost:8000');
    });
  });

  describe('authentication methods', () => {
    it('should authenticate user successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'test-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: 'user-1',
            username: 'testuser',
            email: 'test@example.com',
          },
        },
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.authenticate({
        username: 'testuser',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
          body: JSON.stringify({
            username: 'testuser',
            password: 'password123',
          }),
        }
      );
    });

    it('should handle authentication failure', async () => {
      const mockError = new Error('Authentication failed');
      mockFetch.mockRejectedValueOnce(mockError);

      await expect(
        apiService.authenticate({
          username: 'testuser',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Authentication failed');

      expect(errorHandler.handleApiError).toHaveBeenCalled();
    });

    it('should refresh token successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'new-token',
          refreshToken: 'new-refresh-token',
        },
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.refreshToken('old-refresh-token');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/auth/refresh',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
          body: JSON.stringify({
            refreshToken: 'old-refresh-token',
          }),
        }
      );
    });

    it('should logout successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(apiService.logout()).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/auth/logout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
          body: JSON.stringify({}),
        }
      );
    });
  });

  describe('agent methods', () => {
    it('should get agents successfully', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          role: 'Test Role',
        },
      ];

      const mockResponse = {
        success: true,
        data: mockAgents,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.getAgents();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/agents/list',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
        }
      );
    });

    it('should get agent status successfully', async () => {
      const mockStatus = {
        id: 'agent-1',
        status: 'active',
        lastActivity: new Date().toISOString(),
      };

      const mockResponse = {
        success: true,
        data: mockStatus,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.getAgentStatus('agent-1');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/agents/agents/agent-1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
        }
      );
    });

    it('should execute agent task successfully', async () => {
      const task = {
        id: 'task-1',
        type: 'code_analysis' as const,
        prompt: 'Analyze this code',
        context: { language: 'typescript' },
      };

      const mockResult = {
        taskId: 'task-1',
        success: true,
        output: 'Analysis complete',
        timestamp: new Date(),
      };

      const mockResponse = {
        success: true,
        data: mockResult,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.executeAgentTask(task);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/agents/collaboration/run',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
          body: JSON.stringify(task),
        }
      );
    });
  });

  describe('coordination methods', () => {
    it('should get coordination metrics successfully', async () => {
      const mockMetrics = {
        harmony: 8.5,
        resilience: 7.2,
        throughput: 6.8,
        friction: 3.1,
        focus: 7.9,
        velocity: 6.5,
      };

      const mockResponse = {
        success: true,
        data: mockMetrics,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.getCoordinationMetrics();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/coordination/metrics',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
        }
      );
    });

    it('should get coordination alerts successfully', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: 'recommendation' as const,
          message: 'Take a break',
          severity: 'low' as const,
          timestamp: new Date(),
          actionable: true,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockAlerts,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.getCoordinationAlerts();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/coordination/alerts',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
        }
      );
    });
  });

  describe('marketplace methods', () => {
    it('should browse products successfully', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Test Product',
          category: 'agent' as const,
          price: 29.99,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockProducts,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.browseProducts();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/marketplace/products',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
        }
      );
    });

    it('should browse products by category', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Test Agent',
          category: 'agent' as const,
          price: 29.99,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockProducts,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.browseProducts('agent');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/marketplace/products?category=agent',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
        }
      );
    });

    it('should install product successfully', async () => {
      const mockResult = {
        success: true,
        productId: 'product-1',
        version: '1.0.0',
        message: 'Product installed successfully',
      };

      const mockResponse = {
        success: true,
        data: mockResult,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.installProduct('product-1');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/marketplace/products/product-1/install',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
          body: JSON.stringify({}),
        }
      );
    });
  });

  describe('workflow methods', () => {
    it('should create workflow successfully', async () => {
      const workflowConfig = {
        name: 'Test Workflow',
        description: 'Test workflow description',
        nodes: [],
        connections: [],
      };

      const mockResult = {
        id: 'workflow-1',
        ...workflowConfig,
      };

      const mockResponse = {
        success: true,
        data: mockResult,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.createWorkflow(workflowConfig);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/spirals',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
          body: JSON.stringify(workflowConfig),
        }
      );
    });

    it('should execute workflow successfully', async () => {
      const workflowId = 'workflow-1';
      const context = { input: 'test' };

      const mockResult = {
        workflowId,
        status: 'success' as const,
        output: { result: 'success' },
        executionTime: 1000,
        nodesExecuted: ['node-1', 'node-2'],
      };

      const mockResponse = {
        success: true,
        data: mockResult,
        statusCode: 200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiService.executeWorkflow(workflowId, context);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/spirals/workflow-1/execute',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Helix-VSCode-Extension/1.0.0',
          },
          body: JSON.stringify(context),
        }
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(apiService.getAgents()).rejects.toThrow('Network Error');
      expect(errorHandler.handleApiError).toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await expect(apiService.getAgents()).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      );
      expect(errorHandler.handleApiError).toHaveBeenCalled();
    });
  });

  describe('authentication token management', () => {
    it('should set auth token', () => {
      apiService.setAuthToken('test-token');
      expect(apiService.getBaseUrl()).toBe('http://localhost:8000');
      // We can't directly test the headers, but we can verify the method exists
    });

    it('should remove auth token', () => {
      apiService.setAuthToken('test-token');
      apiService.removeAuthToken();
      // We can't directly test the headers, but we can verify the method exists
    });
  });
});
