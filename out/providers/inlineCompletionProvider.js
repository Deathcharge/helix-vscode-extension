"use strict";
/**
 * Helix AI Inline Completion Provider
 * ====================================
 * Provides ghost-text code completions in the editor using the Helix AI
 * local LLM or any configured cloud provider via the /api/copilot/complete
 * endpoint.
 *
 * Registered with `vscode.languages.registerInlineCompletionItemProvider`.
 */
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
exports.HelixInlineCompletionProvider = void 0;
exports.registerInlineCompletionProvider = registerInlineCompletionProvider;
const vscode = __importStar(require("vscode"));
const DEBOUNCE_MS = 350;
class HelixInlineCompletionProvider {
    constructor(context) {
        this.lastRequestId = 0;
        this.abortController = null;
        this.context = context;
    }
    getApiEndpoint() {
        return (vscode.workspace.getConfiguration('helix').get('apiEndpoint') ||
            'http://localhost:8000');
    }
    getAuthToken() {
        const raw = this.context.globalState.get('helix.authTokenValue');
        return raw || null;
    }
    async provideInlineCompletionItems(document, position, context, token) {
        // Check if inline completions are enabled in settings
        const config = vscode.workspace.getConfiguration('helix');
        if (!config.get('enableInlineCompletions', true)) {
            return undefined;
        }
        // Only trigger on typing (not explicit invoke) to avoid spamming
        if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
            // Debounce rapid keystrokes
            return new Promise(resolve => {
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                this.debounceTimer = setTimeout(async () => {
                    const items = await this.fetchCompletion(document, position, token);
                    resolve(items);
                }, DEBOUNCE_MS);
            });
        }
        return this.fetchCompletion(document, position, token);
    }
    async fetchCompletion(document, position, token) {
        // Cancel previous in-flight request
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        const requestId = ++this.lastRequestId;
        // Build context — surrounding lines
        const startLine = Math.max(0, position.line - 30);
        const endLine = Math.min(document.lineCount - 1, position.line + 5);
        const prefix = document.getText(new vscode.Range(new vscode.Position(startLine, 0), position));
        const suffix = document.getText(new vscode.Range(position, new vscode.Position(endLine, document.lineAt(endLine).text.length)));
        if (prefix.trim().length < 5) {
            return undefined; // Too little context
        }
        const endpoint = this.getApiEndpoint();
        // Build headers with auth token
        const headers = {
            'Content-Type': 'application/json',
        };
        const authToken = this.getAuthToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        try {
            const res = await fetch(`${endpoint}/api/copilot/complete`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    prefix,
                    suffix,
                    language: document.languageId,
                    file: document.fileName,
                    max_tokens: 128,
                }),
                signal: this.abortController.signal,
            });
            // Check if this request is still relevant
            if (requestId !== this.lastRequestId || token.isCancellationRequested) {
                return undefined;
            }
            if (!res.ok) {
                return undefined;
            }
            const data = await res.json();
            if (!data.completion) {
                return undefined;
            }
            const item = new vscode.InlineCompletionItem(data.completion, new vscode.Range(position, position));
            return [item];
        }
        catch {
            // Network error or aborted — silently ignore
            return undefined;
        }
    }
}
exports.HelixInlineCompletionProvider = HelixInlineCompletionProvider;
/**
 * Register the inline completion provider for all languages.
 */
function registerInlineCompletionProvider(context) {
    const provider = new HelixInlineCompletionProvider(context);
    const disposable = vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider);
    context.subscriptions.push(disposable);
    return disposable;
}
//# sourceMappingURL=inlineCompletionProvider.js.map