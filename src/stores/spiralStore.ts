import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  WorkflowExecution,
  WorkflowTemplate,
} from '../types/spiral';

export interface SpiralState {
  workflows: Map<string, Workflow>;
  executions: Map<string, WorkflowExecution>;
  templates: Map<string, WorkflowTemplate>;
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export class SpiralStore {
  private state: SpiralState;
  private context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.state = {
      workflows: new Map(),
      executions: new Map(),
      templates: new Map(),
      lastUpdated: new Date(0),
      isLoading: false,
      error: null,
    };
    this.loadState();
  }

  /**
   * Gets all workflows
   */
  getWorkflows(): Workflow[] {
    return Array.from(this.state.workflows.values());
  }

  /**
   * Gets workflow by ID
   */
  getWorkflow(id: string): Workflow | undefined {
    return this.state.workflows.get(id);
  }

  /**
   * Gets workflows by category
   */
  getWorkflowsByCategory(category: string): Workflow[] {
    return this.getWorkflows().filter(w => w.category === category);
  }

  /**
   * Gets workflows by status
   */
  getWorkflowsByStatus(status: string): Workflow[] {
    return this.getWorkflows().filter(w => w.status === status);
  }

  /**
   * Gets executions
   */
  getExecutions(): WorkflowExecution[] {
    return Array.from(this.state.executions.values());
  }

  /**
   * Gets execution by ID
   */
  getExecution(id: string): WorkflowExecution | undefined {
    return this.state.executions.get(id);
  }

  /**
   * Gets running executions
   */
  getRunningExecutions(): WorkflowExecution[] {
    return this.getExecutions().filter(e => e.status === 'running');
  }

  /**
   * Gets completed executions
   */
  getCompletedExecutions(): WorkflowExecution[] {
    return this.getExecutions().filter(
      e => e.status === 'completed' || e.status === 'failed'
    );
  }

  /**
   * Gets templates
   */
  getTemplates(): WorkflowTemplate[] {
    return Array.from(this.state.templates.values());
  }

  /**
   * Gets template by ID
   */
  getTemplate(id: string): WorkflowTemplate | undefined {
    return this.state.templates.get(id);
  }

