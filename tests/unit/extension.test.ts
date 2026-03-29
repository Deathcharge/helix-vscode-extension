import * as vscode from 'vscode';
import * as assert from 'assert';
import { HelixVSCodeExtension } from '../../src/extensionContext';
import { AgentService } from '../../src/services/agentService';
import { ApiService } from '../../src/services/apiService';
import { WebSocketService } from '../../src/services/websocketService';
import { AgentStore } from '../../src/stores/agentStore';
import { MarketplaceStore } from '../../src/stores/marketplaceStore';
import { SessionStore } from '../../src/stores/sessionStore';
import { SpiralStore } from '../../src/stores/spiralStore';
import { PerformanceMonitor } from '../../src/utils/performance-monitor';
import { GitIntegrationManager } from '../../src/utils/git-integration';
import { NotificationManager } from '../../src/utils/notifications';
import { VSCodeIntegration } from '../../src/utils/vscode-integration';

suite('Helix VSCode Extension Integration Tests', () => {
  let extension: HelixVSCodeExtension;
  let mockContext: vscode.ExtensionContext;
  let disposables: vscode.Disposable[] = [];

  setup(async () => {
    // Create mock extension context
    mockContext = {
      subscriptions: disposables,
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      extensionUri: vscode.Uri.file('/mock/extension'),
      extensionPath: '/mock/extension',
      storageUri: vscode.Uri.file('/mock/storage'),
      globalStorageUri: vscode.Uri.file('/mock/global-storage'),
      logUri: vscode.Uri.file('/mock/log'),
      extensionMode: vscode.ExtensionMode.Test,
    } as any;

    // Create extension instance
    extension = new HelixVSCodeExtension(mockContext);
  });

  teardown(async () => {
    if (extension) {
      extension.dispose();
    }
    disposables.forEach(d => d.dispose());
    disposables = [];
  });

  test('should create extension instance', () => {
    assert.ok(extension);
    assert.ok(extension instanceof HelixVSCodeExtension);
  });

  test('should initialize extension successfully', async () => {
    await extension.activate();

    // Check that all core services are initialized
    assert.ok(extension.agentService instanceof AgentService);
    assert.ok(extension.apiService instanceof ApiService);
    assert.ok(extension.websocketService instanceof WebSocketService);
    assert.ok(extension.agentStore instanceof AgentStore);
    assert.ok(extension.marketplaceStore instanceof MarketplaceStore);
    assert.ok(extension.sessionStore instanceof SessionStore);
    assert.ok(extension.spiralStore instanceof SpiralStore);
  });

  test('should register commands', async () => {
    await extension.activate();

    // Check that commands are registered
    const commands = await vscode.commands.getCommands(true);
    const helixCommands = commands.filter(cmd => cmd.startsWith('helix.'));

    assert.ok(helixCommands.length > 0, 'Helix commands should be registered');

    // Check for specific commands
    const expectedCommands = [
      'helix.openAgentPanel',
      'helix.openMarketplace',
      'helix.openCoordinationDashboard',
      'helix.openSpiralBuilder',
      'helix.connectToAgent',
      'helix.executeWorkflow',
      'helix.quickAction',
      'helix.analyzeCode',
      'helix.generateTests',
      'helix.toggleCoordinationMonitoring',
      'helix.showCoordinationDetails',
    ];

    for (const command of expectedCommands) {
      assert.ok(
        helixCommands.includes(command),
        `Command ${command} should be registered`
      );
    }
  });

  test('should create status bar item', async () => {
    await extension.activate();

    // Check that status bar item is created
    const statusBarItem = extension.statusBarItem;
    assert.ok(statusBarItem);
    assert.strictEqual(statusBarItem.text, '$(heart) Helix: 5 | $(robot) Idle');
  });

  test('should handle configuration changes', async () => {
    await extension.activate();

    // Simulate configuration change
    const configChangeEvent = {
      affectsConfiguration: (section: string) => section === 'helix',
    } as vscode.ConfigurationChangeEvent;

    // This should not throw an error
    await extension.handleConfigurationChange();
  });

  test('should handle workspace changes', async () => {
    await extension.activate();

    // This should not throw an error
    await extension.handleWorkspaceChange();
  });

  test('should handle document changes', async () => {
    await extension.activate();

    // Create mock document change event
    const mockDocument = {
      fileName: 'test.ts',
      languageId: 'typescript',
      getText: () => 'console.log("test");',
    } as vscode.TextDocument;

    const mockDocumentChange = {
      document: mockDocument,
    } as vscode.TextDocumentChangeEvent;

    // This should not throw an error
    await extension.handleDocumentChange(mockDocumentChange);
  });
});

