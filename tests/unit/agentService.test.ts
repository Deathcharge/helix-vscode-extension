import * as assert from 'assert';
import { AgentService } from '../../src/services/agentService';
import { ApiService } from '../../src/services/apiService';
import { WebSocketService } from '../../src/services/websocketService';

suite('Agent Service Unit Tests', () => {
  let agentService: AgentService;
  let mockApiService: any;
  let mockWebSocketService: any;

  setup(() => {
    mockApiService = {
      getAgents: () => Promise.resolve({ success: true, data: [] }),
      getAgentStatus: () => Promise.resolve({ success: true, data: {} }),
      executeAgentTask: () => Promise.resolve({ success: true, data: {} }),
      streamAgentOutput: () => {},
    };

    mockWebSocketService = {
      connect: () => Promise.resolve(),
      disconnect: () => {},
      on: () => {},
      send: () => {},
      isConnectedToServer: () => false,
      connectToAgent: () =>
        Promise.resolve({ agentId: 'test-agent', name: 'Test Agent' }),
      disconnectAgent: () => Promise.resolve(),
      sendAgentMessage: () => {},
      streamAgentOutput: () => {},
      startCoordinationMonitoring: () => {},
      stopCoordinationMonitoring: () => {},
      executeWorkflow: () => {},
    };

    agentService = new AgentService(mockApiService, mockWebSocketService);
  });

  test('should create agent service', () => {
    assert.ok(agentService);
    assert.ok(agentService instanceof AgentService);
  });

  test('should get agents', async () => {
    const result = await agentService.getAgents();
    assert.ok(Array.isArray(result));
  });

  test('should get agent status', async () => {
    const result = await agentService.getAgentStatus('test-agent');
    assert.ok(result);
    assert.strictEqual(result.success, true);
  });

  test('should execute agent task', async () => {
    const task = {
      id: 'test-task',
      type: 'test',
      prompt: 'test prompt',
      context: {},
    };

    const result = await agentService.executeAgentTask(task);
    assert.ok(result);
    assert.strictEqual(result.taskId, task.id);
    assert.strictEqual(result.success, true);
  });

  test('should analyze code', async () => {
    const code = 'function test() { return 42; }';
    const result = await agentService.analyzeCode(code);

    assert.ok(result);
    assert.ok(Array.isArray(result.issues));
    assert.ok(Array.isArray(result.suggestions));
    assert.ok(Array.isArray(result.info));
    assert.ok(typeof result.complexity === 'number');
    assert.ok(typeof result.qualityScore === 'number');
  });

  test('should generate tests', async () => {
    const code = 'function add(a, b) { return a + b; }';
    const result = await agentService.generateTests(code);

    assert.ok(result);
    assert.ok(result.testFile);
    assert.ok(result.testFramework);
    assert.ok(typeof result.coverage === 'number');
    assert.ok(typeof result.estimatedExecutionTime === 'number');
  });

  test('should refactor code', async () => {
    const code = 'function test() { return 42; }';
    const refactoringType = 'performance';
    const result = await agentService.refactorCode(code, refactoringType);

    assert.ok(result);
  });

  test('should generate documentation', async () => {
    const code = 'function test() { return 42; }';
    const result = await agentService.generateDocumentation(code);

    assert.ok(result);
  });

  test('should connect to agent', async () => {
    const result = await agentService.connectToAgent('test-agent');
    assert.ok(result);
    assert.strictEqual(result.agentId, 'test-agent');
  });

  test('should disconnect agent', async () => {
    await agentService.disconnectAgent('test-agent');
    // Should not throw
    assert.ok(true);
  });

  test('should get agents coordination metrics', async () => {
    const result = await agentService.getAgentsCoordinationMetrics();
    assert.ok(Array.isArray(result));
  });

  test('should detect language correctly', () => {
    const jsCode = 'function test() { return 42; }';
    const pyCode = 'def test(): return 42';
    const javaCode = 'public class Test { public int test() { return 42; } }';
    const rustCode = 'fn test() -> i32 { 42 }';
    const goCode = 'func test() int { return 42 }';
    const phpCode = '<?php function test() { return 42; } ?>';
    const unknownCode = 'some random text';

    assert.strictEqual(agentService['detectLanguage'](jsCode), 'javascript');
    assert.strictEqual(agentService['detectLanguage'](pyCode), 'python');
    assert.strictEqual(agentService['detectLanguage'](javaCode), 'java');
    assert.strictEqual(agentService['detectLanguage'](rustCode), 'rust');
    assert.strictEqual(agentService['detectLanguage'](goCode), 'go');
    assert.strictEqual(agentService['detectLanguage'](phpCode), 'php');
    assert.strictEqual(agentService['detectLanguage'](unknownCode), 'unknown');
  });

  test('should handle empty code analysis', async () => {
    const result = await agentService.analyzeCode('');
    assert.ok(result);
    assert.ok(Array.isArray(result.issues));
    assert.ok(Array.isArray(result.suggestions));
    assert.ok(Array.isArray(result.info));
  });

  test('should handle empty code test generation', async () => {
    const result = await agentService.generateTests('');
    assert.ok(result);
    assert.ok(result.testFile);
    assert.ok(result.testFramework);
  });

  test('should handle empty code refactoring', async () => {
    const result = await agentService.refactorCode('', 'performance');
    assert.ok(result);
  });

  test('should handle empty code documentation generation', async () => {
    const result = await agentService.generateDocumentation('');
    assert.ok(result);
  });

  test('should handle invalid agent ID', async () => {
    try {
      await agentService.getAgentStatus('');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error);
    }
  });

  test('should handle invalid task', async () => {
    try {
      await agentService.executeAgentTask({} as any);
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error);
    }
  });

  test('should handle API service errors', async () => {
    const errorApiService = {
      getAgents: () => Promise.reject(new Error('API Error')),
      getAgentStatus: () => Promise.reject(new Error('API Error')),
      executeAgentTask: () => Promise.reject(new Error('API Error')),
      streamAgentOutput: () => {},
    };

    const errorAgentService = new AgentService(
      errorApiService,
      mockWebSocketService
    );

    try {
      await errorAgentService.getAgents();
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error);
    }
  });

  test('should handle WebSocket service errors', async () => {
    const errorWebSocketService = {
      connect: () => Promise.reject(new Error('WebSocket Error')),
      disconnect: () => {},
      on: () => {},
      send: () => {},
      isConnectedToServer: () => false,
      connectToAgent: () => Promise.reject(new Error('WebSocket Error')),
      disconnectAgent: () => Promise.reject(new Error('WebSocket Error')),
      sendAgentMessage: () => {},
      streamAgentOutput: () => {},
      startCoordinationMonitoring: () => {},
      stopCoordinationMonitoring: () => {},
      executeWorkflow: () => {},
    };

    const errorAgentService = new AgentService(
      mockApiService,
      errorWebSocketService
    );

    try {
      await errorAgentService.connectToAgent('test-agent');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error);
    }
  });

  test('should handle complex code analysis', async () => {
    const complexCode = `
      class Calculator {
        constructor() {
          this.result = 0;
        }

        add(a, b) {
          return a + b;
        }

        subtract(a, b) {
          return a - b;
        }

        multiply(a, b) {
          return a * b;
        }

        divide(a, b) {
          if (b === 0) {
            throw new Error('Division by zero');
          }
          return a / b;
        }
      }
    `;

    const result = await agentService.analyzeCode(complexCode);

    assert.ok(result);
    assert.ok(Array.isArray(result.issues));
    assert.ok(Array.isArray(result.suggestions));
    assert.ok(Array.isArray(result.info));
    assert.ok(typeof result.complexity === 'number');
    assert.ok(typeof result.qualityScore === 'number');
  });

  test('should handle complex code test generation', async () => {
    const complexCode = `
      class Calculator {
        add(a, b) {
          return a + b;
        }

        subtract(a, b) {
          return a - b;
        }
      }
    `;

    const result = await agentService.generateTests(complexCode);

    assert.ok(result);
    assert.ok(result.testFile);
    assert.ok(result.testFramework);
    assert.ok(typeof result.coverage === 'number');
    assert.ok(typeof result.estimatedExecutionTime === 'number');
  });

  test('should handle complex code refactoring', async () => {
    const complexCode = `
      function processData(data) {
        let result = [];
        for (let i = 0; i < data.length; i++) {
          if (data[i] > 0) {
            result.push(data[i] * 2);
          }
        }
        return result;
      }
    `;

    const result = await agentService.refactorCode(complexCode, 'performance');

    assert.ok(result);
  });

  test('should handle complex code documentation', async () => {
    const complexCode = `
      /**
       * Processes user data and returns formatted output
       * @param {Array} users - Array of user objects
       * @returns {Array} Formatted user data
       */
      function processUsers(users) {
        return users.map(user => ({
          name: user.name.toUpperCase(),
          email: user.email.toLowerCase(),
          age: user.age
        }));
      }
    `;

    const result = await agentService.generateDocumentation(complexCode);

    assert.ok(result);
  });

  test('should handle multiple agents', async () => {
    const mockMultiApiService = {
      getAgents: () =>
        Promise.resolve({
          success: true,
          data: [
            { id: 'agent1', name: 'Agent 1' },
            { id: 'agent2', name: 'Agent 2' },
            { id: 'agent3', name: 'Agent 3' },
          ],
        }),
      getAgentStatus: () => Promise.resolve({ success: true, data: {} }),
      executeAgentTask: () => Promise.resolve({ success: true, data: {} }),
      streamAgentOutput: () => {},
    };

    const multiAgentService = new AgentService(
      mockMultiApiService,
      mockWebSocketService
    );
    const agents = await multiAgentService.getAgents();

    assert.ok(Array.isArray(agents));
    assert.strictEqual(agents.length, 3);
  });

  test('should handle agent connection states', async () => {
    const mockConnectionApiService = {
      getAgents: () =>
        Promise.resolve({
          success: true,
          data: [
            { id: 'agent1', name: 'Agent 1', online: true },
            { id: 'agent2', name: 'Agent 2', online: false },
          ],
        }),
      getAgentStatus: () => Promise.resolve({ success: true, data: {} }),
      executeAgentTask: () => Promise.resolve({ success: true, data: {} }),
      streamAgentOutput: () => {},
    };

    const connectionAgentService = new AgentService(
      mockConnectionApiService,
      mockWebSocketService
    );
    const agents = await connectionAgentService.getAgents();

    assert.ok(Array.isArray(agents));
    assert.strictEqual(agents.length, 2);
    assert.strictEqual(agents[0].online, true);
    assert.strictEqual(agents[1].online, false);
  });
});
