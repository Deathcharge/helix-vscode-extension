"use strict";
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
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const SpiralBuilder = () => {
    const [workflow, setWorkflow] = React.useState({
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
    const [dragState, setDragState] = React.useState({
        isDragging: false,
        nodeId: null,
        offset: { x: 0, y: 0 },
    });
    const [connectionState, setConnectionState] = React.useState({
        isDrawing: false,
        sourceNodeId: null,
        targetNodeId: null,
    });
    const [selectedNodeId, setSelectedNodeId] = React.useState(null);
    const [isEditingNode, setIsEditingNode] = React.useState(false);
    const [editingNode, setEditingNode] = React.useState(null);
    const svgRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const addNode = (type, position) => {
        const newNode = {
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
    const updateNode = (nodeId, updates) => {
        setWorkflow(prev => ({
            ...prev,
            nodes: prev.nodes.map(node => node.id === nodeId ? { ...node, ...updates } : node),
            updatedAt: new Date(),
        }));
    };
    const deleteNode = (nodeId) => {
        setWorkflow(prev => ({
            ...prev,
            nodes: prev.nodes.filter(node => node.id !== nodeId),
            connections: prev.connections.filter(conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId),
            updatedAt: new Date(),
        }));
        setSelectedNodeId(null);
    };
    const addConnection = (sourceNodeId, targetNodeId) => {
        // Check for cycles
        if (wouldCreateCycle(sourceNodeId, targetNodeId)) {
            alert('Adding this connection would create a cycle!');
            return;
        }
        const newConnection = {
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
    const deleteConnection = (connectionId) => {
        setWorkflow(prev => ({
            ...prev,
            connections: prev.connections.filter(conn => conn.id !== connectionId),
            updatedAt: new Date(),
        }));
    };
    const wouldCreateCycle = (sourceNodeId, targetNodeId) => {
        // Simple cycle detection
        const visited = new Set();
        const stack = new Set();
        const hasCycle = (nodeId) => {
            if (stack.has(nodeId))
                return true;
            if (visited.has(nodeId))
                return false;
            visited.add(nodeId);
            stack.add(nodeId);
            const connectionsFromNode = workflow.connections.filter(c => c.sourceNodeId === nodeId);
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
                type: 'success',
                metadata: { weight: 1, description: '', enabled: true },
            },
        ];
        // Check if adding this connection would create a cycle
        const originalConnections = workflow.connections;
        workflow.connections = tempConnections;
        const result = hasCycle(sourceNodeId);
        workflow.connections = originalConnections;
        return result;
    };
    const handleCanvasClick = (e) => {
        if (connectionState.isDrawing) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect)
                return;
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // Find if clicked on a node
            const clickedNode = workflow.nodes.find(node => {
                return (x >= node.position.x - 50 &&
                    x <= node.position.x + 50 &&
                    y >= node.position.y - 25 &&
                    y <= node.position.y + 25);
            });
            if (clickedNode && clickedNode.id !== connectionState.sourceNodeId) {
                addConnection(connectionState.sourceNodeId, clickedNode.id);
            }
            setConnectionState({
                isDrawing: false,
                sourceNodeId: null,
                targetNodeId: null,
            });
        }
    };
    const handleNodeMouseDown = (e, nodeId) => {
        e.stopPropagation();
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node)
            return;
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
    const handleMouseMove = (e) => {
        if (dragState.isDragging && dragState.nodeId) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect)
                return;
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
    const handleNodeDoubleClick = (nodeId) => {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (node) {
            setEditingNode(node);
            setIsEditingNode(true);
        }
    };
    const handleStartConnection = (nodeId) => {
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
    const getNodeColor = (type) => {
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
            if (!sourceNode || !targetNode)
                return null;
            const startX = sourceNode.position.x + 50;
            const startY = sourceNode.position.y + 25;
            const endX = targetNode.position.x - 50;
            const endY = targetNode.position.y + 25;
            return ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: startX, y1: startY, x2: endX, y2: endY, stroke: "#666", strokeWidth: 2, markerEnd: "url(#arrowhead)" }), (0, jsx_runtime_1.jsx)("text", { x: (startX + endX) / 2, y: (startY + endY) / 2 - 10, fill: "#888", fontSize: 12, textAnchor: "middle", children: conn.type })] }, conn.id));
        });
    };
    const renderDrawingConnection = () => {
        if (!connectionState.isDrawing || !connectionState.sourceNodeId)
            return null;
        const sourceNode = workflow.nodes.find(n => n.id === connectionState.sourceNodeId);
        if (!sourceNode)
            return null;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect)
            return null;
        const startX = sourceNode.position.x + 50;
        const startY = sourceNode.position.y + 25;
        const endX = connectionState.isDrawing
            ? rect.width / 2
            : sourceNode.position.x + 100;
        const endY = connectionState.isDrawing
            ? rect.height / 2
            : sourceNode.position.y + 100;
        return ((0, jsx_runtime_1.jsx)("g", { children: (0, jsx_runtime_1.jsx)("line", { x1: startX, y1: startY, x2: endX, y2: endY, stroke: "#007acc", strokeWidth: 2, strokeDasharray: "5,5", markerEnd: "url(#arrowhead)" }) }));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: 'flex',
            height: '100vh',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    width: '200px',
                    borderRight: '1px solid #333',
                    padding: '20px',
                    backgroundColor: '#2d2d2d',
                }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: '0 0 20px 0', fontSize: '16px' }, children: "Node Types" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [
                            'agent',
                            'condition',
                            'action',
                            'input',
                            'output',
                            'loop',
                            'parallel',
                        ].map(type => ((0, jsx_runtime_1.jsx)("div", { onClick: e => {
                                e.preventDefault();
                                addNode(type, { x: 100, y: 100 });
                            }, style: {
                                padding: '10px',
                                backgroundColor: getNodeColor(type),
                                borderRadius: '4px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                color: '#fff',
                                userSelect: 'none',
                            }, draggable: true, onDragStart: e => {
                                e.dataTransfer.setData('application/reactflow', type);
                                e.dataTransfer.effectAllowed = 'copy';
                            }, children: type.charAt(0).toUpperCase() + type.slice(1) }, type))) }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '30px' }, children: [(0, jsx_runtime_1.jsx)("h4", { style: { margin: '0 0 10px 0', fontSize: '14px' }, children: "Workflow Info" }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '12px', color: '#888' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: ["Nodes: ", workflow.nodes.length] }), (0, jsx_runtime_1.jsxs)("div", { children: ["Connections: ", workflow.connections.length] }), (0, jsx_runtime_1.jsxs)("div", { children: ["Status: ", workflow.status] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { ref: canvasRef, onClick: handleCanvasClick, style: {
                    flex: 1,
                    position: 'relative',
                    backgroundColor: '#252526',
                    overflow: 'hidden',
                    cursor: connectionState.isDrawing ? 'crosshair' : 'default',
                }, children: [(0, jsx_runtime_1.jsxs)("svg", { ref: svgRef, style: { width: '100%', height: '100%' }, children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsx)("marker", { id: "arrowhead", markerWidth: "10", markerHeight: "7", refX: "9", refY: "3.5", orient: "auto", children: (0, jsx_runtime_1.jsx)("polygon", { points: "0 0, 10 3.5, 0 7", fill: "#666" }) }) }), renderConnections(), renderDrawingConnection()] }), workflow.nodes.map(node => ((0, jsx_runtime_1.jsxs)("div", { style: {
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
                            boxShadow: selectedNodeId === node.id
                                ? '0 0 10px rgba(255,255,255,0.5)'
                                : 'none',
                        }, onMouseDown: e => handleNodeMouseDown(e, node.id), onDoubleClick: () => handleNodeDoubleClick(node.id), onClick: () => setSelectedNodeId(node.id), children: [node.name, (0, jsx_runtime_1.jsx)("div", { style: {
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
                                }, onClick: e => {
                                    e.stopPropagation();
                                    deleteNode(node.id);
                                }, children: "\u00D7" }), (0, jsx_runtime_1.jsx)("div", { style: {
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
                                }, onClick: e => {
                                    e.stopPropagation();
                                    handleStartConnection(node.id);
                                }, children: "\u2795" })] }, node.id))), connectionState.isDrawing && ((0, jsx_runtime_1.jsx)("div", { style: {
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#007acc',
                            fontSize: '14px',
                            pointerEvents: 'none',
                        }, children: "Click on a target node to complete the connection" }))] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    width: '300px',
                    borderLeft: '1px solid #333',
                    padding: '20px',
                    backgroundColor: '#2d2d2d',
                }, children: [selectedNodeId && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: '0 0 20px 0', fontSize: '16px' }, children: "Node Properties" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: {
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    color: '#888',
                                                    marginBottom: '4px',
                                                }, children: "Name" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: workflow.nodes.find(n => n.id === selectedNodeId)?.name ||
                                                    '', onChange: e => updateNode(selectedNodeId, { name: e.target.value }), style: {
                                                    width: '100%',
                                                    padding: '8px',
                                                    backgroundColor: '#333',
                                                    border: '1px solid #555',
                                                    borderRadius: '4px',
                                                    color: '#fff',
                                                } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: {
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    color: '#888',
                                                    marginBottom: '4px',
                                                }, children: "Description" }), (0, jsx_runtime_1.jsx)("textarea", { value: workflow.nodes.find(n => n.id === selectedNodeId)
                                                    ?.description || '', onChange: e => updateNode(selectedNodeId, { description: e.target.value }), style: {
                                                    width: '100%',
                                                    padding: '8px',
                                                    backgroundColor: '#333',
                                                    border: '1px solid #555',
                                                    borderRadius: '4px',
                                                    color: '#fff',
                                                    minHeight: '60px',
                                                } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { style: {
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    color: '#888',
                                                    marginBottom: '4px',
                                                }, children: "Type" }), (0, jsx_runtime_1.jsxs)("select", { value: workflow.nodes.find(n => n.id === selectedNodeId)?.type ||
                                                    '', onChange: e => updateNode(selectedNodeId, {
                                                    type: e.target.value,
                                                }), style: {
                                                    width: '100%',
                                                    padding: '8px',
                                                    backgroundColor: '#333',
                                                    border: '1px solid #555',
                                                    borderRadius: '4px',
                                                    color: '#fff',
                                                }, children: [(0, jsx_runtime_1.jsx)("option", { value: "agent", children: "Agent" }), (0, jsx_runtime_1.jsx)("option", { value: "condition", children: "Condition" }), (0, jsx_runtime_1.jsx)("option", { value: "action", children: "Action" }), (0, jsx_runtime_1.jsx)("option", { value: "input", children: "Input" }), (0, jsx_runtime_1.jsx)("option", { value: "output", children: "Output" }), (0, jsx_runtime_1.jsx)("option", { value: "loop", children: "Loop" }), (0, jsx_runtime_1.jsx)("option", { value: "parallel", children: "Parallel" })] })] }), (0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("button", { onClick: () => deleteNode(selectedNodeId), style: {
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: '#dc3545',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer',
                                            }, children: "Delete Node" }) })] })] })), !selectedNodeId && ((0, jsx_runtime_1.jsx)("div", { style: { textAlign: 'center', color: '#888', marginTop: '50px' }, children: "Select a node to edit its properties" }))] }), isEditingNode && editingNode && ((0, jsx_runtime_1.jsx)("div", { style: {
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
                }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                        backgroundColor: '#2d2d2d',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '400px',
                    }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { margin: '0 0 20px 0' }, children: "Edit Node" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: editingNode.name, onChange: e => setEditingNode({ ...editingNode, name: e.target.value }), style: {
                                        padding: '8px',
                                        backgroundColor: '#333',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        color: '#fff',
                                    } }), (0, jsx_runtime_1.jsx)("textarea", { value: editingNode.description, onChange: e => setEditingNode({
                                        ...editingNode,
                                        description: e.target.value,
                                    }), style: {
                                        padding: '8px',
                                        backgroundColor: '#333',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        minHeight: '80px',
                                    } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                        display: 'flex',
                                        gap: '10px',
                                        justifyContent: 'flex-end',
                                    }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleCancelEdit, style: {
                                                padding: '8px 16px',
                                                backgroundColor: '#555',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer',
                                            }, children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSaveNode, style: {
                                                padding: '8px 16px',
                                                backgroundColor: '#007acc',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer',
                                            }, children: "Save" })] })] })] }) }))] }));
};
exports.default = SpiralBuilder;
//# sourceMappingURL=spiralBuilder.js.map