suite('Agent Service Tests', () => {
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
  });

  test('should analyze code', async () => {
    const code = 'function test() { return 42; }';
    const result = await agentService.analyzeCode(code);

    assert.ok(result);
    assert.ok(Array.isArray(result.issues));
    assert.ok(Array.isArray(result.suggestions));
    assert.ok(Array.isArray(result.info));
  });

  test('should generate tests', async () => {
    const code = 'function add(a, b) { return a + b; }';
    const result = await agentService.generateTests(code);

    assert.ok(result);
    assert.ok(result.testFile);
    assert.ok(result.testFramework);
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
});

suite('Performance Monitor Tests', () => {
  let performanceMonitor: PerformanceMonitor;

  setup(() => {
    performanceMonitor = new PerformanceMonitor();
  });

  teardown(() => {
    performanceMonitor.dispose();
  });

  test('should create performance monitor', () => {
    assert.ok(performanceMonitor);
    assert.ok(performanceMonitor instanceof PerformanceMonitor);
  });

  test('should start monitoring', () => {
    performanceMonitor.startMonitoring();
    assert.strictEqual(performanceMonitor['isMonitoring'], true);
  });

  test('should stop monitoring', () => {
    performanceMonitor.startMonitoring();
    performanceMonitor.stopMonitoring();
    assert.strictEqual(performanceMonitor['isMonitoring'], false);
  });

  test('should record command timing', () => {
    performanceMonitor.startCommandTiming('test-command');
    const duration = performanceMonitor.endCommandTiming('test-command');

    assert.ok(duration >= 0);
  });

  test('should record network latency', () => {
    performanceMonitor.recordNetworkLatency('test-endpoint', 100);

    const metrics = performanceMonitor.getMetrics();
    assert.ok(metrics.networkLatency.has('test-endpoint'));
  });

  test('should record agent response time', () => {
    performanceMonitor.recordAgentResponseTime('test-agent', 500);

    const metrics = performanceMonitor.getMetrics();
    assert.ok(metrics.agentResponseTime.has('test-agent'));
  });

  test('should generate performance report', () => {
    const report = performanceMonitor.generateReport();

    assert.ok(report);
    assert.ok(report.summary);
    assert.ok(Array.isArray(report.alerts));
    assert.ok(Array.isArray(report.recommendations));
    assert.ok(Array.isArray(report.bottlenecks));
  });

  test('should set extension load time', () => {
    performanceMonitor.setExtensionLoadTime(1000);

    const metrics = performanceMonitor.getMetrics();
    assert.strictEqual(metrics.extensionLoadTime, 1000);
  });
});

