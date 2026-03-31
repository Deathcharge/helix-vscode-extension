"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentStore = void 0;
class AgentStore {
    constructor() {
        this.agents = new Map();
        this.connections = new Map();
        this.taskQueues = new Map();
        this.lastUpdated = new Date();
    }
    async initialize() {
        this.loadAgentState();
    }
    getAgents() {
        return Array.from(this.agents.values());
    }
    getAgent(id) {
        return this.agents.get(id);
    }
    updateAgentStatus(id, status) {
        const agent = this.agents.get(id);
        if (agent) {
            this.agents.set(id, { ...agent, ...status, lastActivity: new Date() });
        }
        else {
            this.agents.set(id, {
                id,
                name: status.name || id,
                role: status.role || 'unknown',
                emoji: status.emoji || '🤖',
                color: status.color || '#007acc',
                coordination: status.coordination || 5,
                online: status.online || false,
                lastActivity: new Date(),
                currentTask: status.currentTask,
            });
        }
        this.lastUpdated = new Date();
        this.saveAgentState();
    }
    updateAgentConnection(id, connection) {
        this.connections.set(id, { ...connection, lastActivity: new Date() });
        this.lastUpdated = new Date();
        this.saveAgentState();
    }
    removeAgentConnection(id) {
        this.connections.delete(id);
        this.lastUpdated = new Date();
        this.saveAgentState();
    }
    getActiveConnections() {
        return Array.from(this.connections.values()).filter((conn) => conn.status === 'connected');
    }
    getConnectedAgentIds() {
        return this.getActiveConnections().map((conn) => conn.agentId);
    }
    updateTaskQueue(agentId, queue) {
        this.taskQueues.set(agentId, { ...queue, lastActivity: new Date() });
        this.lastUpdated = new Date();
        this.saveAgentState();
    }
    addTaskToQueue(agentId, task) {
        const taskId = this.generateTaskId();
        const taskWithId = { taskId, ...task, createdAt: new Date() };
        const queue = this.taskQueues.get(agentId);
        if (queue) {
            queue.tasks.push(taskWithId);
            queue.queueSize = queue.tasks.length;
        }
        else {
            this.taskQueues.set(agentId, {
                agentId,
                tasks: [taskWithId],
                isProcessing: false,
                queueSize: 1,
            });
        }
        this.lastUpdated = new Date();
        this.saveAgentState();
        return taskId;
    }
    updateTaskStatus(agentId, taskId, status) {
        const queue = this.taskQueues.get(agentId);
        if (queue) {
            const task = queue.tasks.find((t) => t.taskId === taskId);
            if (task) {
                Object.assign(task, status);
                if (status.status === 'running' && !task.startedAt) {
                    task.startedAt = new Date();
                }
                else if (status.status === 'completed' ||
                    status.status === 'failed') {
                    task.completedAt = new Date();
                }
                this.lastUpdated = new Date();
                this.saveAgentState();
            }
        }
    }
    cleanupCompletedTasks(agentId) {
        const queue = this.taskQueues.get(agentId);
        if (queue) {
            queue.tasks = queue.tasks.filter((task) => task.status !== 'completed' && task.status !== 'failed');
            queue.queueSize = queue.tasks.length;
            this.lastUpdated = new Date();
            this.saveAgentState();
        }
    }
    getTaskQueue(agentId) {
        return this.taskQueues.get(agentId);
    }
    getAllTaskQueues() {
        return new Map(this.taskQueues);
    }
    getOnlineAgents() {
        return this.getAgents().filter((agent) => agent.online);
    }
    getOfflineAgents() {
        return this.getAgents().filter((agent) => !agent.online);
    }
    getAgentsByRole(role) {
        return this.getAgents().filter((agent) => agent.role === role);
    }
    getAgentsByCoordination(minLevel) {
        return this.getAgents().filter((agent) => agent.coordination >= minLevel);
    }
    getAgentStatistics() {
        const agents = this.getAgents();
        const connections = this.getActiveConnections();
        const queues = this.getAllTaskQueues();
        let totalTasks = 0;
        let activeTasks = 0;
        for (const [_, queue] of queues) {
            totalTasks += queue.tasks.length;
            activeTasks += queue.tasks.filter((task) => task.status === 'running' || task.status === 'pending').length;
        }
        return {
            total: agents.length,
            online: agents.filter((a) => a.online).length,
            offline: agents.filter((a) => !a.online).length,
            connected: connections.length,
            totalTasks,
            activeTasks,
        };
    }
    clear() {
        this.agents.clear();
        this.connections.clear();
        this.taskQueues.clear();
        this.lastUpdated = new Date();
        this.saveAgentState();
    }
    getActiveAgents() {
        return Array.from(this.agents.values()).filter(agent => agent.online);
    }
    generateTaskId() {
        return `task-${crypto.randomUUID()}`;
    }
    loadAgentState() {
        // Load from persistent storage if needed
    }
    saveAgentState() {
        // Save to persistent storage if needed
    }
}
exports.AgentStore = AgentStore;
//# sourceMappingURL=agentStore.js.map