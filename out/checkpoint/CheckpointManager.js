"use strict";
/**
 * Helix VS Code Extension - Checkpoint Manager
 * Automatic checkpoint creation and task history management.
 *
 * Checkpoints store the actual file contents of currently-open editors on disk
 * under `context.globalStorageUri/checkpoints/`. This allows full workspace
 * restoration after agent edits.
 *
 * All persistence is filesystem-backed (not globalState) to avoid VS Code's
 * globalState size limits.
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
exports.CheckpointManager = void 0;
const vscode = __importStar(require("vscode"));
// ---------------------------------------------------------------------------
// CheckpointManager
// ---------------------------------------------------------------------------
class CheckpointManager {
    constructor(context) {
        this.checkpoints = new Map();
        this.taskHistory = new Map();
        this.indexLoaded = false;
        this.eventEmitter = new vscode.EventEmitter();
        /**
         * Event fired when task history changes
         */
        this.onDidChangeTaskHistory = this.eventEmitter.event;
        this.context = context;
    }
    static getInstance(context) {
        if (!CheckpointManager.instance) {
            if (!context) {
                throw new Error('CheckpointManager requires ExtensionContext on first initialization');
            }
            CheckpointManager.instance = new CheckpointManager(context);
            // Fire-and-forget: load index from disk
            void CheckpointManager.instance.loadIndex();
        }
        return CheckpointManager.instance;
    }
    // -----------------------------------------------------------------------
    // Filesystem paths
    // -----------------------------------------------------------------------
    getCheckpointsDirUri() {
        return vscode.Uri.joinPath(this.context.globalStorageUri, 'checkpoints');
    }
    getIndexFileUri() {
        return vscode.Uri.joinPath(this.getCheckpointsDirUri(), 'index.json');
    }
    getSnapshotFileUri(checkpointId) {
        return vscode.Uri.joinPath(this.getCheckpointsDirUri(), `${checkpointId}.json`);
    }
    // -----------------------------------------------------------------------
    // Index persistence (filesystem-backed, replaces globalState)
    // -----------------------------------------------------------------------
    async loadIndex() {
        try {
            const bytes = await vscode.workspace.fs.readFile(this.getIndexFileUri());
            const json = Buffer.from(bytes).toString('utf-8');
            const index = JSON.parse(json);
            for (const cpj of index.checkpoints) {
                this.checkpoints.set(cpj.id, {
                    ...cpj,
                    timestamp: new Date(cpj.timestamp),
                });
            }
            for (const tj of index.tasks) {
                this.taskHistory.set(tj.taskId, {
                    ...tj,
                    startTime: new Date(tj.startTime),
                    endTime: tj.endTime ? new Date(tj.endTime) : undefined,
                });
            }
        }
        catch {
            // Index file does not exist yet (first run). That is fine.
        }
        // Migrate legacy globalState data if present
        await this.migrateLegacyGlobalState();
        this.indexLoaded = true;
    }
    /** Ensure the index has been loaded before any read/write operation. */
    async ensureIndexLoaded() {
        if (!this.indexLoaded) {
            await this.loadIndex();
        }
    }
    async saveIndex() {
        try {
            const dir = this.getCheckpointsDirUri();
            await vscode.workspace.fs.createDirectory(dir);
            const checkpoints = Array.from(this.checkpoints.values()).map(cp => ({
                id: cp.id,
                taskId: cp.taskId,
                timestamp: cp.timestamp.toISOString(),
                description: cp.description,
                filePaths: cp.filePaths,
                sizeBytes: cp.sizeBytes,
                metadata: cp.metadata,
            }));
            const tasks = Array.from(this.taskHistory.values()).map(t => ({
                taskId: t.taskId,
                name: t.name,
                startTime: t.startTime.toISOString(),
                endTime: t.endTime?.toISOString(),
                status: t.status,
                checkpoints: t.checkpoints,
                metadata: t.metadata,
            }));
            const index = { checkpoints, tasks };
            const json = JSON.stringify(index, null, 2);
            await vscode.workspace.fs.writeFile(this.getIndexFileUri(), Buffer.from(json, 'utf-8'));
        }
        catch (err) {
            console.warn('CheckpointManager: failed to save index:', err);
        }
    }
    /**
     * One-time migration: pull any data stored in the old globalState keys
     * into the new filesystem-backed index, then clear the globalState keys.
     */
    async migrateLegacyGlobalState() {
        try {
            const oldCheckpoints = this.context.globalState.get('checkpoints');
            const oldTasks = this.context.globalState.get('taskHistory');
            if (!oldCheckpoints && !oldTasks) {
                return;
            }
            let migrated = false;
            if (oldCheckpoints) {
                for (const raw of oldCheckpoints) {
                    const id = raw['id'];
                    if (id && !this.checkpoints.has(id)) {
                        // Old checkpoints stored hashes in `snapshot` — we cannot restore
                        // content from those, but we preserve the metadata so the index
                        // stays consistent.
                        const snapshotObj = raw['snapshot'];
                        const filePaths = snapshotObj ? Object.keys(snapshotObj) : [];
                        this.checkpoints.set(id, {
                            id,
                            taskId: raw['taskId'] ?? '',
                            timestamp: new Date(raw['timestamp']),
                            description: raw['description'] ?? '',
                            filePaths,
                            sizeBytes: 0, // unknown for legacy entries
                            metadata: raw['metadata'],
                        });
                        migrated = true;
                    }
                }
            }
            if (oldTasks) {
                for (const raw of oldTasks) {
                    const taskId = raw['taskId'];
                    if (taskId && !this.taskHistory.has(taskId)) {
                        this.taskHistory.set(taskId, {
                            taskId,
                            name: raw['name'] ?? '',
                            startTime: new Date(raw['startTime']),
                            endTime: raw['endTime']
                                ? new Date(raw['endTime'])
                                : undefined,
                            status: raw['status'] ?? 'completed',
                            checkpoints: raw['checkpoints'] ?? [],
                            metadata: raw['metadata'],
                        });
                        migrated = true;
                    }
                }
            }
            if (migrated) {
                await this.saveIndex();
            }
            // Clear legacy keys
            await this.context.globalState.update('checkpoints', undefined);
            await this.context.globalState.update('taskHistory', undefined);
            console.log('CheckpointManager: migrated legacy globalState data to filesystem');
        }
        catch (err) {
            console.warn('CheckpointManager: failed to migrate legacy globalState:', err);
        }
    }
    // -----------------------------------------------------------------------
    // Snapshot disk I/O
    // -----------------------------------------------------------------------
    /**
     * Write a checkpoint snapshot (with file contents) to disk.
     * Returns the size in bytes of the written file.
     */
    async writeSnapshotToDisk(payload) {
        const dir = this.getCheckpointsDirUri();
        await vscode.workspace.fs.createDirectory(dir);
        const fileUri = this.getSnapshotFileUri(payload.id);
        const json = JSON.stringify(payload);
        const bytes = Buffer.from(json, 'utf-8');
        await vscode.workspace.fs.writeFile(fileUri, bytes);
        return bytes.length;
    }
    /**
     * Read a checkpoint snapshot from disk.
     */
    async readSnapshotFromDisk(checkpointId) {
        try {
            const fileUri = this.getSnapshotFileUri(checkpointId);
            const bytes = await vscode.workspace.fs.readFile(fileUri);
            const json = Buffer.from(bytes).toString('utf-8');
            return JSON.parse(json);
        }
        catch {
            return null;
        }
    }
    /**
     * Delete a checkpoint snapshot file from disk.
     */
    async deleteSnapshotFromDisk(checkpointId) {
        try {
            const fileUri = this.getSnapshotFileUri(checkpointId);
            await vscode.workspace.fs.delete(fileUri, { useTrash: false });
        }
        catch {
            // File may already be gone — that is fine
        }
    }
    // -----------------------------------------------------------------------
    // Task lifecycle
    // -----------------------------------------------------------------------
    /**
     * Start a new task
     */
    startTask(name, metadata) {
        const taskId = `task-${Date.now()}`;
        const task = {
            taskId,
            name,
            startTime: new Date(),
            status: 'active',
            checkpoints: [],
            metadata,
        };
        this.taskHistory.set(taskId, task);
        this.activeTaskId = taskId;
        void this.saveIndex();
        this.eventEmitter.fire(Array.from(this.taskHistory.values()));
        return taskId;
    }
    /**
     * Complete the active task
     */
    completeTask(status = 'completed') {
        if (!this.activeTaskId) {
            return;
        }
        const task = this.taskHistory.get(this.activeTaskId);
        if (task) {
            task.endTime = new Date();
            task.status = status;
            void this.saveIndex();
            this.eventEmitter.fire(Array.from(this.taskHistory.values()));
        }
        this.activeTaskId = undefined;
    }
    /**
     * Get active task
     */
    getActiveTask() {
        if (!this.activeTaskId) {
            return undefined;
        }
        return this.taskHistory.get(this.activeTaskId);
    }
    /**
     * Get task by ID
     */
    getTask(taskId) {
        return this.taskHistory.get(taskId);
    }
    /**
     * Get all task history
     */
    getTaskHistory(limit) {
        const tasks = Array.from(this.taskHistory.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        return limit ? tasks.slice(0, limit) : tasks;
    }
    // -----------------------------------------------------------------------
    // Checkpoint creation
    // -----------------------------------------------------------------------
    /**
     * Create a checkpoint for the active task.
     * Snapshots every file currently open in an editor tab.
     */
    async createCheckpoint(description) {
        await this.ensureIndexLoaded();
        if (!this.activeTaskId) {
            throw new Error('No active task to create checkpoint for');
        }
        const task = this.taskHistory.get(this.activeTaskId);
        if (!task) {
            throw new Error('Active task not found');
        }
        const checkpointId = `checkpoint-${Date.now()}`;
        // Collect content from currently-open editor tabs only
        const files = await this.snapshotOpenEditors();
        // Write the full snapshot (with content) to disk
        const sizeBytes = await this.writeSnapshotToDisk({
            id: checkpointId,
            timestamp: Date.now(),
            description,
            files,
        });
        // Store lightweight metadata in memory / index (no file content)
        const checkpoint = {
            id: checkpointId,
            taskId: this.activeTaskId,
            timestamp: new Date(),
            description,
            filePaths: files.map(f => f.path),
            sizeBytes,
            metadata: task.metadata,
        };
        this.checkpoints.set(checkpointId, checkpoint);
        task.checkpoints.push(checkpointId);
        // Enforce count and size limits
        await this.enforceCheckpointLimits();
        await this.saveIndex();
        return checkpointId;
    }
    /**
     * Snapshot the content of all currently-open editor tabs.
     * Only includes file-scheme, non-untitled documents. Uses `getText()` so
     * that unsaved (dirty) content — i.e. exactly what the user sees — is
     * captured.
     */
    async snapshotOpenEditors() {
        const files = [];
        const seen = new Set();
        for (const doc of vscode.workspace.textDocuments) {
            if (doc.isUntitled || doc.uri.scheme !== 'file') {
                continue;
            }
            const fsPath = doc.uri.fsPath;
            if (seen.has(fsPath)) {
                continue;
            }
            seen.add(fsPath);
            try {
                files.push({
                    path: fsPath,
                    content: doc.getText(),
                    languageId: doc.languageId,
                });
            }
            catch (err) {
                console.warn(`CheckpointManager: could not read open document ${fsPath}:`, err);
            }
        }
        return files;
    }
    // -----------------------------------------------------------------------
    // Checkpoint restoration
    // -----------------------------------------------------------------------
    /**
     * Restore workspace files from a checkpoint.
     * Shows a modal confirmation dialog, then writes stored content back to
     * the original file paths on disk.
     */
    async restoreCheckpoint(checkpointId) {
        await this.ensureIndexLoaded();
        const checkpoint = this.checkpoints.get(checkpointId);
        if (!checkpoint) {
            vscode.window.showErrorMessage(`Checkpoint "${checkpointId}" not found`);
            return false;
        }
        // Confirmation dialog (modal so it cannot be dismissed accidentally)
        const fileCount = checkpoint.filePaths.length;
        const result = await vscode.window.showWarningMessage(`Restore ${fileCount} file(s) to checkpoint "${checkpoint.description}"?\n\n` +
            `This will overwrite current file contents with the state from ` +
            `${checkpoint.timestamp.toLocaleString()}.`, { modal: true }, 'Restore');
        if (result !== 'Restore') {
            return false;
        }
        // Read the full snapshot from disk
        const payload = await this.readSnapshotFromDisk(checkpointId);
        if (!payload) {
            vscode.window.showErrorMessage(`Checkpoint data file for "${checkpointId}" is missing or corrupted.`);
            return false;
        }
        if (payload.files.length === 0) {
            vscode.window.showInformationMessage('Checkpoint contains no files to restore.');
            return true;
        }
        let restored = 0;
        let failed = 0;
        const failures = [];
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Restoring checkpoint: ${checkpoint.description}`,
            cancellable: false,
        }, async (progress) => {
            for (let i = 0; i < payload.files.length; i++) {
                const file = payload.files[i];
                if (!file) {
                    continue;
                }
                progress.report({
                    increment: 100 / payload.files.length,
                    message: `${i + 1}/${payload.files.length} files`,
                });
                try {
                    const uri = vscode.Uri.file(file.path);
                    // Ensure parent directory exists (file may have been in a
                    // directory that was deleted since the checkpoint was taken)
                    const parentDir = vscode.Uri.joinPath(uri, '..');
                    try {
                        await vscode.workspace.fs.stat(parentDir);
                    }
                    catch {
                        await vscode.workspace.fs.createDirectory(parentDir);
                    }
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(file.content, 'utf-8'));
                    restored++;
                }
                catch (err) {
                    console.warn(`CheckpointManager: failed to restore file ${file.path}:`, err);
                    failures.push(file.path);
                    failed++;
                }
            }
        });
        if (failed > 0) {
            const failList = failures.slice(0, 3).join('\n');
            const more = failures.length > 3 ? `\n...and ${failures.length - 3} more` : '';
            vscode.window.showWarningMessage(`Restored ${restored} file(s). ${failed} file(s) could not be restored:\n${failList}${more}`);
        }
        else {
            vscode.window.showInformationMessage(`Restored ${restored} file(s) from checkpoint: ${checkpoint.description}`);
        }
        return restored > 0;
    }
    // -----------------------------------------------------------------------
    // Limits enforcement
    // -----------------------------------------------------------------------
    /**
     * Enforce both the checkpoint count cap (MAX_CHECKPOINTS) and the total
     * disk size cap (MAX_TOTAL_BYTES). Removes the oldest checkpoints first
     * until both limits are satisfied.
     */
    async enforceCheckpointLimits() {
        const sorted = Array.from(this.checkpoints.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        let totalSize = sorted.reduce((sum, cp) => sum + cp.sizeBytes, 0);
        let count = sorted.length;
        for (const oldest of sorted) {
            const overCount = count > CheckpointManager.MAX_CHECKPOINTS;
            const overSize = totalSize > CheckpointManager.MAX_TOTAL_BYTES;
            if (!overCount && !overSize) {
                break;
            }
            // Remove from owning task
            const task = this.taskHistory.get(oldest.taskId);
            if (task) {
                task.checkpoints = task.checkpoints.filter(id => id !== oldest.id);
            }
            this.checkpoints.delete(oldest.id);
            await this.deleteSnapshotFromDisk(oldest.id);
            totalSize -= oldest.sizeBytes;
            count--;
        }
    }
    // -----------------------------------------------------------------------
    // Checkpoint deletion
    // -----------------------------------------------------------------------
    /**
     * Delete a single checkpoint (metadata + disk file).
     */
    async deleteCheckpoint(checkpointId) {
        await this.ensureIndexLoaded();
        const checkpoint = this.checkpoints.get(checkpointId);
        if (!checkpoint) {
            return false;
        }
        // Remove from task's checkpoint list
        const task = this.taskHistory.get(checkpoint.taskId);
        if (task) {
            task.checkpoints = task.checkpoints.filter(id => id !== checkpointId);
        }
        this.checkpoints.delete(checkpointId);
        await this.deleteSnapshotFromDisk(checkpointId);
        await this.saveIndex();
        return true;
    }
    // -----------------------------------------------------------------------
    // Task deletion
    // -----------------------------------------------------------------------
    /**
     * Delete a task and all its checkpoints (metadata + disk files).
     */
    async deleteTask(taskId) {
        await this.ensureIndexLoaded();
        const task = this.taskHistory.get(taskId);
        if (!task) {
            return false;
        }
        // Delete all checkpoint snapshot files for this task
        for (const checkpointId of task.checkpoints) {
            this.checkpoints.delete(checkpointId);
            await this.deleteSnapshotFromDisk(checkpointId);
        }
        this.taskHistory.delete(taskId);
        await this.saveIndex();
        this.eventEmitter.fire(Array.from(this.taskHistory.values()));
        return true;
    }
    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------
    /**
     * Get checkpoints for a specific task
     */
    getCheckpointsForTask(taskId) {
        const task = this.taskHistory.get(taskId);
        if (!task) {
            return [];
        }
        return task.checkpoints
            .map(id => this.checkpoints.get(id))
            .filter((cp) => cp !== undefined);
    }
    /**
     * Get all checkpoints, newest first
     */
    getAllCheckpoints(limit) {
        const sorted = Array.from(this.checkpoints.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return limit ? sorted.slice(0, limit) : sorted;
    }
    // -----------------------------------------------------------------------
    // Auto-cleanup
    // -----------------------------------------------------------------------
    /**
     * Remove tasks and checkpoints older than 7 days (including disk files).
     */
    async autoCleanup() {
        await this.ensureIndexLoaded();
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        let cleanedCount = 0;
        for (const [taskId, task] of this.taskHistory.entries()) {
            const age = now - task.startTime.getTime();
            if (age > maxAge) {
                // Delete checkpoint snapshot files from disk
                for (const checkpointId of task.checkpoints) {
                    this.checkpoints.delete(checkpointId);
                    await this.deleteSnapshotFromDisk(checkpointId);
                }
                this.taskHistory.delete(taskId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            await this.saveIndex();
            console.log(`CheckpointManager: auto-cleanup removed ${cleanedCount} old task(s)`);
        }
    }
    // -----------------------------------------------------------------------
    // Statistics / export
    // -----------------------------------------------------------------------
    /**
     * Get task statistics
     */
    getStatistics() {
        const tasks = Array.from(this.taskHistory.values());
        const checkpoints = Array.from(this.checkpoints.values());
        return {
            totalTasks: tasks.length,
            activeTasks: tasks.filter(t => t.status === 'active').length,
            completedTasks: tasks.filter(t => t.status === 'completed').length,
            failedTasks: tasks.filter(t => t.status === 'failed').length,
            totalCheckpoints: checkpoints.length,
            totalOperations: checkpoints.reduce((sum, cp) => sum + (cp.metadata?.operationCount ?? 0), 0),
            totalSizeBytes: checkpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0),
        };
    }
    /**
     * Export task history
     */
    exportTaskHistory(taskId) {
        if (taskId) {
            const task = this.taskHistory.get(taskId);
            if (!task) {
                throw new Error(`Task "${taskId}" not found`);
            }
            return JSON.stringify(task, null, 2);
        }
        return JSON.stringify(Array.from(this.taskHistory.values()), null, 2);
    }
}
exports.CheckpointManager = CheckpointManager;
/** Maximum number of checkpoints to retain. */
CheckpointManager.MAX_CHECKPOINTS = 10;
/** Maximum total disk space for all checkpoint snapshot files (50 MB). */
CheckpointManager.MAX_TOTAL_BYTES = 50 * 1024 * 1024;
//# sourceMappingURL=CheckpointManager.js.map