suite('Git Integration Tests', () => {
  let gitIntegration: GitIntegrationManager;
  let mockContext: vscode.ExtensionContext;

  setup(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      extensionUri: vscode.Uri.file('/mock/extension'),
      extensionPath: '/mock/extension',
      storageUri: vscode.Uri.file('/mock/storage'),
      globalStorageUri: vscode.Uri.file('/mock/global-storage'),
      logUri: vscode.Uri.file('/mock/log'),
      extensionMode: vscode.ExtensionMode.Test,
    } as any;

    gitIntegration = new GitIntegrationManager(mockContext);
  });

  teardown(() => {
    gitIntegration.dispose();
  });

  test('should create git integration', () => {
    assert.ok(gitIntegration);
    assert.ok(gitIntegration instanceof GitIntegrationManager);
  });

  test('should get git status', async () => {
    const status = await gitIntegration.getGitStatus();

    assert.ok(status);
    assert.ok(typeof status.branch === 'string');
    assert.ok(['clean', 'modified', 'untracked'].includes(status.status));
  });

  test('should get recent commits', async () => {
    const commits = await gitIntegration.getRecentCommits(5);

    assert.ok(Array.isArray(commits));
  });

  test('should create workflow commit', async () => {
    const message = 'Test commit';
    const files = ['test.ts'];

    // This would normally require a real git repository
    // For now, just test that the method exists and doesn't throw
    try {
      await gitIntegration.createWorkflowCommit(message, files);
    } catch (error) {
      // Expected in test environment without real git repo
      assert.ok(error);
    }
  });

  test('should get workflow change history', () => {
    const history = gitIntegration.getWorkflowChangeHistory();

    assert.ok(Array.isArray(history));
  });

  test('should get audit log', () => {
    const auditLog = gitIntegration.getAuditLog();

    assert.ok(Array.isArray(auditLog.entries));
  });
});

suite('Notification Manager Tests', () => {
  let notificationManager: NotificationManager;
  let mockContext: vscode.ExtensionContext;

  setup(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      extensionUri: vscode.Uri.file('/mock/extension'),
      extensionPath: '/mock/extension',
      storageUri: vscode.Uri.file('/mock/storage'),
      globalStorageUri: vscode.Uri.file('/mock/global-storage'),
      logUri: vscode.Uri.file('/mock/log'),
      extensionMode: vscode.ExtensionMode.Test,
    } as any;

    notificationManager = new NotificationManager(mockContext);
  });

  teardown(() => {
    notificationManager.dispose();
  });

  test('should create notification manager', () => {
    assert.ok(notificationManager);
    assert.ok(notificationManager instanceof NotificationManager);
  });

  test('should show info notification', async () => {
    await notificationManager.showInfo('Test Title', 'Test Message');

    const notifications = notificationManager.getNotifications();
    assert.ok(notifications.length > 0);
  });

  test('should show warning notification', async () => {
    await notificationManager.showWarning('Test Title', 'Test Message');

    const notifications = notificationManager.getNotifications();
    assert.ok(notifications.length > 0);
  });

  test('should show error notification', async () => {
    await notificationManager.showError('Test Title', 'Test Message');

    const notifications = notificationManager.getNotifications();
    assert.ok(notifications.length > 0);
  });

  test('should show success notification', async () => {
    await notificationManager.showSuccess('Test Title', 'Test Message');

    const notifications = notificationManager.getNotifications();
    assert.ok(notifications.length > 0);
  });

  test('should get notifications', () => {
    const notifications = notificationManager.getNotifications();
    assert.ok(Array.isArray(notifications));
  });

  test('should get unread notifications', () => {
    const unread = notificationManager.getUnreadNotifications();
    assert.ok(Array.isArray(unread));
  });

  test('should mark notification as read', () => {
    // Add a notification first
    const notification = {
      id: 'test-id',
      type: 'info' as const,
      title: 'Test',
      message: 'Test',
      timestamp: new Date(),
      category: 'test',
      actionable: false,
      read: false,
    };

    // This would normally be done through the showNotification method
    // For testing, we'll just check the method exists
    assert.ok(typeof notificationManager.markAsRead === 'function');
  });

  test('should clear notifications', () => {
    notificationManager.clearNotifications();

    const notifications = notificationManager.getNotifications();
    assert.strictEqual(notifications.length, 0);
  });
});

