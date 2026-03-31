"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const apiService_1 = require("./apiService");
const websocketService_1 = require("./websocketService");
class AgentService {
    constructor() {
        this.agents = new Map();
        this.workflows = new Map();
        this.apiService = new apiService_1.ApiService();
        this.websocketService = new websocketService_1.WebSocketService();
    }
    async initialize() {
        try {
            // Load agents from API
            const agentsData = await this.apiService.get('/api/agents');
            agentsData.forEach((agent) => {
                this.agents.set(agent.id, agent);
            });
            // Load workflows
            const workflowsData = await this.apiService.get('/api/workflows');
            workflowsData.forEach((workflow) => {
                this.workflows.set(workflow.id, workflow);
            });
            // Subscribe to agent updates
            this.websocketService.subscribe('agent:status', data => {
                this.updateAgentStatus(data.agentId, data.status);
            });
            console.log('AgentService initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize AgentService:', error);
            throw error;
        }
    }
    dispose() {
        this.websocketService.unsubscribe('agent:status');
    }
    async connectToAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }
        try {
            await this.apiService.post(`/api/agents/${agentId}/connect`, {});
            this.updateAgentStatus(agentId, 'active');
        }
        catch (error) {
            console.error(`Failed to connect to agent ${agentId}:`, error);
            throw error;
        }
    }
    async executeWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        try {
            await this.apiService.post(`/api/workflows/${workflowId}/execute`, {});
            console.log(`Workflow ${workflowId} executed successfully`);
        }
        catch (error) {
            console.error(`Failed to execute workflow ${workflowId}:`, error);
            throw error;
        }
    }
    getAgents() {
        return Array.from(this.agents.values());
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getWorkflows() {
        return Array.from(this.workflows.values());
    }
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }
    updateAgentStatus(agentId, status) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.status = status;
            // Emit event for UI updates
            this.emitAgentUpdate(agent);
        }
    }
    emitAgentUpdate(agent) {
        // This would typically emit events to update UI components
        console.log(`Agent ${agent.id} status updated to ${agent.status}`);
    }
}
exports.AgentService = AgentService;
//# sourceMappingURL=agentService.js.map