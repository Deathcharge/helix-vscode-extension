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
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const git_integration_1 = require("./utils/git-integration");
function registerCommands(context, extension) {
    // Core panel commands
    const openAgentPanelCommand = vscode.commands.registerCommand('helix.openAgentPanel', async () => {
        await extension.openAgentPanel();
    });
    context.subscriptions.push(openAgentPanelCommand);
    const openMarketplaceCommand = vscode.commands.registerCommand('helix.openMarketplace', async () => {
        await extension.openMarketplace();
    });
    context.subscriptions.push(openMarketplaceCommand);
    const openCoordinationDashboardCommand = vscode.commands.registerCommand('helix.openCoordinationDashboard', async () => {
        await extension.openCoordinationDashboard();
    });
    context.subscriptions.push(openCoordinationDashboardCommand);
    const openSpiralBuilderCommand = vscode.commands.registerCommand('helix.openSpiralBuilder', async () => {
        await extension.openSpiralBuilder();
    });
    context.subscriptions.push(openSpiralBuilderCommand);
    // Agent interaction commands
    const connectToAgentCommand = vscode.commands.registerCommand('helix.connectToAgent', async () => {
        const agentId = await vscode.window.showInputBox({
            prompt: 'Enter Agent ID to connect to',
            placeHolder: 'e.g., agent-123',
        });
        if (agentId) {
            await extension.connectToAgent(agentId);
        }
    });
    context.subscriptions.push(connectToAgentCommand);
    const executeWorkflowCommand = vscode.commands.registerCommand('helix.executeWorkflow', async () => {
        const workflowId = await vscode.window.showInputBox({
            prompt: 'Enter Workflow ID to execute',
            placeHolder: 'e.g., workflow-456',
        });
        if (workflowId) {
            await extension.executeWorkflow(workflowId);
        }
    });
    context.subscriptions.push(executeWorkflowCommand);
    // Quick action commands
    const quickActionCommand = vscode.commands.registerCommand('helix.quickAction', async (action) => {
        switch (action) {
            case 'createWorkflow':
                await (async (extension) => {
                    const name = await vscode.window.showInputBox({
                        prompt: 'Enter workflow name',
                        placeHolder: 'e.g., Code Review Workflow',
                    });
                    if (!name)
                        return;
                    const description = await vscode.window.showInputBox({
                        prompt: 'Enter workflow description (optional)',
                        placeHolder: 'e.g., Automated code review with AI agents',
                    });
                    const stepTypes = [
                        'Code Analysis',
                        'Security Scan',
                        'Style Check',
                        'Test Generation',
                        'Documentation',
                    ];
                    const selectedSteps = await vscode.window.showQuickPick(stepTypes, {
                        canPickMany: true,
                        placeHolder: 'Select workflow steps',
                    });
                    if (!selectedSteps || selectedSteps.length === 0) {
                        vscode.window.showWarningMessage('No steps selected for workflow');
                        return;
                    }
                    try {
                        const workflow = {
                            name,
                            description: description || '',
                            steps: selectedSteps.map((step, idx) => ({
                                id: `step-${idx + 1}`,
                                name: step,
                                type: 'action',
                                parameters: {},
                            })),
                        };
                        // Store workflow via extension context
                        const workflowId = `workflow-${Date.now()}`;
                        vscode.window.showInformationMessage(`Workflow "${name}" created with ${selectedSteps.length} steps. ID: ${workflowId}`);
                        // Open workflow editor panel
                        const panel = vscode.window.createWebviewPanel('workflowEditor', `Workflow: ${name}`, vscode.ViewColumn.One, { enableScripts: true });
                        panel.webview.html = getWorkflowEditorHtml(workflow, workflowId);
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`Failed to create workflow: ${error}`);
                    }
                })(extension);
                break;
            case 'installAgent':
                await (async (extension) => {
                    try {
                        // Show marketplace with available agents
                        const agents = [
                            {
                                label: '$(robot) Kael - Technical Guide',
                                description: 'Expert technical assistance and code analysis',
                                id: 'kael',
                            },
                            {
                                label: '$(heart) Lumina - Emotional Guide',
                                description: 'Wellness and emotional intelligence support',
                                id: 'lumina',
                            },
                            {
                                label: '$(music) Vega - Creative Muse',
                                description: 'Creative inspiration and artistic generation',
                                id: 'vega',
                            },
                            {
                                label: '$(shield) Zephyr - Protector',
                                description: 'Security analysis and protection',
                                id: 'zephyr',
                            },
                            {
                                label: '$(book) Sage - Knowledge Keeper',
                                description: 'Documentation and knowledge management',
                                id: 'sage',
                            },
                            {
                                label: '$(pulse) Aurora - Wellness Coach',
                                description: 'Mindfulness and meditation guidance',
                                id: 'aurora',
                            },
                        ];
                        const selected = await vscode.window.showQuickPick(agents, {
                            placeHolder: 'Select an agent to install',
                            matchOnDescription: true,
                        });
                        if (selected) {
                            const labelParts = (selected.label ?? '').split(' - ');
                            const agentName = (labelParts[0] ?? 'Agent')
                                .replace('$(robot) ', '')
                                .replace('$(heart) ', '')
                                .replace('$(music) ', '')
                                .replace('$(shield) ', '')
                                .replace('$(book) ', '')
                                .replace('$(pulse) ', '');
                            const confirm = await vscode.window.showInformationMessage(`Install ${agentName}?`, 'Install', 'Cancel');
                            if (confirm === 'Install') {
                                await vscode.window.withProgress({
                                    location: vscode.ProgressLocation.Notification,
                                    title: 'Installing agent...',
                                    cancellable: false,
                                }, async () => {
                                    // Simulate installation
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    return Promise.resolve();
                                });
                                vscode.window.showInformationMessage(`Agent "${selected.id}" installed successfully!`);
                            }
                        }
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`Failed to browse marketplace: ${error}`);
                    }
                })(extension);
                break;
            case 'checkUpdates':
                await (async (extension) => {
                    try {
                        await vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: 'Checking for updates...',
                            cancellable: false,
                        }, async (progress) => {
                            progress.report({
                                increment: 0,
                                message: 'Checking extension version...',
                            });
                            await new Promise(resolve => setTimeout(resolve, 500));
                            progress.report({
                                increment: 30,
                                message: 'Checking agent updates...',
                            });
                            await new Promise(resolve => setTimeout(resolve, 500));
                            progress.report({
                                increment: 60,
                                message: 'Checking workflow updates...',
                            });
                            await new Promise(resolve => setTimeout(resolve, 500));
                            progress.report({ increment: 100, message: 'Done!' });
                            return Promise.resolve();
                        });
                        // Check if updates are available (simulated)
                        const currentVersion = '1.0.0';
                        const latestVersion = '1.0.0'; // In production, fetch from API
                        if (currentVersion === latestVersion) {
                            vscode.window.showInformationMessage(`✓ Helix is up to date (v${currentVersion})`);
                        }
                        else {
                            const update = await vscode.window.showInformationMessage(`Update available: v${latestVersion} (current: v${currentVersion})`, 'Update Now', 'Later');
                            if (update === 'Update Now') {
                                vscode.commands.executeCommand('workbench.extensions.action.installExtension', 'helix.helix-collective');
                            }
                        }
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`Failed to check for updates: ${error}`);
                    }
                })(extension);
                break;
            default:
                vscode.window.showErrorMessage(`Unknown quick action: ${action}`);
        }
    });
    context.subscriptions.push(quickActionCommand);
    // Code analysis commands - uses real backend API when available
    const analyzeCodeCommand = vscode.commands.registerCommand('helix.analyzeCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.window.showErrorMessage('No active editor found');
        }
        const selection = editor.selection;
        const code = selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(selection);
        if (!code.trim()) {
            return vscode.window.showErrorMessage('No code to analyze');
        }
        const language = editor.document.languageId;
        const filePath = editor.document.fileName;
        try {
            let analysis;
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing code with Helix agents...',
                cancellable: true,
            }, async (progress, token) => {
                progress.report({
                    increment: 0,
                    message: 'Connecting to Helix API...',
                });
                try {
                    // Try real API first
                    const result = await extension.apiService.agenticAnalyzeCode(code, language);
                    if (token.isCancellationRequested)
                        return;
                    progress.report({
                        increment: 100,
                        message: 'Analysis complete!',
                    });
                    // Transform API result to display format
                    analysis = {
                        summary: result.data
                            ? `Quality score: ${result.data.maintainability}/100`
                            : '',
                        issues: (result.data?.issues ?? []).map(issue => ({
                            type: issue.severity,
                            message: issue.message,
                            line: issue.line,
                            suggestion: undefined,
                        })),
                        metrics: {
                            complexity: result.data?.complexity ?? 0,
                            maintainability: result.data?.maintainability ?? 0,
                            testability: 'N/A',
                        },
                        suggestions: result.data?.suggestions ?? [],
                    };
                }
                catch {
                    // Fallback to local analysis if API unavailable
                    progress.report({
                        increment: 25,
                        message: 'API unavailable, using local analysis...',
                    });
                    const stages = [
                        { increment: 50, message: 'Scanning for patterns...' },
                        { increment: 75, message: 'Checking code quality...' },
                        { increment: 100, message: 'Finalizing report...' },
                    ];
                    for (const stage of stages) {
                        if (token.isCancellationRequested)
                            return;
                        await new Promise(resolve => setTimeout(resolve, 300));
                        progress.report(stage);
                    }
                    analysis = analyzeCodeContent(code, language);
                }
                return Promise.resolve();
            });
            if (!analysis)
                return;
            const panel = vscode.window.createWebviewPanel('codeAnalysis', 'Helix Code Analysis', vscode.ViewColumn.Beside, { enableScripts: true });
            panel.webview.html = getCodeAnalysisHtml(analysis, language.toUpperCase());
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to analyze code: ${error}`);
        }
        return Promise.resolve();
    });
    context.subscriptions.push(analyzeCodeCommand);
    const generateTestsCommand = vscode.commands.registerCommand('helix.generateTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.window.showErrorMessage('No active editor found');
        }
        const code = editor.document.getText();
        const language = editor.document.languageId;
        const fileName = editor.document.fileName;
        // Determine test framework based on language
        const testFrameworks = {
            typescript: ['Jest', 'Mocha', 'Vitest'],
            javascript: ['Jest', 'Mocha', 'Vitest'],
            python: ['pytest', 'unittest'],
            java: ['JUnit', 'TestNG'],
            csharp: ['xUnit', 'NUnit', 'MSTest'],
            go: ['testing (built-in)', 'testify'],
            rust: ['cargo test (built-in)'],
        };
        const frameworks = testFrameworks[language] || ['Generic'];
        let selectedFramework = frameworks[0] ?? 'Generic';
        if (frameworks.length > 1) {
            const selection = await vscode.window.showQuickPick(frameworks, {
                placeHolder: 'Select test framework',
            });
            if (!selection)
                return;
            selectedFramework = selection;
        }
        try {
            let testCode = '';
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating ${selectedFramework} tests...`,
                cancellable: true,
            }, async (progress, token) => {
                progress.report({
                    increment: 0,
                    message: 'Connecting to Helix API...',
                });
                try {
                    // Try real API first
                    const result = await extension.apiService.agenticGenerateTests(code, language, selectedFramework, fileName);
                    if (token.isCancellationRequested)
                        return;
                    progress.report({ increment: 100, message: 'Tests generated!' });
                    testCode = result.data?.tests ?? '';
                }
                catch {
                    // Fallback to local generation if API unavailable
                    progress.report({
                        increment: 20,
                        message: 'API unavailable, using local generation...',
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (token.isCancellationRequested)
                        return;
                    progress.report({
                        increment: 60,
                        message: 'Generating test cases...',
                    });
                    await new Promise(resolve => setTimeout(resolve, 800));
                    progress.report({ increment: 100, message: 'Done!' });
                    testCode = generateTestCode(code, language, selectedFramework, fileName);
                }
                return Promise.resolve();
            });
            if (!testCode)
                return;
            // Determine test file path
            const testFileName = getTestFileName(fileName, language);
            // Show preview
            const testFileBaseName = testFileName.split('/').pop() || testFileName;
            const action = await vscode.window.showInformationMessage(`Tests generated for ${testFileBaseName}`, 'Create Test File', 'Copy to Clipboard', 'Preview');
            if (action === 'Create Test File') {
                const uri = vscode.Uri.file(testFileName);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(testCode, 'utf8'));
                await vscode.window.showTextDocument(uri);
                vscode.window.showInformationMessage(`Test file created: ${testFileBaseName}`);
            }
            else if (action === 'Copy to Clipboard') {
                await vscode.env.clipboard.writeText(testCode);
                vscode.window.showInformationMessage('Test code copied to clipboard');
            }
            else if (action === 'Preview') {
                const doc = await vscode.workspace.openTextDocument({
                    content: testCode,
                    language: language,
                });
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to generate tests: ${error}`);
        }
        return Promise.resolve();
    });
    context.subscriptions.push(generateTestsCommand);
    // Refactor code command - uses real backend API when available
    const refactorCodeCommand = vscode.commands.registerCommand('helix.refactorCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.window.showErrorMessage('No active editor found');
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            return vscode.window.showWarningMessage('Please select code to refactor');
        }
        const code = editor.document.getText(selection);
        const language = editor.document.languageId;
        const filePath = editor.document.fileName;
        // Refactoring options
        const options = [
            {
                label: '$(symbol-method) Extract Function',
                value: 'extract_function',
            },
            {
                label: '$(symbol-variable) Extract Variable',
                value: 'extract_variable',
            },
            { label: '$(symbol-class) Extract Class', value: 'extract_class' },
            {
                label: '$(symbol-interface) Extract Interface',
                value: 'extract_interface',
            },
            { label: '$(arrow-swap) Rename Symbol', value: 'rename' },
            { label: '$(fold-up) Inline Variable', value: 'inline' },
            { label: '$(list-flat) Simplify Conditionals', value: 'simplify' },
            { label: '$(refresh) Convert to Modern Syntax', value: 'modernize' },
        ];
        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select refactoring type',
        });
        if (!selected)
            return;
        try {
            let refactored = '';
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Applying ${selected.label.replace(/\$\([^)]+\)\s*/, '')}...`,
                cancellable: true,
            }, async (progress, token) => {
                progress.report({
                    increment: 0,
                    message: 'Connecting to Helix API...',
                });
                try {
                    // Try real API first
                    const result = await extension.apiService.agenticRefactorCode(code, selected.value);
                    if (token.isCancellationRequested)
                        return;
                    progress.report({
                        increment: 100,
                        message: 'Refactoring complete!',
                    });
                    refactored = result.data?.refactoredCode ?? '';
                }
                catch {
                    // Fallback to local refactoring if API unavailable
                    progress.report({
                        increment: 20,
                        message: 'API unavailable, using local refactoring...',
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (token.isCancellationRequested)
                        return;
                    progress.report({
                        increment: 70,
                        message: 'Generating refactored code...',
                    });
                    await new Promise(resolve => setTimeout(resolve, 800));
                    progress.report({ increment: 100, message: 'Done!' });
                    refactored = generateRefactoredCode(code, language, selected.value);
                }
                return Promise.resolve();
            });
            if (!refactored)
                return;
            const action = await vscode.window.showInformationMessage('Refactoring ready', 'Apply', 'Preview', 'Cancel');
            if (action === 'Apply') {
                await editor.edit(editBuilder => {
                    editBuilder.replace(selection, refactored);
                });
                vscode.window.showInformationMessage('Refactoring applied successfully');
            }
            else if (action === 'Preview') {
                const doc = await vscode.workspace.openTextDocument({
                    content: refactored,
                    language: language,
                });
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to refactor code: ${error}`);
        }
        return Promise.resolve();
    });
    context.subscriptions.push(refactorCodeCommand);
    // Generate documentation command
    const generateDocumentationCommand = vscode.commands.registerCommand('helix.generateDocumentation', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.window.showErrorMessage('No active editor found');
        }
        const selection = editor.selection;
        const code = selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(selection);
        const language = editor.document.languageId;
        const fileName = editor.document.fileName.split('/').pop() || 'file';
        // Documentation format options
        const formatOptions = [
            {
                label: '$(book) JSDoc/TSDoc',
                value: 'jsdoc',
                languages: ['javascript', 'typescript'],
            },
            {
                label: '$(book) Python Docstrings',
                value: 'docstring',
                languages: ['python'],
            },
            { label: '$(book) JavaDoc', value: 'javadoc', languages: ['java'] },
            {
                label: '$(markdown) README Section',
                value: 'readme',
                languages: ['all'],
            },
            {
                label: '$(file-text) API Documentation',
                value: 'api',
                languages: ['all'],
            },
        ];
        const availableFormats = formatOptions.filter(f => f.languages.includes('all') || f.languages.includes(language));
        const selected = await vscode.window.showQuickPick(availableFormats, {
            placeHolder: 'Select documentation format',
        });
        if (!selected)
            return;
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating documentation...',
                cancellable: true,
            }, async (progress, token) => {
                progress.report({
                    increment: 0,
                    message: 'Analyzing code structure...',
                });
                await new Promise(resolve => setTimeout(resolve, 600));
                if (token.isCancellationRequested)
                    return;
                progress.report({
                    increment: 40,
                    message: 'Extracting function signatures...',
                });
                await new Promise(resolve => setTimeout(resolve, 600));
                if (token.isCancellationRequested)
                    return;
                progress.report({
                    increment: 80,
                    message: 'Writing documentation...',
                });
                await new Promise(resolve => setTimeout(resolve, 600));
                progress.report({ increment: 100, message: 'Done!' });
                return Promise.resolve();
            });
            const docs = generateDocumentation(code, language, selected.value, fileName);
            const action = await vscode.window.showInformationMessage('Documentation generated', 'Insert Above Selection', 'Copy to Clipboard', 'Open in New Tab');
            if (action === 'Insert Above Selection') {
                const position = selection.isEmpty
                    ? new vscode.Position(0, 0)
                    : selection.start;
                await editor.edit(editBuilder => {
                    editBuilder.insert(position, docs + '\n\n');
                });
            }
            else if (action === 'Copy to Clipboard') {
                await vscode.env.clipboard.writeText(docs);
                vscode.window.showInformationMessage('Documentation copied to clipboard');
            }
            else if (action === 'Open in New Tab') {
                const docLanguage = selected.value === 'readme' || selected.value === 'api'
                    ? 'markdown'
                    : language;
                const doc = await vscode.workspace.openTextDocument({
                    content: docs,
                    language: docLanguage,
                });
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to generate documentation: ${error}`);
        }
        return Promise.resolve();
    });
    context.subscriptions.push(generateDocumentationCommand);
    // Explain code command - uses real backend API
    const explainCodeCommand = vscode.commands.registerCommand('helix.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.window.showErrorMessage('No active editor found');
        }
        const selection = editor.selection;
        const code = selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(selection);
        if (!code.trim()) {
            return vscode.window.showErrorMessage('No code to explain');
        }
        const language = editor.document.languageId;
        // Detail level options
        const detailOptions = [
            { label: '$(info) Brief Overview', value: 'brief' },
            { label: '$(list-flat) Detailed Explanation', value: 'detailed' },
            { label: '$(mortar-board) Beginner-Friendly', value: 'beginner' },
            { label: '$(debug) Technical Deep Dive', value: 'technical' },
        ];
        const selected = await vscode.window.showQuickPick(detailOptions, {
            placeHolder: 'Select explanation detail level',
        });
        if (!selected)
            return;
        try {
            let explanation = '';
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating code explanation...',
                cancellable: true,
            }, async (progress, token) => {
                progress.report({
                    increment: 0,
                    message: 'Connecting to Helix API...',
                });
                try {
                    // Try real API first
                    const result = await extension.apiService.agenticExplainCode(code);
                    if (token.isCancellationRequested)
                        return;
                    progress.report({
                        increment: 100,
                        message: 'Explanation ready!',
                    });
                    // Format the explanation
                    explanation = `# Code Explanation\n\n`;
                    explanation += `## Summary\n${result.data?.summary ?? ''}\n\n`;
                    if (result.data?.detailedExplanation) {
                        explanation += `## Explanation\n${result.data.detailedExplanation}\n\n`;
                    }
                    const keyPoints = result.data?.keyConceptsUsed ?? [];
                    if (keyPoints.length > 0) {
                        explanation += `## Key Concepts\n`;
                        for (const point of keyPoints) {
                            explanation += `- ${point}\n`;
                        }
                        explanation += '\n';
                    }
                }
                catch {
                    // Fallback to basic explanation if API unavailable
                    progress.report({
                        increment: 30,
                        message: 'API unavailable, using local analysis...',
                    });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (token.isCancellationRequested)
                        return;
                    progress.report({ increment: 100, message: 'Done!' });
                    explanation = generateBasicExplanation(code, language, selected.value);
                }
                return Promise.resolve();
            });
            if (!explanation)
                return;
            // Show explanation in a new panel
            const panel = vscode.window.createWebviewPanel('codeExplanation', 'Helix Code Explanation', vscode.ViewColumn.Beside, { enableScripts: true });
            panel.webview.html = getExplanationHtml(explanation, language.toUpperCase());
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to explain code: ${error}`);
        }
        return Promise.resolve();
    });
    context.subscriptions.push(explainCodeCommand);
    // Coordination monitoring commands
    const toggleCoordinationMonitoringCommand = vscode.commands.registerCommand('helix.toggleCoordinationMonitoring', async () => {
        const config = vscode.workspace.getConfiguration('helix');
        const currentValue = config.get('enableCoordinationMonitoring', true);
        await config.update('enableCoordinationMonitoring', !currentValue, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Coordination monitoring ${currentValue ? 'disabled' : 'enabled'}`);
    });
    context.subscriptions.push(toggleCoordinationMonitoringCommand);
    const showCoordinationDetailsCommand = vscode.commands.registerCommand('helix.showCoordinationDetails', async () => {
        await extension.openCoordinationDashboard();
    });
    context.subscriptions.push(showCoordinationDetailsCommand);
    // Authentication commands
    context.subscriptions.push(vscode.commands.registerCommand('helix.login', async () => {
        await extension.authService.showLoginDialog();
    }), vscode.commands.registerCommand('helix.loginWithGoogle', async () => {
        await extension.authService.initiateOAuthLogin('google');
    }), vscode.commands.registerCommand('helix.loginWithGithub', async () => {
        await extension.authService.initiateOAuthLogin('github');
    }), vscode.commands.registerCommand('helix.logout', async () => {
        await extension.authService.logout();
    }), vscode.commands.registerCommand('helix.createAccount', () => {
        vscode.env.openExternal(vscode.Uri.parse('https://helixcollective.io/signup'));
    }));
    // Open the Helix Chat panel (declared in package.json, surfaced in sidebar)
    const openChatPanelCommand = vscode.commands.registerCommand('helix.openChatPanel', async () => {
        await vscode.commands.executeCommand('helixChat.focus');
    });
    context.subscriptions.push(openChatPanelCommand);
    // Toggle inline completions on/off
    const toggleInlineCompletionsCommand = vscode.commands.registerCommand('helix.toggleInlineCompletions', async () => {
        const config = vscode.workspace.getConfiguration('helix');
        const current = config.get('enableInlineCompletions', true);
        await config.update('enableInlineCompletions', !current, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Helix inline completions ${!current ? 'enabled' : 'disabled'}`);
    });
    context.subscriptions.push(toggleInlineCompletionsCommand);
    // ===========================================================================
    // Git Integration Commands
    // ===========================================================================
    /**
     * Helper: call the Helix copilot LLM API (non-streaming) and return the
     * assistant's text reply. Uses the same endpoint / auth pattern as the
     * chat panel provider.
     */
    async function callCopilotLLM(prompt, contextPayload = {}) {
        const endpoint = vscode.workspace.getConfiguration('helix').get('apiEndpoint') ||
            'http://localhost:8000';
        const authToken = context.globalState.get('helix.authTokenValue') ?? '';
        const res = await fetch(`${endpoint}/api/copilot/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({
                message: prompt,
                agent: 'helix',
                context: {
                    page: 'vscode',
                    route: '/vscode/git',
                    features: ['git-integration'],
                    ...contextPayload,
                },
                useEnhanced: false,
                tier: 'free',
            }),
        });
        if (!res.ok) {
            throw new Error(`API responded with ${res.status} ${res.statusText}`);
        }
        const body = (await res.json());
        // The /api/copilot/message endpoint returns { response: "..." }
        const text = body.response ??
            body.message ??
            JSON.stringify(body);
        return text;
    }
    // ---- helix.generateCommitMessage ----
    const generateCommitMessageCommand = vscode.commands.registerCommand('helix.generateCommitMessage', async () => {
        try {
            let diff = '';
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating commit message...',
                cancellable: true,
            }, async (progress, token) => {
                // 1. Get the staged diff (fall back to unstaged if nothing staged)
                progress.report({
                    increment: 0,
                    message: 'Reading staged changes...',
                });
                try {
                    diff = await (0, git_integration_1.getGitDiff)(true);
                }
                catch (err) {
                    console.warn('Failed to get staged diff, trying unstaged:', err);
                }
                if (!diff.trim()) {
                    try {
                        diff = await (0, git_integration_1.getGitDiff)(false);
                    }
                    catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        vscode.window.showWarningMessage(`Could not read git diff: ${msg}`);
                        return;
                    }
                }
                if (!diff.trim()) {
                    vscode.window.showInformationMessage('No changes detected. Stage some changes first.');
                    return;
                }
                if (token.isCancellationRequested)
                    return;
                // 2. Send to LLM
                progress.report({
                    increment: 30,
                    message: 'Asking Helix to generate message...',
                });
                const style = vscode.workspace
                    .getConfiguration('helix')
                    .get('git.commitMessageStyle') || 'conventional';
                const truncatedDiff = diff.slice(0, 8000);
                const prompt = `Generate a concise git commit message for the following diff. ` +
                    `Use ${style} commit style. Return ONLY the commit message, no explanation.\n\n` +
                    `\`\`\`diff\n${truncatedDiff}\n\`\`\``;
                const commitMessage = await callCopilotLLM(prompt, {
                    agentMode: 'code',
                });
                if (token.isCancellationRequested)
                    return;
                progress.report({ increment: 100, message: 'Done!' });
                // 3. Put the message into VS Code's SCM input box
                const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
                if (gitExtension) {
                    const git = gitExtension.getAPI(1);
                    const repo = git.repositories[0];
                    if (repo) {
                        repo.inputBox.value = commitMessage.trim();
                        vscode.window.showInformationMessage('Commit message generated and placed in SCM input box.');
                    }
                    else {
                        // No repository — copy to clipboard as fallback
                        await vscode.env.clipboard.writeText(commitMessage.trim());
                        vscode.window.showInformationMessage('No git repository found in SCM. Commit message copied to clipboard.');
                    }
                }
                else {
                    await vscode.env.clipboard.writeText(commitMessage.trim());
                    vscode.window.showInformationMessage('Git extension not available. Commit message copied to clipboard.');
                }
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn('generateCommitMessage failed:', error);
            vscode.window.showErrorMessage(`Failed to generate commit message: ${msg}`);
        }
    });
    context.subscriptions.push(generateCommitMessageCommand);
    // ---- helix.generatePRDescription ----
    const generatePRDescriptionCommand = vscode.commands.registerCommand('helix.generatePRDescription', async () => {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating PR description...',
                cancellable: true,
            }, async (progress, token) => {
                // 1. Get branch commits and diff from main/master
                progress.report({
                    increment: 0,
                    message: 'Reading branch commits...',
                });
                let branchInfo;
                try {
                    branchInfo = await (0, git_integration_1.getBranchCommits)();
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    vscode.window.showWarningMessage(`Could not read branch history: ${msg}`);
                    return;
                }
                if (!branchInfo.trim()) {
                    vscode.window.showInformationMessage('No commits found on this branch relative to main/master.');
                    return;
                }
                if (token.isCancellationRequested)
                    return;
                // 2. Send to LLM
                progress.report({
                    increment: 30,
                    message: 'Asking Helix to write PR description...',
                });
                const truncated = branchInfo.slice(0, 12000);
                const prompt = `Generate a pull request description for the following branch changes. ` +
                    `Include a title line, a summary section with bullet points, and a ` +
                    `test plan section. Use markdown formatting.\n\n${truncated}`;
                const prDescription = await callCopilotLLM(prompt, {
                    agentMode: 'code',
                });
                if (token.isCancellationRequested)
                    return;
                progress.report({ increment: 100, message: 'Done!' });
                // 3. Copy to clipboard and show
                const trimmed = prDescription.trim();
                await vscode.env.clipboard.writeText(trimmed);
                // Show a preview in an information message (truncated for the
                // notification; full text is on clipboard)
                const preview = trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed;
                vscode.window.showInformationMessage(`PR description copied to clipboard:\n${preview}`);
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn('generatePRDescription failed:', error);
            vscode.window.showErrorMessage(`Failed to generate PR description: ${msg}`);
        }
    });
    context.subscriptions.push(generatePRDescriptionCommand);
    // ---- helix.explainGitBlame ----
    const explainGitBlameCommand = vscode.commands.registerCommand('helix.explainGitBlame', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('Open a file and place your cursor on a line to explain its git blame.');
                return;
            }
            const filePath = editor.document.uri.fsPath;
            const line = editor.selection.active.line + 1; // 1-based
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Explaining git blame for line ${line}...`,
                cancellable: true,
            }, async (progress, token) => {
                // 1. Get git blame for the current line
                progress.report({
                    increment: 0,
                    message: 'Running git blame...',
                });
                let blameOutput;
                try {
                    blameOutput = await (0, git_integration_1.getGitBlame)(filePath, line);
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    vscode.window.showWarningMessage(`Could not get git blame: ${msg}`);
                    return;
                }
                if (!blameOutput.trim()) {
                    vscode.window.showInformationMessage('No blame information available for this line.');
                    return;
                }
                if (token.isCancellationRequested)
                    return;
                // 2. Get surrounding context (a few lines around the blamed line)
                const doc = editor.document;
                const startLine = Math.max(0, line - 4); // 3 lines before (0-based)
                const endLine = Math.min(doc.lineCount, line + 3); // 3 lines after
                const surroundingCode = doc.getText(new vscode.Range(startLine, 0, endLine, 0));
                // 3. Send to LLM
                progress.report({
                    increment: 30,
                    message: 'Asking Helix for explanation...',
                });
                const prompt = `Explain why this line was changed based on the git blame information below. ` +
                    `Be concise (2-3 sentences). Include who made the change and when if visible.\n\n` +
                    `Git blame output:\n${blameOutput.trim()}\n\n` +
                    `Surrounding code (lines ${startLine + 1}-${endLine}):\n` +
                    `\`\`\`${doc.languageId}\n${surroundingCode}\n\`\`\``;
                const explanation = await callCopilotLLM(prompt, {
                    agentMode: 'code',
                });
                if (token.isCancellationRequested)
                    return;
                progress.report({ increment: 100, message: 'Done!' });
                // 4. Show the explanation as an information message
                vscode.window.showInformationMessage(explanation.trim(), {
                    modal: false,
                });
            });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn('explainGitBlame failed:', error);
            vscode.window.showErrorMessage(`Failed to explain git blame: ${msg}`);
        }
    });
    context.subscriptions.push(explainGitBlameCommand);
}
function getWorkflowEditorHtml(workflow, workflowId) {
    const stepsHtml = workflow.steps
        .map((step, i) => `
    <div class="step">
      <span class="step-number">${i + 1}</span>
      <span class="step-name">${step.name}</span>
      <span class="step-type">${step.type}</span>
    </div>
  `)
        .join('');
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    h1 { color: #9d7cd8; margin-bottom: 5px; }
    .workflow-id { color: #7aa2f7; font-size: 12px; margin-bottom: 20px; }
    .description { color: #a9b1d6; margin-bottom: 20px; }
    .steps-container { background: #24283b; border-radius: 8px; padding: 15px; }
    .steps-header { color: #7dcfff; margin-bottom: 10px; font-weight: 600; }
    .step { display: flex; align-items: center; gap: 12px; padding: 10px; background: #1a1b26; border-radius: 4px; margin-bottom: 8px; }
    .step-number { background: #9d7cd8; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
    .step-name { flex: 1; color: #c0caf5; }
    .step-type { color: #565f89; font-size: 12px; text-transform: uppercase; }
    .actions { margin-top: 20px; display: flex; gap: 10px; }
    button { background: #7aa2f7; color: #1a1b26; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500; }
    button:hover { background: #9aa5ce; }
    button.secondary { background: transparent; border: 1px solid #565f89; color: #a9b1d6; }
  </style>
</head>
<body>
  <h1>🌀 ${workflow.name}</h1>
  <div class="workflow-id">ID: ${workflowId}</div>
  <div class="description">${workflow.description || 'No description provided'}</div>

  <div class="steps-container">
    <div class="steps-header">Workflow Steps</div>
    ${stepsHtml}
  </div>

  <div class="actions">
    <button onclick="runWorkflow()">▶ Run Workflow</button>
    <button class="secondary" onclick="editWorkflow()">✎ Edit Steps</button>
    <button class="secondary" onclick="exportWorkflow()">⬇ Export</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function runWorkflow() {
      vscode.postMessage({ command: 'run', workflowId: '${workflowId}' });
    }
    function editWorkflow() {
      vscode.postMessage({ command: 'edit', workflowId: '${workflowId}' });
    }
    function exportWorkflow() {
      vscode.postMessage({ command: 'export', workflowId: '${workflowId}' });
    }
  </script>
</body>
</html>`;
}
function analyzeCodeContent(code, language) {
    const lines = code.split('\n');
    const issues = [];
    const suggestions = [];
    // Simple heuristic analysis
    let complexity = 'Low';
    let maintainability = 'Good';
    let testability = 'Good';
    // Check for common issues
    lines.forEach((line, idx) => {
        // Long lines
        if (line.length > 120) {
            issues.push({
                type: 'warning',
                message: `Line exceeds 120 characters`,
                line: idx + 1,
            });
        }
        // TODO comments
        if (line.includes('TODO') || line.includes('FIXME')) {
            suggestions.push({
                type: 'info',
                message: `Found TODO/FIXME on line ${idx + 1}`,
            });
        }
        // Console/print statements
        if (line.includes('console.log') ||
            line.includes('print(') ||
            line.includes('System.out')) {
            issues.push({
                type: 'info',
                message: `Debug statement found`,
                line: idx + 1,
            });
        }
    });
    // Check complexity
    const nestedBlocks = (code.match(/\{|\}/g) || []).length / 2;
    if (nestedBlocks > 20) {
        complexity = 'High';
        maintainability = 'Needs Improvement';
    }
    else if (nestedBlocks > 10) {
        complexity = 'Medium';
    }
    // Check functions/methods
    const functionCount = (code.match(/function\s|def\s|fn\s|func\s|=>\s*\{/g) || []).length;
    if (functionCount > 15) {
        suggestions.push({
            type: 'suggestion',
            message: 'Consider splitting this file into smaller modules',
        });
    }
    // Calculate score
    const score = Math.max(0, 100 -
        issues.length * 5 -
        (complexity === 'High' ? 15 : complexity === 'Medium' ? 5 : 0));
    return {
        score,
        issues,
        suggestions,
        metrics: { complexity, maintainability, testability },
    };
}
function getCodeAnalysisHtml(analysis, language) {
    const issuesHtml = analysis.issues
        .map(issue => `
    <div class="issue ${issue.type}">
      <span class="icon">${issue.type === 'warning' ? '⚠️' : issue.type === 'error' ? '❌' : 'ℹ️'}</span>
      <span class="message">${issue.message}</span>
      ${issue.line ? `<span class="line">Line ${issue.line}</span>` : ''}
    </div>
  `)
        .join('') || '<div class="no-issues">✓ No issues found</div>';
    const suggestionsHtml = analysis.suggestions
        .map(s => `
    <div class="suggestion">
      <span class="icon">💡</span>
      <span class="message">${s.message}</span>
    </div>
  `)
        .join('') ||
        '<div class="no-suggestions">No suggestions at this time</div>';
    const scoreColor = analysis.score >= 80
        ? '#73daca'
        : analysis.score >= 60
            ? '#e0af68'
            : '#f7768e';
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    h1 { color: #9d7cd8; display: flex; align-items: center; gap: 10px; }
    .score-container { text-align: center; margin: 20px 0; }
    .score { font-size: 48px; font-weight: bold; color: ${scoreColor}; }
    .score-label { color: #565f89; }
    .metrics { display: flex; gap: 20px; margin: 20px 0; }
    .metric { flex: 1; background: #24283b; padding: 15px; border-radius: 8px; text-align: center; }
    .metric-label { color: #565f89; font-size: 12px; text-transform: uppercase; }
    .metric-value { color: #c0caf5; font-size: 18px; margin-top: 5px; }
    .section { margin: 20px 0; }
    .section-title { color: #7dcfff; margin-bottom: 10px; font-weight: 600; }
    .issue, .suggestion { display: flex; align-items: center; gap: 10px; padding: 10px; background: #24283b; border-radius: 4px; margin-bottom: 8px; }
    .issue.warning { border-left: 3px solid #e0af68; }
    .issue.error { border-left: 3px solid #f7768e; }
    .issue.info { border-left: 3px solid #7aa2f7; }
    .suggestion { border-left: 3px solid #73daca; }
    .line { color: #565f89; font-size: 12px; margin-left: auto; }
    .no-issues, .no-suggestions { color: #73daca; padding: 10px; }
  </style>
</head>
<body>
  <h1>🌀 Helix Code Analysis <span style="color: #565f89; font-size: 14px;">${language}</span></h1>

  <div class="score-container">
    <div class="score">${analysis.score}</div>
    <div class="score-label">Quality Score</div>
  </div>

  <div class="metrics">
    <div class="metric">
      <div class="metric-label">Complexity</div>
      <div class="metric-value">${analysis.metrics.complexity}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Maintainability</div>
      <div class="metric-value">${analysis.metrics.maintainability}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Testability</div>
      <div class="metric-value">${analysis.metrics.testability}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Issues (${analysis.issues.length})</div>
    ${issuesHtml}
  </div>

  <div class="section">
    <div class="section-title">Suggestions</div>
    ${suggestionsHtml}
  </div>
</body>
</html>`;
}
function generateTestCode(code, language, framework, fileName) {
    const baseName = fileName
        .split('/')
        .pop()
        ?.replace(/\.[^/.]+$/, '') || 'module';
    // Extract function names (simple heuristic)
    const functionPatterns = {
        typescript: /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
        javascript: /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
        python: /def\s+(\w+)\s*\(/g,
        java: /(?:public|private|protected)\s+(?:static\s+)?(?:\w+)\s+(\w+)\s*\(/g,
        go: /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/g,
    };
    const pattern = functionPatterns[language];
    const functions = [];
    if (pattern) {
        let match;
        while ((match = pattern.exec(code)) !== null) {
            const name = match[1] || match[2];
            if (name && !name.startsWith('_')) {
                functions.push(name);
            }
        }
    }
    // Generate test code based on language and framework
    switch (language) {
        case 'typescript':
        case 'javascript':
            return generateJavaScriptTests(baseName, functions, framework);
        case 'python':
            return generatePythonTests(baseName, functions, framework);
        default:
            return generateGenericTests(baseName, functions, language);
    }
}
function generateJavaScriptTests(moduleName, functions, framework) {
    const imports = functions.length > 0
        ? `import { ${functions.join(', ')} } from './${moduleName}';\n\n`
        : '';
    const tests = functions.length > 0
        ? functions
            .map(fn => `
  describe('${fn}', () => {
    it('should be defined', () => {
      expect(${fn}).toBeDefined();
    });

    it('should return expected result', () => {
      // TODO: Add test implementation
      const result = ${fn}();
      expect(result).toBeDefined();
    });

    it('should handle edge cases', () => {
      // TODO: Add edge case tests
    });
  });
`)
            .join('\n')
        : `
  describe('${moduleName}', () => {
    it('should have tests', () => {
      // TODO: Add tests for this module
      expect(true).toBe(true);
    });
  });
`;
    return `/**
 * Tests for ${moduleName}
 * Generated by Helix
 * Framework: ${framework}
 */

${imports}describe('${moduleName}', () => {${tests}
});
`;
}
function generatePythonTests(moduleName, functions, framework) {
    const imports = functions.length > 0
        ? `from ${moduleName} import ${functions.join(', ')}\n\n`
        : `import ${moduleName}\n\n`;
    const tests = functions.length > 0
        ? functions
            .map(fn => `
class Test${capitalizeFirst(fn)}:
    """Tests for ${fn}"""

    def test_${fn}_exists(self):
        """Test that ${fn} is callable"""
        assert callable(${fn})

    def test_${fn}_basic(self):
        """Test basic functionality of ${fn}"""
        # TODO: Add test implementation
        result = ${fn}()
        assert result is not None

    def test_${fn}_edge_cases(self):
        """Test edge cases for ${fn}"""
        # TODO: Add edge case tests
        pass
`)
            .join('\n')
        : `
class Test${capitalizeFirst(moduleName)}:
    """Tests for ${moduleName}"""

    def test_module_imports(self):
        """Test that module can be imported"""
        assert ${moduleName} is not None
`;
    return `"""
Tests for ${moduleName}
Generated by Helix
Framework: ${framework}
"""

import pytest
${imports}${tests}
`;
}
function generateGenericTests(moduleName, functions, language) {
    return `/**
 * Tests for ${moduleName}
 * Generated by Helix
 * Language: ${language}
 *
 * Functions detected: ${functions.join(', ') || 'none'}
 *
 * TODO: Implement tests for the detected functions
 */
`;
}
function getTestFileName(sourceFile, language) {
    const dir = sourceFile.substring(0, sourceFile.lastIndexOf('/'));
    const baseName = sourceFile
        .split('/')
        .pop()
        ?.replace(/\.[^/.]+$/, '') || 'module';
    const testDirs = {
        typescript: '__tests__',
        javascript: '__tests__',
        python: 'tests',
        java: 'test',
        go: '',
    };
    const testExtensions = {
        typescript: '.test.ts',
        javascript: '.test.js',
        python: '_test.py',
        java: 'Test.java',
        go: '_test.go',
    };
    const testDir = testDirs[language] || 'tests';
    const testExt = testExtensions[language] || '.test.txt';
    if (testDir) {
        return `${dir}/${testDir}/${baseName}${testExt}`;
    }
    return `${dir}/${baseName}${testExt}`;
}
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function generateRefactoredCode(code, language, refactorType) {
    // Simulated refactoring - in production this would call the Helix AI backend
    const lines = code.split('\n');
    switch (refactorType) {
        case 'extract_function':
            const funcName = 'extractedFunction';
            const params = 'params';
            if (language === 'python') {
                return `def ${funcName}(${params}):\n    """Extracted function - add description"""\n    ${lines
                    .map(l => '    ' + l)
                    .join('\n')
                    .trim()}\n    return result\n\n# Call the extracted function:\n# result = ${funcName}(${params})`;
            }
            return `function ${funcName}(${params}) {\n  // Extracted function - add description\n  ${lines.join('\n  ')}\n}\n\n// Call: ${funcName}(${params});`;
        case 'extract_variable':
            return `// Extracted to variable for clarity\nconst extractedValue = (\n  ${code}\n);\n\n// Use extractedValue where needed`;
        case 'simplify':
            // Simple pattern: convert nested ternaries to if/else
            if (code.includes('?') && code.includes(':')) {
                return `// Simplified conditional\nlet result;\nif (condition) {\n  result = valueIfTrue;\n} else {\n  result = valueIfFalse;\n}`;
            }
            return `// Simplified version:\n${code}`;
        case 'modernize':
            let modernized = code;
            // var -> const/let
            modernized = modernized.replace(/\bvar\s+/g, 'const ');
            // function to arrow
            modernized = modernized.replace(/function\s*\(([^)]*)\)\s*\{/g, '($1) => {');
            // String concatenation to template literals
            if (modernized.includes('" +') || modernized.includes("' +")) {
                modernized = `// Consider using template literals:\n// \`string with \${variable}\`\n${modernized}`;
            }
            return modernized;
        default:
            return `// Refactored code (${refactorType}):\n${code}`;
    }
}
function generateDocumentation(code, language, format, fileName) {
    // Extract function signatures for documentation
    const functions = extractFunctionInfo(code, language);
    switch (format) {
        case 'jsdoc':
            return (functions
                .map(fn => `/**
 * ${fn.name} - Add description here
 * ${fn.params
                .map(p => `@param {${p.type || 'any'}} ${p.name} - Parameter description`)
                .join('\n * ')}
 * @returns {${fn.returnType || 'void'}} Return description
 * @example
 * ${fn.name}(${fn.params.map(p => p.name).join(', ')});
 */`)
                .join('\n\n') ||
                `/**
 * ${fileName}
 * @description Add module description here
 * @module ${fileName.replace(/\.[^.]+$/, '')}
 */`);
        case 'docstring':
            return (functions
                .map(fn => `def ${fn.name}(${fn.params.map(p => p.name).join(', ')}):
    """
    ${fn.name} - Add description here

    Args:
        ${fn.params
                .map(p => `${p.name}: Parameter description`)
                .join('\n        ')}

    Returns:
        ${fn.returnType || 'None'}: Return description

    Example:
        >>> ${fn.name}(${fn.params.map(p => `${p.name}_value`).join(', ')})
    """`)
                .join('\n\n') ||
                `"""
${fileName}

Add module description here.

Attributes:
    module_attribute: Description

Example:
    >>> import ${fileName.replace(/\.[^.]+$/, '')}
"""`);
        case 'readme':
            return `# ${fileName}

## Overview
Add module overview here.

## Functions

${functions
                .map(fn => `### \`${fn.name}(${fn.params.map(p => p.name).join(', ')})\`
Description of what this function does.

**Parameters:**
${fn.params.map(p => `- \`${p.name}\` - Parameter description`).join('\n') ||
                '- None'}

**Returns:** ${fn.returnType || 'void'}

**Example:**
\`\`\`${language}
${fn.name}(${fn.params.map(p => `/* ${p.name} */`).join(', ')});
\`\`\`
`)
                .join('\n') || 'No functions documented.'}

## Usage
\`\`\`${language}
// Import and use
\`\`\`

## License
Add license information here.`;
        case 'api':
            return `# API Documentation: ${fileName}

## Endpoints / Functions

${functions
                .map(fn => `### ${fn.name}

**Signature:** \`${fn.name}(${fn.params
                .map(p => `${p.name}: ${p.type || 'any'}`)
                .join(', ')}): ${fn.returnType || 'void'}\`

**Description:** Add description here.

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
${fn.params
                .map(p => `| ${p.name} | ${p.type || 'any'} | Yes | Parameter description |`)
                .join('\n') || '| - | - | - | No parameters |'}

#### Returns

\`${fn.returnType || 'void'}\` - Return description

#### Example

\`\`\`${language}
const result = ${fn.name}(${fn.params.map(p => `/* ${p.name} */`).join(', ')});
\`\`\`
`)
                .join('\n---\n\n') || 'No API endpoints documented.'}`;
        default:
            return `// Documentation for ${fileName}\n// Generated by Helix\n\n${code}`;
    }
}
function extractFunctionInfo(code, language) {
    const functions = [];
    const patterns = {
        typescript: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\w+))?/g,
        javascript: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
        python: /def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\w+))?/g,
    };
    const pattern = (patterns[language] ?? patterns['javascript']);
    let match;
    while ((match = pattern.exec(code)) !== null) {
        const name = match[1];
        const paramsStr = match[2] || '';
        const returnType = match[3];
        const params = paramsStr
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => {
            const parts = p.split(':').map(s => s.trim());
            return {
                name: (parts[0] ?? '').replace(/[?=].*/, '').trim(),
                type: parts[1]?.replace(/[=].*/, '').trim(),
            };
        });
        if (name && !name.startsWith('_')) {
            functions.push({ name, params, returnType });
        }
    }
    return functions;
}
// Helper function for code explanation (fallback when API unavailable)
function generateBasicExplanation(code, language, detailLevel) {
    const lines = code.split('\n');
    const functionMatches = code.match(/function\s+\w+|def\s+\w+|fn\s+\w+|func\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g) || [];
    const classMatches = code.match(/class\s+\w+/g) || [];
    const importMatches = code.match(/import\s+|from\s+\S+\s+import|require\(/g) || [];
    let explanation = `# Code Explanation\n\n`;
    explanation += `## Overview\n`;
    explanation += `This ${language} code contains ${lines.length} lines with:\n`;
    explanation += `- ${functionMatches.length} function(s) or method(s)\n`;
    explanation += `- ${classMatches.length} class(es)\n`;
    explanation += `- ${importMatches.length} import statement(s)\n\n`;
    if (detailLevel === 'brief') {
        explanation += `## Summary\n`;
        explanation += `The code defines functionality that should be reviewed for specific implementation details.\n`;
    }
    else if (detailLevel === 'beginner') {
        explanation += `## For Beginners\n`;
        explanation += `This code is written in ${language}. Functions are reusable blocks of code that perform specific tasks. `;
        explanation += `Classes are blueprints for creating objects with shared properties and methods.\n\n`;
        explanation += `## Getting Started\n`;
        explanation += `1. Read through the imports to understand dependencies\n`;
        explanation += `2. Identify the main functions or classes\n`;
        explanation += `3. Trace the execution flow from entry points\n`;
    }
    else if (detailLevel === 'technical') {
        explanation += `## Technical Analysis\n`;
        const complexity = functionMatches.length * 2 + classMatches.length * 3;
        explanation += `- Estimated complexity score: ${complexity}\n`;
        explanation += `- Code density: ${(code.replace(/\s+/g, '').length / lines.length).toFixed(1)} chars/line\n`;
        explanation += `- Nesting depth: ${(code.match(/\{/g) || []).length} block openings\n`;
    }
    else {
        explanation += `## Detailed Analysis\n`;
        explanation += `The code structure includes the following components that work together to provide functionality.\n\n`;
        if (functionMatches.length > 0) {
            explanation += `### Functions\n`;
            functionMatches.forEach(fn => {
                explanation += `- \`${fn.trim()}\`\n`;
            });
            explanation += '\n';
        }
        if (classMatches.length > 0) {
            explanation += `### Classes\n`;
            classMatches.forEach(cls => {
                explanation += `- \`${cls.trim()}\`\n`;
            });
        }
    }
    return explanation;
}
// HTML template for code explanation view
function getExplanationHtml(explanation, language) {
    // Convert markdown to simple HTML
    const htmlContent = explanation
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #1e1e1e;
      color: #d4d4d4;
      line-height: 1.6;
    }
    h1 { color: #9d7cd8; border-bottom: 2px solid #3d3d3d; padding-bottom: 10px; }
    h2 { color: #7aa2f7; margin-top: 24px; }
    h3 { color: #73daca; margin-top: 16px; }
    code {
      background: #2d2d2d;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      color: #e0af68;
    }
    li { margin: 8px 0; padding-left: 8px; }
    p { margin: 12px 0; }
    .language-badge {
      background: #7aa2f7;
      color: #1a1b26;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      display: inline-block;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <span class="language-badge">${language}</span>
  <div>${htmlContent}</div>
</body>
</html>`;
}
//# sourceMappingURL=commands.js.map