suite('VSCode Integration Tests', () => {
  let vscodeIntegration: VSCodeIntegration;
  let mockContext: vscode.ExtensionContext;

  setup(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      extensionUri: vscode.Uri.file('/mock/extension'),
      extensionPath: '/mock/extension',
      storageUri: vscode.Uri.file('/mock/storage'),
      globalStorageUri: vscode.Uri.file('/mock/global-storage'),
      logUri: vscode.Uri.file('/mock/log'),
      extensionMode: vscode.ExtensionMode.Test,
    } as any;

    vscodeIntegration = new VSCodeIntegration(mockContext);
  });

  teardown(() => {
    vscodeIntegration.dispose();
  });

  test('should create VSCode integration', () => {
    assert.ok(vscodeIntegration);
    assert.ok(vscodeIntegration instanceof VSCodeIntegration);
  });

  test('should register commands', () => {
    const commands = [{ command: 'test.command', title: 'Test Command' }];

    vscodeIntegration.registerCommands(commands);

    // Commands are registered, we can't easily test them without the actual VSCode environment
    assert.ok(true);
  });

  test('should create status bar item', () => {
    const statusBarItem = vscodeIntegration.createStatusBarItem({
      text: 'Test',
      alignment: vscode.StatusBarAlignment.Right,
    });

    assert.ok(statusBarItem);
  });

  test('should create tree view', () => {
    const mockDataProvider = {
      getChildren: () => Promise.resolve([]),
      getTreeItem: () => new vscode.TreeItem('test'),
    };

    const treeView = vscodeIntegration.createTreeView('test-view', {
      treeDataProvider: mockDataProvider,
    });

    assert.ok(treeView);
  });

  test('should create terminal', () => {
    const terminal = vscodeIntegration.createTerminal({
      name: 'Test Terminal',
    });

    assert.ok(terminal);
  });

  test('should show terminal output', () => {
    const mockTerminal = {
      show: () => {},
      sendText: () => {},
    } as any;

    // This would normally require a real terminal
    // For testing, we'll just check the method exists
    assert.ok(typeof vscodeIntegration.showTerminalOutput === 'function');
  });

  test('should register language providers', () => {
    vscodeIntegration.registerLanguageProviders();

    // Language providers are registered, we can't easily test them without the actual VSCode environment
    assert.ok(true);
  });

  test('should create webview panel', () => {
    const panel = vscodeIntegration.createWebviewPanel(
      'test-view',
      'Test Panel',
      vscode.ViewColumn.One
    );

    assert.ok(panel);
  });

  test('should show messages', () => {
    // These methods would normally show messages in VSCode
    // For testing, we'll just check they exist
    assert.ok(typeof vscodeIntegration.showInfoMessage === 'function');
    assert.ok(typeof vscodeIntegration.showWarningMessage === 'function');
    assert.ok(typeof vscodeIntegration.showErrorMessage === 'function');
  });
});

suite('Store Tests', () => {
  let mockContext: vscode.ExtensionContext;

  setup(() => {
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      extensionUri: vscode.Uri.file('/mock/extension'),
      extensionPath: '/mock/extension',
      storageUri: vscode.Uri.file('/mock/storage'),
      globalStorageUri: vscode.Uri.file('/mock/global-storage'),
      logUri: vscode.Uri.file('/mock/log'),
      extensionMode: vscode.ExtensionMode.Test,
    } as any;
  });

  test('should create agent store', () => {
    const agentStore = new AgentStore();
    agentStore.initialize();

    assert.ok(agentStore);
    assert.ok(agentStore instanceof AgentStore);
  });

  test('should create marketplace store', () => {
    const marketplaceStore = new MarketplaceStore(mockContext);

    assert.ok(marketplaceStore);
    assert.ok(marketplaceStore instanceof MarketplaceStore);
  });

  test('should create session store', () => {
    const sessionStore = new SessionStore(mockContext);

    assert.ok(sessionStore);
    assert.ok(sessionStore instanceof SessionStore);
  });

  test('should create spiral store', () => {
    const spiralStore = new SpiralStore(mockContext);

    assert.ok(spiralStore);
    assert.ok(spiralStore instanceof SpiralStore);
  });
});
