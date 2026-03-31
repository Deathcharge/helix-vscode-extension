import * as React from 'react';
import {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  WorkflowNodeType,
} from '../types/spiral';

// JSX namespace declaration for proper JSX type support
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface NodePosition {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  offset: { x: number; y: number };
}

interface ConnectionState {
  isDrawing: boolean;
  sourceNodeId: string | null;
  targetNodeId: string | null;
}

const SpiralBuilder: React.FC = () => {
  const [workflow, setWorkflow] = React.useState<Workflow>({
    id: 'new-workflow',
    name: 'New Workflow',
    description: 'A new workflow',
    nodes: [],
    connections: [],
    status: 'inactive',
    executionCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: 'general',
    tags: [],
    version: '1.0.0',
  });

  const [dragState, setDragState] = React.useState<DragState>({
    isDragging: false,
    nodeId: null,
    offset: { x: 0, y: 0 },
  });

  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    {
      isDrawing: false,
      sourceNodeId: null,
      targetNodeId: null,
    }
  );

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null
  );
  const [isEditingNode, setIsEditingNode] = React.useState(false);
  const [editingNode, setEditingNode] = React.useState<WorkflowNode | null>(
    null
  );

  const svgRef = React.useRef<SVGSVGElement>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const addNode = (type: WorkflowNodeType, position: NodePosition) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      name: `${type} Node`,
      description: `${type} node description`,
      position,
      configuration: {
        parameters: {},
        settings: {},
      },
      metadata: {
        dependencies: [],
        capabilities: [],
        estimatedExecutionTime: 1000,
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
          retryConditions: ['timeout', 'network_error'],
        },
        timeout: 30000,
      },
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updatedAt: new Date(),
    }));
  };

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
      updatedAt: new Date(),
    }));
  };

  const deleteNode = (nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(
        conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      ),
      updatedAt: new Date(),
    }));
    setSelectedNodeId(null);
  };

  const addConnection = (sourceNodeId: string, targetNodeId: string) => {
    // Check for cycles
    if (wouldCreateCycle(sourceNodeId, targetNodeId)) {
      alert('Adding this connection would create a cycle!');
      return;
    }

    const newConnection: WorkflowConnection = {
      id: `conn-${Date.now()}`,
      sourceNodeId,
      targetNodeId,
      type: 'success',
      metadata: {
        weight: 1,
        description: 'Connection',
        enabled: true,
      },
    };

    setWorkflow(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection],
      updatedAt: new Date(),
    }));
  };

  const deleteConnection = (connectionId: string) => {
    setWorkflow(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId),
      updatedAt: new Date(),
    }));
  };

  const wouldCreateCycle = (
    sourceNodeId: string,
    targetNodeId: string
  ): boolean => {
    // Simple cycle detection
    const visited = new Set<string>();
    const stack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (stack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      stack.add(nodeId);

      const connectionsFromNode = workflow.connections.filter(
        c => c.sourceNodeId === nodeId
      );
      for (const conn of connectionsFromNode) {
        if (hasCycle(conn.targetNodeId)) {
          return true;
        }
      }

      stack.delete(nodeId);
      return false;
    };

    // Temporarily add the new connection for cycle detection
    const tempConnections = [
      ...workflow.connections,
      {
        id: 'temp',
        sourceNodeId,
        targetNodeId,
        type: 'success' as const,
        metadata: { weight: 1, description: '', enabled: true },
      },
    ];

    // Check if adding this connection would create a cycle
    const originalConnections = workflow.connections;
    (workflow as any).connections = tempConnections;
    const result = hasCycle(sourceNodeId);
    (workflow as any).connections = originalConnections;

    return result;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (connectionState.isDrawing) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find if clicked on a node
      const clickedNode = workflow.nodes.find(node => {
        return (
          x >= node.position.x - 50 &&
          x <= node.position.x + 50 &&
          y >= node.position.y - 25 &&
          y <= node.position.y + 25
        );
      });

      if (clickedNode && clickedNode.id !== connectionState.sourceNodeId) {
        addConnection(connectionState.sourceNodeId!, clickedNode.id);
      }

      setConnectionState({
        isDrawing: false,
        sourceNodeId: null,
        targetNodeId: null,
      });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({
      isDragging: true,
      nodeId,
      offset: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragState.isDragging && dragState.nodeId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - dragState.offset.x;
      const y = e.clientY - rect.top - dragState.offset.y;

      updateNode(dragState.nodeId, {
        position: { x, y },
      });
    }
  };

  const handleMouseUp = () => {
    setDragState({
      isDragging: false,
      nodeId: null,
      offset: { x: 0, y: 0 },
    });
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNode(node);
      setIsEditingNode(true);
    }
  };

  const handleStartConnection = (nodeId: string) => {
    setConnectionState({
      isDrawing: true,
      sourceNodeId: nodeId,
      targetNodeId: null,
    });
  };

  const handleSaveNode = () => {
    if (editingNode) {
      updateNode(editingNode.id, editingNode);
      setIsEditingNode(false);
      setEditingNode(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingNode(false);
    setEditingNode(null);
  };

  React.useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);

  const getNodeColor = (type: WorkflowNodeType): string => {
    switch (type) {
      case 'agent':
        return '#007acc';
      case 'condition':
        return '#ffc107';
      case 'action':
        return '#28a745';
      case 'input':
        return '#6c757d';
      case 'output':
        return '#17a2b8';
      case 'loop':
        return '#e83e8c';
      case 'parallel':
        return '#fd7e14';
      default:
        return '#6c757d';
    }
  };

  const renderConnections = () => {
    return workflow.connections.map(conn => {
      const sourceNode = workflow.nodes.find(n => n.id === conn.sourceNodeId);
      const targetNode = workflow.nodes.find(n => n.id === conn.targetNodeId);

      if (!sourceNode || !targetNode) return null;

      const startX = sourceNode.position.x + 50;
      const startY = sourceNode.position.y + 25;
      const endX = targetNode.position.x - 50;
      const endY = targetNode.position.y + 25;

      return (
        <g key={conn.id}>
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="#666"
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={(startX + endX) / 2}
            y={(startY + endY) / 2 - 10}
            fill="#888"
            fontSize={12}
            textAnchor="middle"
          >
            {conn.type}
          </text>
        </g>
      );
    });
  };

  const renderDrawingConnection = () => {
    if (!connectionState.isDrawing || !connectionState.sourceNodeId)
      return null;

    const sourceNode = workflow.nodes.find(
      n => n.id === connectionState.sourceNodeId
    );
    if (!sourceNode) return null;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const startX = sourceNode.position.x + 50;
    const startY = sourceNode.position.y + 25;
    const endX = connectionState.isDrawing
      ? rect.width / 2
      : sourceNode.position.x + 100;
    const endY = connectionState.isDrawing
      ? rect.height / 2
      : sourceNode.position.y + 100;

    return (
      <g>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#007acc"
          strokeWidth={2}
          strokeDasharray="5,5"
          markerEnd="url(#arrowhead)"
        />
      </g>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          width: '200px',
          borderRight: '1px solid #333',
          padding: '20px',
          backgroundColor: '#2d2d2d',
        }}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Node Types</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(
            [
              'agent',
              'condition',
              'action',
              'input',
              'output',
              'loop',
              'parallel',
            ] as WorkflowNodeType[]
          ).map(type => (
            <div
              key={type}
              onClick={e => {
                e.preventDefault();
                addNode(type, { x: 100, y: 100 });
              }}
              style={{
                padding: '10px',
                backgroundColor: getNodeColor(type),
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#fff',
                userSelect: 'none',
              }}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow', type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '30px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
            Workflow Info
          </h4>
          <div style={{ fontSize: '12px', color: '#888' }}>
            <div>Nodes: {workflow.nodes.length}</div>
            <div>Connections: {workflow.connections.length}</div>
            <div>Status: {workflow.status}</div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#252526',
          overflow: 'hidden',
          cursor: connectionState.isDrawing ? 'crosshair' : 'default',
        }}
      >
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
            </marker>
          </defs>
          {renderConnections()}
          {renderDrawingConnection()}
        </svg>

        {/* Nodes */}
        {workflow.nodes.map(node => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: node.position.x,
              top: node.position.y,
              width: '100px',
              height: '50px',
              backgroundColor: getNodeColor(node.type),
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'move',
              border: selectedNodeId === node.id ? '2px solid #fff' : 'none',
              boxShadow:
                selectedNodeId === node.id
                  ? '0 0 10px rgba(255,255,255,0.5)'
                  : 'none',
            }}
            onMouseDown={e => handleNodeMouseDown(e, node.id)}
            onDoubleClick={() => handleNodeDoubleClick(node.id)}
            onClick={() => setSelectedNodeId(node.id)}
          >
            {node.name}
            <div
              style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                width: '20px',
                height: '20px',
                backgroundColor: '#dc3545',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                cursor: 'pointer',
              }}
              onClick={e => {
                e.stopPropagation();
                deleteNode(node.id);
              }}
            >
              ×
            </div>
            <div
              style={{
                position: 'absolute',
                top: '-10px',
                left: '-10px',
                width: '20px',
                height: '20px',
                backgroundColor: '#ffc107',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                cursor: 'pointer',
              }}
              onClick={e => {
                e.stopPropagation();
                handleStartConnection(node.id);
              }}
            >
              ➕
            </div>
          </div>
        ))}

        {/* Connection indicator */}
        {connectionState.isDrawing && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#007acc',
              fontSize: '14px',
              pointerEvents: 'none',
            }}
          >
            Click on a target node to complete the connection
          </div>
        )}
      </div>

      {/* Properties Panel */}
      <div
        style={{
          width: '300px',
          borderLeft: '1px solid #333',
          padding: '20px',
          backgroundColor: '#2d2d2d',
        }}
      >
        {selectedNodeId && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>
              Node Properties
            </h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '4px',
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={
                    workflow.nodes.find(n => n.id === selectedNodeId)?.name ||
                    ''
                  }
                  onChange={e =>
                    updateNode(selectedNodeId, { name: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '4px',
                  }}
                >
                  Description
                </label>
                <textarea
                  value={
                    workflow.nodes.find(n => n.id === selectedNodeId)
                      ?.description || ''
                  }
                  onChange={e =>
                    updateNode(selectedNodeId, { description: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    color: '#fff',
                    minHeight: '60px',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '4px',
                  }}
                >
                  Type
                </label>
                <select
                  value={
                    workflow.nodes.find(n => n.id === selectedNodeId)?.type ||
                    ''
                  }
                  onChange={e =>
                    updateNode(selectedNodeId, {
                      type: e.target.value as WorkflowNodeType,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                >
                  <option value="agent">Agent</option>
                  <option value="condition">Condition</option>
                  <option value="action">Action</option>
                  <option value="input">Input</option>
                  <option value="output">Output</option>
                  <option value="loop">Loop</option>
                  <option value="parallel">Parallel</option>
                </select>
              </div>
              <div>
                <button
                  onClick={() => deleteNode(selectedNodeId)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#dc3545',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Delete Node
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedNodeId && (
          <div
            style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}
          >
            Select a node to edit its properties
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditingNode && editingNode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#2d2d2d',
              padding: '20px',
              borderRadius: '8px',
              width: '400px',
            }}
          >
            <h3 style={{ margin: '0 0 20px 0' }}>Edit Node</h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <input
                type="text"
                value={editingNode.name}
                onChange={e =>
                  setEditingNode({ ...editingNode, name: e.target.value })
                }
                style={{
                  padding: '8px',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#fff',
                }}
              />
              <textarea
                value={editingNode.description}
                onChange={e =>
                  setEditingNode({
                    ...editingNode,
                    description: e.target.value,
                  })
                }
                style={{
                  padding: '8px',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  color: '#fff',
                  minHeight: '80px',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={handleCancelEdit}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#555',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNode}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007acc',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpiralBuilder;
