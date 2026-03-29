import { ApiService } from './apiService';
import { WebSocketService } from './websocketService';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'busy';
  capabilities: string[];
  coordination: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'decision' | 'loop';
  parameters: Record<string, any>;
}

export class AgentService {
  private apiService: ApiService;
  private websocketService: WebSocketService;
  private agents: Map<string, Agent> = new Map();
  private workflows: Map<string, Workflow> = new Map();

  constructor() {
    this.apiService = new ApiService();
    this.websocketService = new WebSocketService();
  }

  async initialize(): Promise<void> {
    try {
      // Load agents from API
      const agentsData = await this.apiService.get('/api/agents');
      agentsData.forEach((agent: Agent) => {
        this.agents.set(agent.id, agent);
      });

      // Load workflows
      const workflowsData = await this.apiService.get('/api/workflows');
      workflowsData.forEach((workflow: Workflow) => {
        this.workflows.set(workflow.id, workflow);
      });

      // Subscribe to agent updates
      this.websocketService.subscribe('agent:status', data => {
        this.updateAgentStatus(data.agentId, data.status);
      });

      console.log('AgentService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AgentService:', error);
      throw error;
    }
  }

  dispose(): void {
    this.websocketService.unsubscribe('agent:status');
  }

  async connectToAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      await this.apiService.post(`/api/agents/${agentId}/connect`, {});
      this.updateAgentStatus(agentId, 'active');
    } catch (error) {
      console.error(`Failed to connect to agent ${agentId}:`, error);
      throw error;
    }
  }

  async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    try {
      await this.apiService.post(`/api/workflows/${workflowId}/execute`, {});
      console.log(`Workflow ${workflowId} executed successfully`);
    } catch (error) {
      console.error(`Failed to execute workflow ${workflowId}:`, error);
      throw error;
    }
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  private updateAgentStatus(agentId: string, status: Agent['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      // Emit event for UI updates
      this.emitAgentUpdate(agent);
    }
  }

  private emitAgentUpdate(agent: Agent): void {
    // This would typically emit events to update UI components
    console.log(`Agent ${agent.id} status updated to ${agent.status}`);
  }
}
