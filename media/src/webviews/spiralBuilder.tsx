import React, { useState, useEffect, useRef } from 'react';
// Mock service for webview
const apiService = {
  getAgents: async () => ({ success: true, data: [] }),
};

interface WorkflowConfig {
  name: string;
  description: string;
  nodes: SpiralNode[];
  connections: SpiralConnection[];
}

interface SpiralNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'agent';
  agentId?: string;
  configuration: Record<string, any>;
  position: { x: number; y: number };
}

interface SpiralConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: string;
}

const SpiralBuilder: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedNode, setDraggedNode] = useState<SpiralNode | null>(null);
  const [connectingNode, setConnectingNode] = useState<SpiralNode | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const apiService = new ApiService();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getWorkflows();

      if (response.success && response.data) {
        setWorkflows(response.data);
      } else {
        setError(response.message || 'Failed to fetch workflows');
      }
    } catch (err) {
      setError('Failed to connect to Helix API');
    } finally {
      setLoading(false);
    }
  };

  const createNewWorkflow = () => {
    const newWorkflow: WorkflowConfig = {
      name: 'New Workflow',
      description: 'A new Helix Spiral workflow',
      nodes: [],
      connections: [],
    };
    setSelectedWorkflow(newWorkflow);
    setIsEditing(true);
  };

  const addNode = (
    type: SpiralNode['type'],
    position: { x: number; y: number }
  ) => {
    if (!selectedWorkflow) return;

    const newNode: SpiralNode = {
      id: `node-${Date.now()}`,
      type,
      configuration: {},
      position,
      ...(type === 'agent' && { agentId: '' }),
    };

    setSelectedWorkflow(prev =>
      prev
        ? {
            ...prev,
            nodes: [...prev.nodes, newNode],
          }
        : null
    );
  };

  const updateNode = (nodeId: string, updates: Partial<SpiralNode>) => {
    if (!selectedWorkflow) return;

    setSelectedWorkflow(prev =>
      prev
        ? {
            ...prev,
            nodes: prev.nodes.map(node =>
              node.id === nodeId ? { ...node, ...updates } : node
            ),
          }
        : null
    );
  };

  const deleteNode = (nodeId: string) => {
    if (!selectedWorkflow) return;

    setSelectedWorkflow(prev =>
      prev
        ? {
            ...prev,
            nodes: prev.nodes.filter(node => node.id !== nodeId),
            connections: prev.connections.filter(
              conn =>
                conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
            ),
          }
        : null
    );
  };

  const addConnection = (sourceNodeId: string, targetNodeId: string) => {
    if (!selectedWorkflow) return;

    const newConnection: SpiralConnection = {
      id: `conn-${Date.now()}`,
      sourceNodeId,
      targetNodeId,
    };

    setSelectedWorkflow(prev =>
      prev
        ? {
            ...prev,
            connections: [...prev.connections, newConnection],
          }
        : null
    );
  };

  const deleteConnection = (connectionId: string) => {
    if (!selectedWorkflow) return;

    setSelectedWorkflow(prev =>
      prev
        ? {
            ...prev,
            connections: prev.connections.filter(
              conn => conn.id !== connectionId
            ),
          }
        : null
    );
  };

  const saveWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      const response = await apiService.createWorkflow(selectedWorkflow);
      if (response.success) {
        fetchWorkflows();
        showNotification(`Workflow saved: ${selectedWorkflow.name}`);
      } else {
        throw new Error(response.message || 'Failed to save workflow');
      }
    } catch (err) {
      setError(`Failed to save workflow: ${err}`);
    }
  };

  const executeWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      const response = await apiService.executeWorkflow(
        selectedWorkflow.name,
        {}
      );
      if (response.success) {
        showNotification(`Workflow executed: ${selectedWorkflow.name}`);
      } else {
        throw new Error(response.message || 'Failed to execute workflow');
      }
    } catch (err) {
      setError(`Failed to execute workflow: ${err}`);
    }
  };

  const getNodeIcon = (type: SpiralNode['type']): string => {
    switch (type) {
      case 'trigger':
        return '⚡';
      case 'action':
        return '⚙️';
      case 'condition':
        return '❓';
      case 'agent':
        return '🤖';
      default:
        return '📦';
    }
  };

  const getNodeColor = (type: SpiralNode['type']): string => {
    switch (type) {
      case 'trigger':
        return '#58a6ff';
      case 'action':
        return '#3fb950';
      case 'condition':
        return '#d29922';
      case 'agent':
        return '#f85149';
      default:
        return '#8b949e';
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !isEditing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing node
    const clickedNode = selectedWorkflow?.nodes.find(
      node =>
        Math.abs(node.position.x - x) < 50 && Math.abs(node.position.y - y) < 25
    );

    if (!clickedNode && !connectingNode) {
      // Add new node on empty space
      addNode('action', { x, y });
    }
  };

  const handleNodeDrag = (node: SpiralNode, e: React.MouseEvent) => {
    if (!isEditing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateNode(node.id, { position: { x, y } });
  };

  const handleNodeConnect = (node: SpiralNode) => {
    if (!isEditing) return;

    if (!connectingNode) {
      setConnectingNode(node);
    } else if (connectingNode.id !== node.id) {
      addConnection(connectingNode.id, node.id);
      setConnectingNode(null);
    }
  };

  const showNotification = (message: string) => {
    if (window.acquireVsCodeApi) {
      const vscode = window.acquireVsCodeApi();
      vscode.postMessage({
        command: 'showNotification',
        text: message,
      });
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <h1>🌀 Spiral Builder</h1>
          <div className="status-bar">
            <span className="status-item">Status: Loading workflows...</span>
          </div>
        </div>
        <div className="loading">Loading workflow definitions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <h1>🌀 Spiral Builder</h1>
        </div>
        <div className="error">
          <strong>Error:</strong> {error}
          <br />
          <button
            className="btn"
            onClick={fetchWorkflows}
            style={{ marginTop: '10px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🌀 Spiral Builder</h1>
        <div className="status-bar">
          <span className="status-item">Workflows: {workflows.length}</span>
          <span className="status-item">
            Mode: {isEditing ? 'Edit' : 'View'}
          </span>
        </div>
      </div>

      <div
        style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}
      >
        {/* Workflow List Sidebar */}
        <div
          style={{
            width: '300px',
            borderRight: '1px solid #30363d',
            paddingRight: '20px',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Workflows</h3>
            <button
              className="btn"
              onClick={createNewWorkflow}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              + New Workflow
            </button>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {workflows.map(workflow => (
                <div
                  key={workflow.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    border:
                      selectedWorkflow?.name === workflow.name
                        ? '2px solid #58a6ff'
                        : '1px solid #30363d',
                  }}
                  onClick={() => {
                    setSelectedWorkflow(workflow);
                    setIsEditing(false);
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '5px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{workflow.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                      {workflow.nodes.length} nodes
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#8b949e' }}>
                    {workflow.description}
                  </div>
                  <div
                    style={{ display: 'flex', gap: '5px', marginTop: '10px' }}
                  >
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '2px 6px' }}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedWorkflow(workflow);
                        setIsEditing(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn"
                      style={{ fontSize: '0.8rem', padding: '2px 6px' }}
                      onClick={e => {
                        e.stopPropagation();
                        executeWorkflow();
                      }}
                    >
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {selectedWorkflow ? (
            <>
              {/* Canvas Header */}
              <div
                style={{
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>
                    {selectedWorkflow.name}
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: '#8b949e' }}>
                    {selectedWorkflow.description}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'View Mode' : 'Edit Mode'}
                  </button>
                  {isEditing && (
                    <>
                      <button className="btn" onClick={saveWorkflow}>
                        Save
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={executeWorkflow}
                      >
                        Execute
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Canvas */}
              <div
                ref={canvasRef}
                className="card"
                style={{
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#161b22',
                  cursor: isEditing ? 'crosshair' : 'default',
                }}
                onClick={handleCanvasClick}
              >
                {/* Connections */}
                {selectedWorkflow.connections.map(connection => {
                  const sourceNode = selectedWorkflow.nodes.find(
                    n => n.id === connection.sourceNodeId
                  );
                  const targetNode = selectedWorkflow.nodes.find(
                    n => n.id === connection.targetNodeId
                  );

                  if (!sourceNode || !targetNode) return null;

                  const startX = sourceNode.position.x + 50;
                  const startY = sourceNode.position.y + 25;
                  const endX = targetNode.position.x;
                  const endY = targetNode.position.y + 25;

                  return (
                    <svg
                      key={connection.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                      }}
                    >
                      <path
                        d={`M ${startX} ${startY} C ${
                          (startX + endX) / 2
                        } ${startY}, ${
                          (startX + endX) / 2
                        } ${endY}, ${endX} ${endY}`}
                        stroke="#58a6ff"
                        strokeWidth="2"
                        fill="none"
                        style={{ cursor: isEditing ? 'pointer' : 'default' }}
                        onClick={e => {
                          e.stopPropagation();
                          if (isEditing) deleteConnection(connection.id);
                        }}
                      />
                      <circle cx={endX} cy={endY} r="4" fill="#58a6ff" />
                    </svg>
                  );
                })}

                {/* Nodes */}
                {selectedWorkflow.nodes.map(node => (
                  <div
                    key={node.id}
                    className="card"
                    style={{
                      position: 'absolute',
                      left: node.position.x,
                      top: node.position.y,
                      width: '100px',
                      padding: '10px',
                      backgroundColor: '#21262d',
                      border:
                        connectingNode?.id === node.id
                          ? '2px solid #f85149'
                          : '1px solid #30363d',
                      cursor: isEditing ? 'move' : 'pointer',
                    }}
                    draggable={isEditing}
                    onClick={e => {
                      e.stopPropagation();
                      if (isEditing) handleNodeConnect(node);
                    }}
                    onMouseMove={e => {
                      if (isEditing && draggedNode?.id === node.id) {
                        handleNodeDrag(node, e);
                      }
                    }}
                    onMouseDown={() => isEditing && setDraggedNode(node)}
                    onMouseUp={() => setDraggedNode(null)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '5px',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>
                        {getNodeIcon(node.type)}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#8b949e',
                          textTransform: 'uppercase',
                        }}
                      >
                        {node.type}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#8b949e',
                        marginBottom: '5px',
                      }}
                    >
                      {node.id.split('-')[1]}
                    </div>
                    {node.type === 'agent' && (
                      <input
                        type="text"
                        className="input"
                        placeholder="Agent ID"
                        value={node.agentId || ''}
                        onChange={e =>
                          updateNode(node.id, { agentId: e.target.value })
                        }
                        style={{
                          width: '100%',
                          fontSize: '0.8rem',
                          padding: '2px 4px',
                        }}
                        disabled={!isEditing}
                      />
                    )}
                    {isEditing && (
                      <button
                        className="btn btn-danger"
                        style={{
                          width: '100%',
                          fontSize: '0.8rem',
                          padding: '2px 4px',
                          marginTop: '5px',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}

                {connectingNode && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      right: '20px',
                      backgroundColor: '#f85149',
                      color: 'white',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                    }}
                  >
                    Click on a node to connect to {connectingNode.type}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              className="card"
              style={{
                height: '100%',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🌀</div>
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                }}
              >
                Select a Workflow
              </div>
              <div style={{ color: '#8b949e', marginBottom: '20px' }}>
                Choose a workflow from the sidebar to view or edit it.
              </div>
              <button className="btn" onClick={createNewWorkflow}>
                Create New Workflow
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpiralBuilder;
