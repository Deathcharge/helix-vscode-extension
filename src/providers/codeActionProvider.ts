import * as vscode from 'vscode';

/**
 * Code Action Provider for Helix VSCode Extension
 * Provides intelligent code actions: Explain, Improve, and Generate Tests
 *
 * Commands are registered in commands.ts — this provider only surfaces them
 * as code actions (lightbulb menu) in the editor.
 */
export class HelixCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Only provide actions for code files
    const fileName = document.fileName;
    const isCodeFile =
      /\.(ts|tsx|js|jsx|py|java|cpp|c|go|rs|rb|php|swift|kt|scala)$/i.test(
        fileName
      );

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
    const explainAction = new vscode.CodeAction(
      'Helix: Explain Code',
      vscode.CodeActionKind.Refactor
    );
    explainAction.command = {
      command: 'helix.explainCode',
      title: 'Explain Code with Helix AI',
      arguments: [document, range],
    };
    explainAction.isPreferred = hasSelection;
    actions.push(explainAction);

    // 2. Improve / Refactor Code (registered in commands.ts as helix.refactorCode)
    const improveAction = new vscode.CodeAction(
      'Helix: Improve Code',
      vscode.CodeActionKind.Refactor
    );
    improveAction.command = {
      command: 'helix.refactorCode',
      title: 'Improve Code with Helix AI',
      arguments: [document, range],
    };
    actions.push(improveAction);

    // 3. Generate Tests (registered in commands.ts)
    const generateTestsAction = new vscode.CodeAction(
      'Helix: Generate Tests',
      vscode.CodeActionKind.Source
    );
    generateTestsAction.command = {
      command: 'helix.generateTests',
      title: 'Generate Tests with Helix AI',
      arguments: [document, range],
    };
    actions.push(generateTestsAction);

    // 4. Add Documentation (registered in commands.ts as helix.generateDocumentation)
    const documentAction = new vscode.CodeAction(
      'Helix: Add Documentation',
      vscode.CodeActionKind.Source
    );
    documentAction.command = {
      command: 'helix.generateDocumentation',
      title: 'Add Documentation with Helix AI',
      arguments: [document, range],
    };
    actions.push(documentAction);

    return actions;
  }
}

/**
 * Register the Code Action Provider (commands are registered in commands.ts)
 */
export function registerCodeActionProvider(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const provider = new HelixCodeActionProvider();

  const providerRegistration = vscode.languages.registerCodeActionsProvider(
    {
      scheme: 'file',
      language: '*',
    },
    provider,
    {
      providedCodeActionKinds: [
        vscode.CodeActionKind.Refactor,
        vscode.CodeActionKind.RefactorInline,
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.Source,
      ],
    }
  );

  context.subscriptions.push(providerRegistration);

  return providerRegistration;
}
