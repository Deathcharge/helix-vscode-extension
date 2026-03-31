"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockApiResponse = exports.createMockAgent = exports.createMockContext = void 0;
// Test setup file
require("jest-extended");
// Mock VSCode API
const mockVscode = {
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showInputBox: jest.fn(),
        showQuickPick: jest.fn(),
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        })),
        createStatusBarItem: jest.fn(() => ({
            text: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        })),
        withProgress: jest.fn((options, task) => {
            return task({
                report: jest.fn(),
            }, {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn(),
            });
        }),
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key, defaultValue) => defaultValue),
        })),
        onDidChangeConfiguration: jest.fn(),
    },
    commands: {
        registerCommand: jest.fn(),
    },
    ExtensionContext: jest.fn(),
    globalState: {
        get: jest.fn(),
        update: jest.fn(),
    },
    Uri: {
        joinPath: jest.fn((...parts) => parts.join('/')),
    },
};
// Mock global fetch
global.fetch = jest.fn();
// Mock global console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
// Setup global mocks
Object.defineProperty(global, 'vscode', {
    value: mockVscode,
});
// Mock socket.io-client
jest.mock('socket.io-client', () => ({
    io: jest.fn(() => ({
        on: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        connected: true,
    })),
}));
// Mock axios
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
        },
    })),
}));
// Global test utilities
const createMockContext = () => ({
    subscriptions: [],
    globalState: {
        get: jest.fn(),
        update: jest.fn(),
    },
});
exports.createMockContext = createMockContext;
const createMockAgent = (overrides = {}) => ({
    id: 'test-agent-1',
    name: 'Test Agent',
    role: 'Test Role',
    emoji: '🤖',
    color: '#007acc',
    coordination: 8.5,
    online: true,
    lastActivity: new Date(),
    currentTask: null,
    ...overrides,
});
exports.createMockAgent = createMockAgent;
const createMockApiResponse = (data, success = true) => ({
    success,
    data,
    error: success ? undefined : 'Test error',
    statusCode: success ? 200 : 500,
});
exports.createMockApiResponse = createMockApiResponse;
//# sourceMappingURL=setup.js.map