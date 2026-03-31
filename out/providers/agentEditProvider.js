"use strict";
/**
 * Helix Agent Edit Provider
 * =========================
 * Agentic file editing: describe a change in plain language, let Helix AI
 * generate precise search/replace edits, preview each change in VS Code's
 * built-in diff viewer, then apply with one click.
 *
 * Features:
 *  - Multi-file context: auto-detects relative imports from the active file
 *    and includes them as additional context (up to 4 extra files).
 *  - Pre-edit snapshot: captures file contents before any changes so the
 *    user can revert the whole batch via `helix.revertLastEdit`.
 *  - Per-edit diff review: each proposed change opens in the VS Code diff
 *    viewer with Apply / Skip buttons.
 *
 * Commands registered:
 *  - helix.runAgentEdit     — trigger an agent edit from the active editor
 *  - helix.revertLastEdit   — revert all files changed by the last agent edit
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
exports.AgentEditProvider = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const SNAPSHOT_KEY = 'helix.lastEditSnapshot';
// ---------------------------------------------------------------------------
// Virtual document provider — supplies "after" content for the diff view
// ---------------------------------------------------------------------------
class EditPreviewProvider {
    constructor() {
        this._contents = new Map();
        this._onChange = new vscode.EventEmitter();
        this.onDidChange = this._onChange.event;
    }
    set(uri, content) {
        this._contents.set(uri.toString(), content);
        this._onChange.fire(uri);
    }
    provideTextDocumentContent(uri) {
        return this._contents.get(uri.toString()) ?? '';
    }
    dispose() {
        this._onChange.dispose();
    }
}
// ---------------------------------------------------------------------------
// AgentEditProvider — singleton registered in extension.ts
// ---------------------------------------------------------------------------
class AgentEditProvider {
    /**
     * Programmatic entry-point — skips the InputBox and uses a pre-supplied task.
     * Called from chatPanelProvider when the user types "edit: <task>" in chat.
     */
    static async runWithTask(context, task) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Helix: open a file in the editor before using chat-driven edit.');
            return;
        }
        await AgentEditProvider._runWithEditor(context, editor, task);
    }
    /** Call once from activate() to register commands and content provider. */
    static register(context) {
        // Register the virtual-doc scheme used by the diff viewer
        if (!AgentEditProvider._providerRegistration) {
            AgentEditProvider._providerRegistration =
                vscode.workspace.registerTextDocumentContentProvider('helix-edit-preview', AgentEditProvider._previewProvider);
            context.subscriptions.push(AgentEditProvider._providerRegistration);
        }
        context.subscriptions.push(vscode.commands.registerCommand('helix.runAgentEdit', () => AgentEditProvider._run(context)), vscode.commands.registerCommand('helix.revertLastEdit', () => AgentEditProvider._revertLast(context)));
    }
    // -------------------------------------------------------------------------
    // Main flow
    // -------------------------------------------------------------------------
    static async _run(context) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Open a file before running Helix Agent Edit.');
            return;
        }
        const task = await vscode.window.showInputBox({
            title: 'Helix Agent Edit',
            prompt: 'Describe the code changes you want Helix to make',
            placeHolder: 'e.g., Add try/catch error handling to the fetchData function',
            ignoreFocusOut: true,
        });
        if (!task?.trim()) {
            return;
        }
        await AgentEditProvider._runWithEditor(context, editor, task);
    }
    static async _runWithEditor(context, editor, task) {
        // Gather context: active file + auto-detected related files
        const contextFiles = await AgentEditProvider._gatherContextFiles(editor);
        // Call the backend with a progress indicator
        let edits = [];
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Helix AI is analysing ${contextFiles.length} file(s)…`,
            cancellable: false,
        }, async () => {
            try {
                const endpoint = vscode.workspace
                    .getConfiguration('helix')
                    .get('apiEndpoint') ?? 'http://localhost:8000';
                const authToken = context.globalState.get('helix.authTokenValue') ?? '';
                const res = await fetch(`${endpoint}/api/copilot/edit-files`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                    body: JSON.stringify({ task, files: contextFiles }),
                });
                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(`Backend error ${res.status}: ${errText}`);
                }
                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.error ?? 'Unknown backend error');
                }
                edits = data.edits ?? [];
            }
            catch (err) {
                vscode.window.showErrorMessage(`Helix edit failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        });
        if (edits.length === 0) {
            vscode.window.showInformationMessage('Helix: no changes needed for this task.');
            return;
        }
        // 5. Snapshot files that will be modified (before any changes are applied)
        const filesToModify = [...new Set(edits.map(e => e.file))];
        await AgentEditProvider._saveSnapshot(context, filesToModify);
        // 6. Review and apply each edit
        let applied = 0;
        let skipped = 0;
        for (const edit of edits) {
            const accepted = await AgentEditProvider._reviewEdit(edit);
            if (accepted) {
                applied++;
            }
            else {
                skipped++;
            }
        }
        // 7. Completion message with revert option
        if (applied > 0) {
            const choice = await vscode.window.showInformationMessage(`Helix edit complete: ${applied} applied, ${skipped} skipped.`, 'Revert All Changes');
            if (choice === 'Revert All Changes') {
                await AgentEditProvider._revertLast(context);
            }
        }
        else {
            vscode.window.showInformationMessage('Helix: no changes were applied.');
        }
    }
    // -------------------------------------------------------------------------
    // Per-edit diff review + apply
    // -------------------------------------------------------------------------
    static async _reviewEdit(edit) {
        let doc;
        try {
            doc = await vscode.workspace.openTextDocument(edit.file);
        }
        catch {
            vscode.window.showWarningMessage(`Helix: could not open ${edit.file}`);
            return false;
        }
        const originalText = doc.getText();
        const idx = originalText.indexOf(edit.original);
        if (idx === -1) {
            vscode.window.showWarningMessage(`Helix: could not locate the target text in ${path.basename(edit.file)}. ` + `Edit skipped: "${edit.explanation}"`);
            return false;
        }
        // Build the "after" content for the diff preview
        const newContent = originalText.slice(0, idx) +
            edit.replacement +
            originalText.slice(idx + edit.original.length);
        const previewUri = vscode.Uri.parse(`helix-edit-preview:/${encodeURIComponent(path.basename(edit.file))}?t=${Date.now()}`);
        AgentEditProvider._previewProvider.set(previewUri, newContent);
        // Show diff — original (left) vs proposed change (right)
        const title = `Helix: ${edit.explanation} — ${path.basename(edit.file)}`;
        await vscode.commands.executeCommand('vscode.diff', doc.uri, previewUri, title, { preview: true });
        const choice = await vscode.window.showInformationMessage(`Apply change: ${edit.explanation}`, { modal: false }, 'Apply', 'Skip');
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        if (choice !== 'Apply') {
            return false;
        }
        // Apply via WorkspaceEdit (re-read to handle earlier edits in the same run)
        try {
            const currentDoc = await vscode.workspace.openTextDocument(edit.file);
            const currentText = currentDoc.getText();
            const currentIdx = currentText.indexOf(edit.original);
            if (currentIdx === -1) {
                vscode.window.showWarningMessage(`Helix: target text changed before apply — skipped "${edit.explanation}"`);
                return false;
            }
            const workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.replace(currentDoc.uri, new vscode.Range(currentDoc.positionAt(currentIdx), currentDoc.positionAt(currentIdx + edit.original.length)), edit.replacement);
            const ok = await vscode.workspace.applyEdit(workspaceEdit);
            if (ok) {
                await currentDoc.save();
            }
            return ok;
        }
        catch (err) {
            vscode.window.showErrorMessage(`Helix: failed to apply edit — ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    }
    // -------------------------------------------------------------------------
    // Multi-file context gathering
    // -------------------------------------------------------------------------
    /**
     * Returns the active file plus any relative imports it references, up to
     * MAX_CONTEXT_FILES total. Silently skips imports that can't be resolved.
     */
    static async _gatherContextFiles(editor) {
        const MAX_CONTEXT_FILES = 5;
        const active = {
            path: editor.document.uri.fsPath,
            content: editor.document.getText(),
        };
        const files = [active];
        const seen = new Set([active.path]);
        const activeDir = path.dirname(active.path);
        const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
        const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
        let match;
        while ((match = importRegex.exec(active.content)) !== null &&
            files.length < MAX_CONTEXT_FILES) {
            const importPath = match[1];
            for (const ext of extensions) {
                const resolved = path.resolve(activeDir, importPath + ext);
                if (seen.has(resolved)) {
                    break;
                }
                try {
                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(resolved));
                    files.push({ path: resolved, content: doc.getText() });
                    seen.add(resolved);
                    break;
                }
                catch {
                    // Extension didn't match; try the next one
                }
            }
        }
        return files;
    }
    // -------------------------------------------------------------------------
    // Snapshot + revert
    // -------------------------------------------------------------------------
    /** Captures current content of the given files and persists to globalState. */
    static async _saveSnapshot(context, filePaths) {
        const entries = [];
        for (const fp of filePaths) {
            try {
                const doc = await vscode.workspace.openTextDocument(fp);
                entries.push([fp, doc.getText()]);
            }
            catch (err) {
                console.warn(`Helix snapshot: could not read ${fp}:`, err);
            }
        }
        await context.globalState.update(SNAPSHOT_KEY, entries);
    }
    /** Restores all files from the last saved snapshot. */
    static async _revertLast(context) {
        const entries = context.globalState.get(SNAPSHOT_KEY) ?? [];
        if (entries.length === 0) {
            vscode.window.showInformationMessage('Helix: no previous edit to revert.');
            return;
        }
        const workspaceEdit = new vscode.WorkspaceEdit();
        for (const [filePath, originalContent] of entries) {
            try {
                const uri = vscode.Uri.file(filePath);
                const doc = await vscode.workspace.openTextDocument(uri);
                workspaceEdit.replace(uri, new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), originalContent);
            }
            catch (err) {
                console.warn(`Helix revert: could not open ${filePath}:`, err);
            }
        }
        const ok = await vscode.workspace.applyEdit(workspaceEdit);
        if (!ok) {
            vscode.window.showErrorMessage('Helix: revert failed — workspace edit was rejected.');
            return;
        }
        // Save all reverted files
        for (const [filePath] of entries) {
            try {
                const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
                await doc.save();
            }
            catch (err) {
                console.warn(`Helix revert: could not save ${filePath}:`, err);
            }
        }
        // Clear the snapshot so a second revert doesn't loop
        await context.globalState.update(SNAPSHOT_KEY, []);
        vscode.window.showInformationMessage(`Helix: reverted changes to ${entries.length} file(s).`);
    }
}
exports.AgentEditProvider = AgentEditProvider;
AgentEditProvider._previewProvider = new EditPreviewProvider();
//# sourceMappingURL=agentEditProvider.js.map