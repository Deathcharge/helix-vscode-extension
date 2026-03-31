"use strict";
/**
 * Helix VS Code Extension - Git Integration Commands
 * ====================================================
 * Registers three git-related commands:
 *   - helix.generateCommitMessage  -- AI-generated conventional commit message
 *   - helix.generatePRDescription  -- AI-generated PR description (copied to clipboard)
 *   - helix.explainGitBlame        -- Explain why a line was changed via git blame
 *
 * All three use the Helix API (`/api/copilot/message`) for LLM generation.
 * When the API is unavailable they surface a clear error -- no fake fallback.
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
exports.registerGitCommands = registerGitCommands;
const cp = __importStar(require("child_process"));
const vscode = __importStar(require("vscode"));
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Run a shell command in the first workspace folder. */
function exec(command, cwd, maxBuffer = 1024 * 256) {
    return new Promise((resolve, reject) => {
        cp.exec(command, { cwd, maxBuffer }, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(stderr || err.message));
            }
            else {
                resolve(stdout);
            }
        });
    });
}
/** Get the VS Code Git extension API, if available. */
function getGitApi() {
    const gitExt = vscode.extensions.getExtension('vscode.git');
    if (!gitExt)
        return undefined;
    return gitExt.exports?.getAPI(1);
}
/** Get the first repository from the VS Code Git extension. */
function getRepository() {
    const git = getGitApi();
    if (!git || git.repositories.length === 0)
        return undefined;
    return git.repositories[0];
}
/** Send a prompt to the Helix copilot API and return the text response. */
async function askHelix(context, prompt) {
    const config = vscode.workspace.getConfiguration('helix');
    const endpoint = config.get('apiEndpoint') || 'http://localhost:8000';
    const authToken = context.globalState.get('helix.authTokenValue') ?? '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch(`${endpoint}/api/copilot/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            signal: controller.signal,
            body: JSON.stringify({
                message: prompt,
                agent: 'helix',
                context: { page: 'vscode', route: '/vscode' },
                useEnhanced: false,
                tier: 'free',
            }),
        });
        if (!res.ok) {
            throw new Error(`API responded with ${res.status}`);
        }
        const json = (await res.json());
        // The copilot /message endpoint returns { response: "..." }
        if (typeof json['response'] === 'string') {
            return json['response'];
        }
        // Fallback: stringify whatever came back
        return JSON.stringify(json);
    }
    finally {
        clearTimeout(timeout);
    }
}
// ---------------------------------------------------------------------------
// Command implementations
// ---------------------------------------------------------------------------
async function generateCommitMessage(context) {
    const repo = getRepository();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }
    const cwd = workspaceFolder.uri.fsPath;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating commit message...',
        cancellable: false,
    }, async () => {
        try {
            // Try staged diff first, then unstaged
            let diff = '';
            try {
                diff = await exec('git diff --cached', cwd);
            }
            catch {
                // git not available via CLI — continue
            }
            if (!diff.trim()) {
                try {
                    diff = await exec('git diff', cwd);
                }
                catch {
                    // fallthrough
                }
            }
            if (!diff.trim()) {
                vscode.window.showWarningMessage('No changes detected. Stage some changes first.');
                return;
            }
            // Truncate very large diffs
            const truncated = diff.length > 8000 ? diff.slice(0, 8000) + '\n...(truncated)' : diff;
            const commitStyle = vscode.workspace
                .getConfiguration('helix')
                .get('git.commitMessageStyle') ?? 'conventional';
            const prompt = `Generate a ${commitStyle} commit message for these changes. ` +
                `Return ONLY the commit message text, no explanation or markdown fences.\n\n` +
                `Diff:\n${truncated}`;
            const generated = await askHelix(context, prompt);
            // Clean up: strip markdown code fences if the model wrapped it
            const cleaned = generated
                .replace(/^```[\w]*\n?/gm, '')
                .replace(/```$/gm, '')
                .trim();
            // Insert into SCM input box if possible
            if (repo) {
                repo.inputBox.value = cleaned;
                vscode.window.showInformationMessage('Commit message generated and inserted into the Source Control input box.');
            }
            else {
                // Fallback: copy to clipboard
                await vscode.env.clipboard.writeText(cleaned);
                vscode.window.showInformationMessage('Commit message copied to clipboard (Git extension not available).');
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Failed to generate commit message: ${msg}`);
        }
    });
}
async function generatePRDescription(context) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }
    const cwd = workspaceFolder.uri.fsPath;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating PR description...',
        cancellable: false,
    }, async () => {
        try {
            // Determine base branch
            let baseBranch = 'main';
            try {
                // Check if main exists, otherwise try master
                await exec('git rev-parse --verify main', cwd);
            }
            catch {
                try {
                    await exec('git rev-parse --verify master', cwd);
                    baseBranch = 'master';
                }
                catch {
                    // Fallback — keep main
                }
            }
            // Get current branch name
            let currentBranch = '';
            try {
                currentBranch = (await exec('git rev-parse --abbrev-ref HEAD', cwd)).trim();
            }
            catch {
                currentBranch = 'current branch';
            }
            // Get commits on this branch vs base
            let commitLog = '';
            try {
                commitLog = await exec(`git log ${baseBranch}..HEAD --oneline`, cwd);
            }
            catch {
                // May fail if base branch doesn't have common ancestor
            }
            // Get combined diff stat
            let diffStat = '';
            try {
                diffStat = await exec(`git diff ${baseBranch}...HEAD --stat`, cwd);
            }
            catch {
                // continue
            }
            if (!commitLog.trim() && !diffStat.trim()) {
                vscode.window.showWarningMessage(`No commits found on ${currentBranch} vs ${baseBranch}.`);
                return;
            }
            const prompt = `Generate a pull request description in markdown format for branch "${currentBranch}" merging into "${baseBranch}". ` +
                `Include a summary section and a "Changes" section. ` +
                `Return ONLY the markdown content.\n\n` +
                `Commits:\n${commitLog.slice(0, 4000)}\n\n` +
                `Diff stat:\n${diffStat.slice(0, 2000)}`;
            const generated = await askHelix(context, prompt);
            await vscode.env.clipboard.writeText(generated.trim());
            vscode.window.showInformationMessage('PR description copied to clipboard.');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Failed to generate PR description: ${msg}`);
        }
    });
}
async function explainGitBlame(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }
    const cwd = workspaceFolder.uri.fsPath;
    const filePath = editor.document.fileName;
    const lineNumber = editor.selection.active.line + 1; // 1-based
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Explaining blame for line ${lineNumber}...`,
        cancellable: false,
    }, async () => {
        try {
            // Run git blame for this specific line
            const blameOutput = await exec(`git blame -L ${lineNumber},${lineNumber} --porcelain "${filePath}"`, cwd);
            // Get a few lines of surrounding context
            const doc = editor.document;
            const startLine = Math.max(0, lineNumber - 4);
            const endLine = Math.min(doc.lineCount, lineNumber + 3);
            const surroundingLines = [];
            for (let i = startLine; i < endLine; i++) {
                const prefix = i === lineNumber - 1 ? '>>>' : '   ';
                surroundingLines.push(`${prefix} ${i + 1}: ${doc.lineAt(i).text}`);
            }
            const surroundingCode = surroundingLines.join('\n');
            const prompt = `Explain why this line was changed based on the git blame information below. ` +
                `Be concise (2-3 sentences). Focus on the intent of the change.\n\n` +
                `Git blame output:\n${blameOutput.slice(0, 2000)}\n\n` +
                `Surrounding code:\n${surroundingCode}`;
            const explanation = await askHelix(context, prompt);
            // Show in a quick pick / information message
            const items = explanation
                .trim()
                .split('\n')
                .filter(l => l.trim())
                .map(l => ({ label: l.trim() }));
            if (items.length <= 2) {
                vscode.window.showInformationMessage(`Line ${lineNumber}: ${explanation.trim()}`);
            }
            else {
                vscode.window.showQuickPick(items, {
                    title: `Git Blame Explanation - Line ${lineNumber}`,
                    placeHolder: explanation.trim().slice(0, 100),
                });
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Failed to explain git blame: ${msg}`);
        }
    });
}
// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
function registerGitCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand('helix.generateCommitMessage', () => generateCommitMessage(context)), vscode.commands.registerCommand('helix.generatePRDescription', () => generatePRDescription(context)), vscode.commands.registerCommand('helix.explainGitBlame', () => explainGitBlame(context)));
}
//# sourceMappingURL=gitCommands.js.map