  /**
   * Gets templates by category
   */
  getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return this.getTemplates().filter(t => t.category === category);
  }

  /**
   * Creates a new workflow
   */
  async createWorkflow(
    workflow: Omit<
      Workflow,
      'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastRun'
    >
  ): Promise<Workflow> {
    const newWorkflow: Workflow = {
      ...workflow,
      id: this.generateWorkflowId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
    };

    this.state.workflows.set(newWorkflow.id, newWorkflow);
    this.state.lastUpdated = new Date();
    this.saveState();

    return newWorkflow;
  }

  /**
   * Updates a workflow
   */
  async updateWorkflow(
    id: string,
    updates: Partial<Workflow>
  ): Promise<Workflow> {
    const workflow = this.getWorkflow(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date(),
    };

    this.state.workflows.set(id, updatedWorkflow);
    this.state.lastUpdated = new Date();
    this.saveState();

    return updatedWorkflow;
  }

  /**
   * Deletes a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    const workflow = this.getWorkflow(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (this.getRunningExecutions().some(e => e.workflowId === id)) {
      throw new Error('Cannot delete running workflow');
    }

    this.state.workflows.delete(id);
    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Executes a workflow
   */
  async executeWorkflow(id: string, input: any): Promise<WorkflowExecution> {
    const workflow = this.getWorkflow(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'active') {
      throw new Error('Workflow is not active');
    }

    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId: id,
      status: 'running',
      startTime: new Date(),
      input,
      nodesExecuted: [],
      output: undefined,
      executionTime: 0,
      progress: [],
      metadata: {
        totalNodes: workflow.nodes.length,
        completedNodes: 0,
        failedNodes: 0,
        parallelExecutions: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    };

    this.state.executions.set(execution.id, execution);
    this.state.lastUpdated = new Date();
    this.saveState();

    try {
      // Simulate workflow execution
      const result = await this.simulateWorkflowExecution(
        workflow,
        input,
        execution
      );

      execution.status = result.status;
      execution.endTime = new Date();
      execution.output = result.output;
      if (result.error) {
        execution.error = result.error;
      }
      execution.executionTime = result.executionTime;
      execution.nodesExecuted = result.nodesExecuted;

      workflow.executionCount++;
      workflow.lastRun = new Date();
      workflow.updatedAt = new Date();

      this.state.lastUpdated = new Date();
      this.saveState();

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error =
        error instanceof Error ? error.message : 'Unknown error';
      execution.executionTime = 0;

      this.state.lastUpdated = new Date();
      this.saveState();

      throw error;
    }
  }

  /**
   * Cancels an execution
   */
  async cancelExecution(id: string): Promise<void> {
    const execution = this.getExecution(id);
    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== 'running') {
      throw new Error('Cannot cancel non-running execution');
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.executionTime =
      execution.endTime.getTime() - execution.startTime.getTime();

    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Validates a workflow
   */
  async validateWorkflow(id: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const workflow = this.getWorkflow(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if workflow has nodes
    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check if workflow has connections
    if (workflow.connections.length === 0) {
      warnings.push('Workflow has no connections');
    }

    // Validate nodes
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    for (const connection of workflow.connections) {
      if (!nodeIds.has(connection.sourceNodeId)) {
        errors.push(
          `Connection references non-existent source node: ${connection.sourceNodeId}`
        );
      }
      if (!nodeIds.has(connection.targetNodeId)) {
        errors.push(
          `Connection references non-existent target node: ${connection.targetNodeId}`
        );
      }
    }

    // Check for cycles
    if (this.hasCycles(workflow.nodes, workflow.connections)) {
      warnings.push('Workflow contains cycles which may cause infinite loops');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Gets workflow statistics
   */
  getWorkflowStatistics(): {
    total: number;
    active: number;
    inactive: number;
    error: number;
    totalExecutions: number;
    successRate: number;
  } {
    const workflows = this.getWorkflows();
    const total = workflows.length;
    const active = workflows.filter(w => w.status === 'active').length;
    const inactive = workflows.filter(w => w.status === 'inactive').length;
    const error = workflows.filter(w => w.status === 'error').length;

    const totalExecutions = workflows.reduce(
      (sum, w) => sum + w.executionCount,
      0
    );
    const completedExecutions = this.getCompletedExecutions();
    const successfulExecutions = completedExecutions.filter(
      e => e.status === 'completed'
    ).length;
    const successRate =
      totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      total,
      active,
      inactive,
      error,
      totalExecutions,
      successRate,
    };
  }

  /**
   * Adds a template
   */
  addTemplate(template: WorkflowTemplate): void {
    this.state.templates.set(template.id, template);
    this.state.lastUpdated = new Date();
    this.saveState();
  }

  /**
   * Creates workflow from template
   */
  async createFromTemplate(
    templateId: string,
    name: string,
    description?: string
  ): Promise<Workflow> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const workflow: Omit<
      Workflow,
      'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastRun'
    > = {
      name,
      description: description || template.description,
      nodes: template.nodes.map(n => ({ ...n })),
      connections: template.connections.map(c => ({ ...c })),
      status: 'inactive',
      category: template.category,
      tags: template.tags,
      version: '1.0.0',
    };

    return this.createWorkflow(workflow);
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.state = {
      workflows: new Map(),
      executions: new Map(),
      templates: new Map(),
      lastUpdated: new Date(0),
      isLoading: false,
      error: null,
    };
    this.saveState();
  }

  /**
   * Exports store data
   */
  exportData(): string {
    return JSON.stringify(
      {
        state: this.state,
        exportTime: new Date(),
      },
      null,
      2
    );
  }

  /**
   * Imports store data
   */
  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.state) {
        this.state = {
          ...this.state,
          ...parsed.state,
          workflows: new Map(parsed.state.workflows || []),
          executions: new Map(parsed.state.executions || []),
          templates: new Map(parsed.state.templates || []),
        };
      }
    } catch (error) {
      console.error('Failed to import spiral data:', error);
    }
  }

  async initialize(): Promise<void> {
    // Initialize spiral store
    this.loadState();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  private generateWorkflowId(): string {
    return `workflow-${randomUUID()}`;
  }

  private generateExecutionId(): string {
    return `execution-${randomUUID()}`;
  }

  private async simulateWorkflowExecution(
    workflow: Workflow,
    input: any,
    _execution: WorkflowExecution
  ): Promise<{
    status: 'completed' | 'failed';
    output: any;
    error?: string;
    executionTime: number;
    nodesExecuted: string[];
  }> {
    const config = vscode.workspace.getConfiguration('helix');
    const apiEndpoint = config.get<string>(
      'apiEndpoint',
      'https://api.helixcollective.io'
    );
    const authToken: string =
      this.context.globalState.get('helix.authTokenValue') || '';

    // Build a workflow definition the backend understands
    const workflowDef = {
      name: workflow.name,
      description: workflow.description || '',
      nodes: workflow.nodes.map(n => ({
        id: n.id,
        type: n.type,
        name: n.name,
        config: n.configuration ?? {},
        position: n.position || { x: 0, y: 0 },
      })),
      connections: workflow.connections.map(c => ({
        source: c.sourceNodeId,
        target: c.targetNodeId,
      })),
    };

    const start = Date.now();

    try {
      const res = await fetch(`${apiEndpoint}/api/spirals/engine/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ workflow: workflowDef, input }),
        signal: AbortSignal.timeout(60_000),
      });

      const data = await res.json();
      const executionTime = Date.now() - start;

      if (!res.ok || data.success === false) {
        return {
          status: 'failed',
          output: data,
          error: data.error || `HTTP ${res.status}`,
          executionTime,
          nodesExecuted: [],
        };
      }

      return {
        status: 'completed',
        output: data,
        executionTime: data.execution_time_ms ?? executionTime,
        nodesExecuted: (data.results || [])
          .map((r: { node_id?: string }) => r.node_id || '')
          .filter(Boolean),
      };
    } catch (err) {
      console.warn(
        'SpiralStore: backend execution failed, returning error state:',
        err
      );
      const executionTime = Date.now() - start;
      return {
        status: 'failed',
        output: {
          _simulated: true,
          result: null,
          error: err instanceof Error ? err.message : 'Backend unreachable',
        },
        error: err instanceof Error ? err.message : 'Backend unreachable',
        executionTime,
        nodesExecuted: [],
      };
    }
  }

  private hasCycles(
    nodes: WorkflowNode[],
    connections: WorkflowConnection[]
  ): boolean {
    const nodeIds = new Set(nodes.map(n => n.id));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const connectionsFromNode = connections.filter(
        c => c.sourceNodeId === nodeId
      );
      for (const connection of connectionsFromNode) {
        if (hasCycle(connection.targetNodeId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of nodeIds) {
      if (hasCycle(nodeId)) {
        return true;
      }
    }

    return false;
  }

  private loadState(): void {
    try {
      const data = this.context.globalState.get<string>('spiral.state');
      if (data) {
        const parsed = JSON.parse(data);
        this.state = {
          ...this.state,
          ...parsed,
          workflows: new Map(parsed.workflows || []),
          executions: new Map(parsed.executions || []),
          templates: new Map(parsed.templates || []),
        };
      }
    } catch (error) {
      console.error('Failed to load spiral state:', error);
    }
  }

  private saveState(): void {
    try {
      const data = JSON.stringify({
        ...this.state,
        workflows: Array.from(this.state.workflows.entries()),
        executions: Array.from(this.state.executions.entries()),
        templates: Array.from(this.state.templates.entries()),
      });
      this.context.globalState.update('spiral.state', data);
    } catch (error) {
      console.error('Failed to save spiral state:', error);
    }
  }
}
