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
exports.HelixCodeActionProvider = void 0;
exports.registerCodeActionProvider = registerCodeActionProvider;
const vscode = __importStar(require("vscode"));
/**
 * Code Action Provider for Helix VSCode Extension
 * Provides intelligent code actions: Explain, Improve, and Generate Tests
 *
 * Commands are registered in commands.ts — this provider only surfaces them
 * as code actions (lightbulb menu) in the editor.
 */
class HelixCodeActionProvider {
    provideCodeActions(document, range, _context, _token) {
        const actions = [];
        // Only provide actions for code files
        const fileName = document.fileName;
        const isCodeFile = /\.(ts|tsx|js|jsx|py|java|cpp|c|go|rs|rb|php|swift|kt|scala)$/i.test(fileName);
        if (!isCodeFile) {
            return actions;
        }
        // Check if file is excluded (node_modules, dist, build, .git)
        if (/node_modules|dist|build|\.git/.test(fileName)) {
            return actions;
        }
        // Get the selected text
        const selectedText = document.getText(range);
        const hasSelection = selectedText.trim().length > 0;
        // 1. Explain Code (registered in commands.ts)
        const explainAction = new vscode.CodeAction('Helix: Explain Code', vscode.CodeActionKind.Refactor);
        explainAction.command = {
            command: 'helix.explainCode',
            title: 'Explain Code with Helix AI',
            arguments: [document, range],
        };
        explainAction.isPreferred = hasSelection;
        actions.push(explainAction);
        // 2. Improve / Refactor Code (registered in commands.ts as helix.refactorCode)
        const improveAction = new vscode.CodeAction('Helix: Improve Code', vscode.CodeActionKind.Refactor);
        improveAction.command = {
            command: 'helix.refactorCode',
            title: 'Improve Code with Helix AI',
            arguments: [document, range],
        };
        actions.push(improveAction);
        // 3. Generate Tests (registered in commands.ts)
        const generateTestsAction = new vscode.CodeAction('Helix: Generate Tests', vscode.CodeActionKind.Source);
        generateTestsAction.command = {
            command: 'helix.generateTests',
            title: 'Generate Tests with Helix AI',
            arguments: [document, range],
        };
        actions.push(generateTestsAction);
        // 4. Add Documentation (registered in commands.ts as helix.generateDocumentation)
        const documentAction = new vscode.CodeAction('Helix: Add Documentation', vscode.CodeActionKind.Source);
        documentAction.command = {
            command: 'helix.generateDocumentation',
            title: 'Add Documentation with Helix AI',
            arguments: [document, range],
        };
        actions.push(documentAction);
        return actions;
    }
}
exports.HelixCodeActionProvider = HelixCodeActionProvider;
/**
 * Register the Code Action Provider (commands are registered in commands.ts)
 */
function registerCodeActionProvider(context) {
    const provider = new HelixCodeActionProvider();
    const providerRegistration = vscode.languages.registerCodeActionsProvider({
        scheme: 'file',
        language: '*',
    }, provider, {
        providedCodeActionKinds: [
            vscode.CodeActionKind.Refactor,
            vscode.CodeActionKind.RefactorInline,
            vscode.CodeActionKind.QuickFix,
            vscode.CodeActionKind.Source,
        ],
    });
    context.subscriptions.push(providerRegistration);
    return providerRegistration;
}
//# sourceMappingURL=codeActionProvider.js.map