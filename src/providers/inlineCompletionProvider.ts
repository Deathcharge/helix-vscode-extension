/**
 * Helix AI Inline Completion Provider
 * ====================================
 * Provides ghost-text code completions in the editor using the Helix AI
 * local LLM or any configured cloud provider via the /api/copilot/complete
 * endpoint.
 *
 * Registered with `vscode.languages.registerInlineCompletionItemProvider`.
 */

import * as vscode from 'vscode';

const DEBOUNCE_MS = 350;

interface CompletionResponse {
  completion: string;
  model: string;
  provider: string;
  tokens_used?: number;
}

export class HelixInlineCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private lastRequestId = 0;
  private abortController: AbortController | null = null;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getApiEndpoint(): string {
    return (
      vscode.workspace.getConfiguration('helix').get<string>('apiEndpoint') ||
      'http://localhost:8000'
    );
  }

  private getAuthToken(): string | null {
    const raw = this.context.globalState.get<string>('helix.authTokenValue');
    return raw || null;
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    // Check if inline completions are enabled in settings
    const config = vscode.workspace.getConfiguration('helix');
    if (!config.get<boolean>('enableInlineCompletions', true)) {
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

  private async fetchCompletion(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    // Cancel previous in-flight request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const requestId = ++this.lastRequestId;

    // Build context — surrounding lines
    const startLine = Math.max(0, position.line - 30);
    const endLine = Math.min(document.lineCount - 1, position.line + 5);
    const prefix = document.getText(
      new vscode.Range(new vscode.Position(startLine, 0), position)
    );
    const suffix = document.getText(
      new vscode.Range(
        position,
        new vscode.Position(endLine, document.lineAt(endLine).text.length)
      )
    );

    if (prefix.trim().length < 5) {
      return undefined; // Too little context
    }

    const endpoint = this.getApiEndpoint();

    // Build headers with auth token
    const headers: Record<string, string> = {
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

      const data: CompletionResponse = await res.json();
      if (!data.completion) {
        return undefined;
      }

      const item = new vscode.InlineCompletionItem(
        data.completion,
        new vscode.Range(position, position)
      );

      return [item];
    } catch {
      // Network error or aborted — silently ignore
      return undefined;
    }
  }
}

/**
 * Register the inline completion provider for all languages.
 */
export function registerInlineCompletionProvider(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const provider = new HelixInlineCompletionProvider(context);
  const disposable = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    provider
  );
  context.subscriptions.push(disposable);
  return disposable;
}
