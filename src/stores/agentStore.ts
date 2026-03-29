export class AgentStore {
  private agents: Map<string, any> = new Map();
  private connections: Map<string, any> = new Map();
  private taskQueues: Map<string, any> = new Map();
  private lastUpdated: Date = new Date();

  async initialize(): Promise<void> {
    this.loadAgentState();
  }

  getAgents(): any[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: string): any | undefined {
    return this.agents.get(id);
  }

  updateAgentStatus(id: string, status: any): void {
    const agent = this.agents.get(id);
    if (agent) {
      this.agents.set(id, { ...agent, ...status, lastActivity: new Date() });
    } else {
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

  updateAgentConnection(id: string, connection: any): void {
    this.connections.set(id, { ...connection, lastActivity: new Date() });
    this.lastUpdated = new Date();
    this.saveAgentState();
  }

  removeAgentConnection(id: string): void {
    this.connections.delete(id);
    this.lastUpdated = new Date();
    this.saveAgentState();
  }

  getActiveConnections(): any[] {
    return Array.from(this.connections.values()).filter(
      (conn: any) => conn.status === 'connected'
    );
  }

  getConnectedAgentIds(): string[] {
    return this.getActiveConnections().map((conn: any) => conn.agentId);
  }

  updateTaskQueue(agentId: string, queue: any): void {
    this.taskQueues.set(agentId, { ...queue, lastActivity: new Date() });
    this.lastUpdated = new Date();
    this.saveAgentState();
  }

  addTaskToQueue(agentId: string, task: any): string {
    const taskId = this.generateTaskId();
    const taskWithId = { taskId, ...task, createdAt: new Date() };
    const queue = this.taskQueues.get(agentId);

    if (queue) {
      queue.tasks.push(taskWithId);
      queue.queueSize = queue.tasks.length;
    } else {
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

  updateTaskStatus(agentId: string, taskId: string, status: any): void {
    const queue = this.taskQueues.get(agentId);
    if (queue) {
      const task = queue.tasks.find((t: any) => t.taskId === taskId);
      if (task) {
        Object.assign(task, status);
        if (status.status === 'running' && !task.startedAt) {
          task.startedAt = new Date();
        } else if (
          status.status === 'completed' ||
          status.status === 'failed'
        ) {
          task.completedAt = new Date();
        }
        this.lastUpdated = new Date();
        this.saveAgentState();
      }
    }
  }

  cleanupCompletedTasks(agentId: string): void {
    const queue = this.taskQueues.get(agentId);
    if (queue) {
      queue.tasks = queue.tasks.filter(
        (task: any) => task.status !== 'completed' && task.status !== 'failed'
      );
      queue.queueSize = queue.tasks.length;
      this.lastUpdated = new Date();
      this.saveAgentState();
    }
  }

  getTaskQueue(agentId: string): any | undefined {
    return this.taskQueues.get(agentId);
  }

  getAllTaskQueues(): Map<string, any> {
    return new Map(this.taskQueues);
  }

  getOnlineAgents(): any[] {
    return this.getAgents().filter((agent: any) => agent.online);
  }

  getOfflineAgents(): any[] {
    return this.getAgents().filter((agent: any) => !agent.online);
  }

  getAgentsByRole(role: string): any[] {
    return this.getAgents().filter((agent: any) => agent.role === role);
  }

  getAgentsByCoordination(minLevel: number): any[] {
    return this.getAgents().filter(
      (agent: any) => agent.coordination >= minLevel
    );
  }

  getAgentStatistics(): any {
    const agents = this.getAgents();
    const connections = this.getActiveConnections();
    const queues = this.getAllTaskQueues();

    let totalTasks = 0;
    let activeTasks = 0;

    for (const [_, queue] of queues) {
      totalTasks += queue.tasks.length;
      activeTasks += queue.tasks.filter(
        (task: any) => task.status === 'running' || task.status === 'pending'
      ).length;
    }

    return {
      total: agents.length,
      online: agents.filter((a: any) => a.online).length,
      offline: agents.filter((a: any) => !a.online).length,
      connected: connections.length,
      totalTasks,
      activeTasks,
    };
  }

  clear(): void {
    this.agents.clear();
    this.connections.clear();
    this.taskQueues.clear();
    this.lastUpdated = new Date();
    this.saveAgentState();
  }

  getActiveAgents(): any[] {
    return Array.from(this.agents.values()).filter(agent => agent.online);
  }

  private generateTaskId(): string {
    return `task-${crypto.randomUUID()}`;
  }

  private loadAgentState(): void {
    // Load from persistent storage if needed
  }

  private saveAgentState(): void {
    // Save to persistent storage if needed
  }
}
