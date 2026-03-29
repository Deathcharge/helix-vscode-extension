// Spiral Builder Web View for VSCode
// This is a simplified version of the React component compiled to plain JavaScript

(function () {
  'use strict';

  // Mock React-like functionality for VSCode webview
  const createElement = (tag, props, ...children) => {
    const element = document.createElement(tag);

    if (props) {
      Object.keys(props).forEach(key => {
        if (key === 'style') {
          Object.assign(element.style, props[key]);
        } else if (key.startsWith('on')) {
          element.addEventListener(key.slice(2).toLowerCase(), props[key]);
        } else {
          element[key] = props[key];
        }
      });
    }

    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child) {
        element.appendChild(child);
      }
    });

    return element;
  };

  // Workflow state
  let workflow = {
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
  };

  let dragState = {
    isDragging: false,
    nodeId: null,
    offset: { x: 0, y: 0 },
  };

  let connectionState = {
    isDrawing: false,
    sourceNodeId: null,
    targetNodeId: null,
  };

  let selectedNodeId = null;
  let isEditingNode = false;
  let editingNode = null;

  // DOM elements
  let canvas;
  let svg;
  let propertiesPanel;
  let toolbar;

  /**
   * Initialize the application UI, register global event listeners, and perform the initial render of the workflow editor.
   */
  function init() {
    createUI();
    setupEventListeners();
    render();
  }

  /**
   * Build and mount the main workflow editor UI into the page root.
   *
   * Constructs and inserts the three-pane layout (left toolbar with node type buttons and workflow info,
   * central canvas with an SVG overlay and arrowhead marker, and right properties panel), attaches the
   * canvas click handler, and initializes the displayed workflow summary.
   */
  function createUI() {
    // Create main layout
    const app = document.getElementById('root');
    app.innerHTML = '';

    // Toolbar
    toolbar = createElement('div', {
      style: {
        width: '200px',
        borderRight: '1px solid #333',
        padding: '20px',
        backgroundColor: '#2d2d2d',
        height: '100vh',
        overflow: 'auto',
      },
    });

    const toolbarTitle = createElement(
      'h3',
      {
        style: {
          margin: '0 0 20px 0',
          fontSize: '16px',
        },
      },
      'Node Types'
    );

    const nodeTypes = [
      'agent',
      'condition',
      'action',
      'input',
      'output',
      'loop',
      'parallel',
    ];
    const nodeButtons = nodeTypes.map(type => {
      return createElement(
        'div',
        {
          style: {
            padding: '10px',
            backgroundColor: getNodeColor(type),
            borderRadius: '4px',
            cursor: 'pointer',
            textAlign: 'center',
            fontWeight: 'bold',
            color: '#fff',
            userSelect: 'none',
            marginBottom: '10px',
          },
          onclick: () => addNode(type, { x: 100, y: 100 }),
        },
        type.charAt(0).toUpperCase() + type.slice(1)
      );
    });

    const workflowInfo = createElement('div', {
      style: {
        marginTop: '30px',
      },
    });

    const infoTitle = createElement(
      'h4',
      {
        style: {
          margin: '0 0 10px 0',
          fontSize: '14px',
        },
      },
      'Workflow Info'
    );

    const infoContent = createElement('div', {
      style: {
        fontSize: '12px',
        color: '#888',
      },
    });

    workflowInfo.appendChild(infoTitle);
    workflowInfo.appendChild(infoContent);

    toolbar.appendChild(toolbarTitle);
    nodeButtons.forEach(btn => toolbar.appendChild(btn));
    toolbar.appendChild(workflowInfo);

    // Canvas
    canvas = createElement('div', {
      style: {
        flex: '1',
        position: 'relative',
        backgroundColor: '#252526',
        overflow: 'hidden',
        cursor: 'default',
      },
      onclick: handleCanvasClick,
    });

    svg = createElement('svg', {
      style: {
        width: '100%',
        height: '100%',
      },
    });

    // SVG definitions
    const defs = createElement('defs', {});
    const marker = createElement('marker', {
      id: 'arrowhead',
      markerWidth: '10',
      markerHeight: '7',
      refX: '9',
      refY: '3.5',
      orient: 'auto',
    });

    const polygon = createElement('polygon', {
      points: '0 0, 10 3.5, 0 7',
      fill: '#666',
    });

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    canvas.appendChild(svg);

    // Properties Panel
    propertiesPanel = createElement('div', {
      style: {
        width: '300px',
        borderLeft: '1px solid #333',
        padding: '20px',
        backgroundColor: '#2d2d2d',
        height: '100vh',
        overflow: 'auto',
      },
    });

    const propertiesTitle = createElement(
      'h3',
      {
        style: {
          margin: '0 0 20px 0',
          fontSize: '16px',
        },
      },
      'Properties'
    );

    propertiesPanel.appendChild(propertiesTitle);

    // Main container
    const mainContainer = createElement('div', {
      style: {
        display: 'flex',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
      },
    });

    mainContainer.appendChild(toolbar);
    mainContainer.appendChild(canvas);
    mainContainer.appendChild(propertiesPanel);

    app.appendChild(mainContainer);

    // Update info
    updateWorkflowInfo(infoContent);
  }

  /**
   * Attach document-level mouse event listeners used for node dragging and connection drawing.
   *
   * Registers handlers for "mousemove" and "mouseup" so the UI can track pointer movement and finalize drag/connection actions.
   */
  function setupEventListeners() {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  /**
   * Render the current workflow state into the UI.
   *
   * Updates the canvas, SVG connections, properties panel, and workflow summary in the toolbar to reflect the current in-memory workflow state (nodes, connections, selection, and metadata).
   */
  function render() {
    // Clear existing nodes
    const existingNodes = canvas.querySelectorAll('.node');
    existingNodes.forEach(node => node.remove());

    // Render connections
    renderConnections();

    // Render nodes
    workflow.nodes.forEach(node => {
      const nodeElement = createNodeElement(node);
      canvas.appendChild(nodeElement);
    });

    // Render properties
    renderProperties();

    // Update workflow info
    const infoContent = toolbar.querySelector(
      'div[style*="marginTop: 30px"] div'
    );
    if (infoContent) {
      updateWorkflowInfo(infoContent);
    }
  }

  /**
   * Create a draggable DOM element that visually represents a workflow node and includes controls for select, edit, delete, and start-connection actions.
   * @param {Object} node - Node data used to render the element. Expected properties: `id` (string), `name` (string), `position` ({ x: number, y: number }), and `type` (string).
   * @returns {HTMLElement} The created DOM element for the node, with attached event handlers and embedded delete and connect buttons.
   */
  function createNodeElement(node) {
    const element = createElement('div', {
      className: 'node',
      style: {
        position: 'absolute',
        left: node.position.x + 'px',
        top: node.position.y + 'px',
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
      },
      onmousedown: e => handleNodeMouseDown(e, node.id),
      ondblclick: () => handleNodeDoubleClick(node.id),
      onclick: e => {
        e.stopPropagation();
        setSelectedNodeId(node.id);
      },
    });

    element.textContent = node.name;

    // Delete button
    const deleteBtn = createElement(
      'div',
      {
        style: {
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
        },
        onclick: e => {
          e.stopPropagation();
          deleteNode(node.id);
        },
      },
      '×'
    );

    // Connection button
    const connectBtn = createElement(
      'div',
      {
        style: {
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
        },
        onclick: e => {
          e.stopPropagation();
          handleStartConnection(node.id);
        },
      },
      '➕'
    );

    element.appendChild(deleteBtn);
    element.appendChild(connectBtn);

    return element;
  }

  /**
   * Render all workflow connections into the SVG overlay and draw a provisional connection while the user is drawing.
   *
   * Clears existing connection SVG elements (lines and labels) and for each connection in the workflow:
   * - draws a line from the source node to the target node
   * - adds a centered text label showing the connection type
   *
   * If a connection draw operation is active, draws a dashed, colored provisional line from the source node toward the canvas center.
   */
  function renderConnections() {
    // Clear existing connections
    const existingLines = svg.querySelectorAll('line, text');
    existingLines.forEach(line => line.remove());

    workflow.connections.forEach(conn => {
      const sourceNode = workflow.nodes.find(n => n.id === conn.sourceNodeId);
      const targetNode = workflow.nodes.find(n => n.id === conn.targetNodeId);

      if (!sourceNode || !targetNode) return;

      const startX = sourceNode.position.x + 50;
      const startY = sourceNode.position.y + 25;
      const endX = targetNode.position.x - 50;
      const endY = targetNode.position.y + 25;

      // Connection line
      const line = createElement('line', {
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        stroke: '#666',
        strokeWidth: 2,
        markerEnd: 'url(#arrowhead)',
      });

      // Connection label
      const label = createElement(
        'text',
        {
          x: (startX + endX) / 2,
          y: (startY + endY) / 2 - 10,
          fill: '#888',
          fontSize: 12,
          textAnchor: 'middle',
        },
        conn.type
      );

      svg.appendChild(line);
      svg.appendChild(label);
    });

    // Render drawing connection
    if (connectionState.isDrawing && connectionState.sourceNodeId) {
      const sourceNode = workflow.nodes.find(
        n => n.id === connectionState.sourceNodeId
      );
      if (sourceNode) {
        const rect = canvas.getBoundingClientRect();
        const startX = sourceNode.position.x + 50;
        const startY = sourceNode.position.y + 25;
        const endX = rect.width / 2;
        const endY = rect.height / 2;

        const line = createElement('line', {
          x1: startX,
          y1: startY,
          x2: endX,
          y2: endY,
          stroke: '#007acc',
          strokeWidth: 2,
          strokeDasharray: '5,5',
          markerEnd: 'url(#arrowhead)',
        });

        svg.appendChild(line);
      }
    }
  }

  /**
   * Render the properties panel UI for the currently selected node.
   *
   * When a node is selected, replaces the propertiesPanel content with a form that allows editing the node's name, description, and type, and provides a button to delete the node; user changes are applied to the workflow state. If no node is selected, displays a placeholder message prompting selection.
   */
  function renderProperties() {
    propertiesPanel.innerHTML = '';

    const title = createElement(
      'h3',
      {
        style: {
          margin: '0 0 20px 0',
          fontSize: '16px',
        },
      },
      'Node Properties'
    );

    propertiesPanel.appendChild(title);

    if (selectedNodeId) {
      const node = workflow.nodes.find(n => n.id === selectedNodeId);
      if (node) {
        const form = createElement('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          },
        });

        // Name field
        const nameGroup = createElement('div', {});
        const nameLabel = createElement(
          'label',
          {
            style: {
              display: 'block',
              fontSize: '12px',
              color: '#888',
              marginBottom: '4px',
            },
          },
          'Name'
        );
        const nameInput = createElement('input', {
          type: 'text',
          value: node.name,
          style: {
            width: '100%',
            padding: '8px',
            backgroundColor: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
          },
          oninput: e => updateNode(selectedNodeId, { name: e.target.value }),
        });
        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);

        // Description field
        const descGroup = createElement('div', {});
        const descLabel = createElement(
          'label',
          {
            style: {
              display: 'block',
              fontSize: '12px',
              color: '#888',
              marginBottom: '4px',
            },
          },
          'Description'
        );
        const descInput = createElement('textarea', {
          value: node.description,
          style: {
            width: '100%',
            padding: '8px',
            backgroundColor: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
            minHeight: '60px',
          },
          oninput: e =>
            updateNode(selectedNodeId, { description: e.target.value }),
        });
        descGroup.appendChild(descLabel);
        descGroup.appendChild(descInput);

        // Type field
        const typeGroup = createElement('div', {});
        const typeLabel = createElement(
          'label',
          {
            style: {
              display: 'block',
              fontSize: '12px',
              color: '#888',
              marginBottom: '4px',
            },
          },
          'Type'
        );
        const typeSelect = createElement('select', {
          style: {
            width: '100%',
            padding: '8px',
            backgroundColor: '#333',
            border: '1px solid #555',
            borderRadius: '4px',
            color: '#fff',
          },
          onchange: e => updateNode(selectedNodeId, { type: e.target.value }),
        });

        const types = [
          'agent',
          'condition',
          'action',
          'input',
          'output',
          'loop',
          'parallel',
        ];
        types.forEach(type => {
          const option = createElement(
            'option',
            {
              value: type,
              selected: node.type === type,
            },
            type.charAt(0).toUpperCase() + type.slice(1)
          );
          typeSelect.appendChild(option);
        });

        typeGroup.appendChild(typeLabel);
        typeGroup.appendChild(typeSelect);

        // Delete button
        const deleteBtn = createElement(
          'button',
          {
            style: {
              width: '100%',
              padding: '8px',
              backgroundColor: '#dc3545',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
            },
            onclick: () => deleteNode(selectedNodeId),
          },
          'Delete Node'
        );

        form.appendChild(nameGroup);
        form.appendChild(descGroup);
        form.appendChild(typeGroup);
        form.appendChild(deleteBtn);

        propertiesPanel.appendChild(form);
      }
    } else {
      const emptyState = createElement(
        'div',
        {
          style: {
            textAlign: 'center',
            color: '#888',
            marginTop: '50px',
          },
        },
        'Select a node to edit its properties'
      );

      propertiesPanel.appendChild(emptyState);
    }
  }

  /**
   * Replace the container's contents with a brief summary of the current workflow.
   * @param {HTMLElement} container - Element to populate with the workflow's node count, connection count, and status.
   */
  function updateWorkflowInfo(container) {
    container.innerHTML = '';

    const nodesCount = createElement(
      'div',
      {},
      `Nodes: ${workflow.nodes.length}`
    );
    const connectionsCount = createElement(
      'div',
      {},
      `Connections: ${workflow.connections.length}`
    );
    const status = createElement('div', {}, `Status: ${workflow.status}`);

    container.appendChild(nodesCount);
    container.appendChild(connectionsCount);
    container.appendChild(status);
  }

  /**
   * Create and add a new node of the given type at the specified position in the workflow.
   *
   * Adds a node object to `workflow.nodes`, updates `workflow.updatedAt`, and triggers a UI re-render.
   *
   * @param {string} type - The node type (for example: "agent", "condition", "action", "input", "output", "loop", "parallel").
   * @param {{x: number, y: number}} position - Canvas coordinates where the new node will be placed.
   */
  function addNode(type, position) {
    const newNode = {
      id: 'node-' + Date.now(),
      type: type,
      name: type.charAt(0).toUpperCase() + type.slice(1) + ' Node',
      description: type + ' node description',
      position: position,
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

    workflow.nodes.push(newNode);
    workflow.updatedAt = new Date();
    render();
  }

  /**
   * Apply partial updates to a workflow node and refresh the UI.
   *
   * If a node with the given `nodeId` exists, merges `updates` into that node, updates the workflow's
   * `updatedAt` timestamp, and triggers a re-render.
   *
   * @param {string} nodeId - The id of the node to update.
   * @param {Object} updates - An object containing fields to merge into the existing node.
   */
  function updateNode(nodeId, updates) {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (node) {
      Object.assign(node, updates);
      workflow.updatedAt = new Date();
      render();
    }
  }

  /**
   * Remove a node and its connections from the workflow.
   *
   * Deletes the node identified by `nodeId`, removes any connections that reference that node,
   * updates the workflow's updatedAt timestamp, clears the current selection, and triggers a UI re-render.
   *
   * @param {string} nodeId - Identifier of the node to remove.
   */
  function deleteNode(nodeId) {
    workflow.nodes = workflow.nodes.filter(node => node.id !== nodeId);
    workflow.connections = workflow.connections.filter(
      conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
    );
    workflow.updatedAt = new Date();
    selectedNodeId = null;
    render();
  }

  /**
   * Add a directed connection from one node to another if it does not create a cycle.
   *
   * If adding the connection would create a cycle, the function shows an alert and aborts.
   * On success, a new connection object is appended to the workflow's connections, the
   * workflow's updatedAt timestamp is updated, and the UI is re-rendered.
   *
   * @param {string} sourceNodeId - ID of the node that will be the connection's source.
   * @param {string} targetNodeId - ID of the node that will be the connection's target.
   */
  function addConnection(sourceNodeId, targetNodeId) {
    if (wouldCreateCycle(sourceNodeId, targetNodeId)) {
      alert('Adding this connection would create a cycle!');
      return;
    }

    const newConnection = {
      id: 'conn-' + Date.now(),
      sourceNodeId: sourceNodeId,
      targetNodeId: targetNodeId,
      type: 'success',
      metadata: {
        weight: 1,
        description: 'Connection',
        enabled: true,
      },
    };

    workflow.connections.push(newConnection);
    workflow.updatedAt = new Date();
    render();
  }

  /**
   * Remove a connection from the workflow, update the workflow timestamp, and re-render the UI.
   * @param {string} connectionId - The id of the connection to remove.
   */
  function deleteConnection(connectionId) {
    workflow.connections = workflow.connections.filter(
      conn => conn.id !== connectionId
    );
    workflow.updatedAt = new Date();
    render();
  }

  /**
   * Determine whether adding a directed connection from sourceNodeId to targetNodeId would create a cycle in the workflow graph.
   * @param {string} sourceNodeId - ID of the source node.
   * @param {string} targetNodeId - ID of the target node.
   * @returns {boolean} `true` if adding the connection would create a cycle, `false` otherwise. The check is performed temporarily and restores the workflow's connections to their original state.
   */
  function wouldCreateCycle(sourceNodeId, targetNodeId) {
    const visited = new Set();
    const stack = new Set();

    function hasCycle(nodeId) {
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
    }

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

    const originalConnections = workflow.connections;
    workflow.connections = tempConnections;
    const result = hasCycle(sourceNodeId);
    workflow.connections = originalConnections;

    return result;
  }

  /**
   * Completes an in-progress connection when the canvas is clicked and finalizes drawing state.
   *
   * If a connection draw is active and the click lands on a different node, creates a connection
   * from the active source node to the clicked node, exits drawing mode, clears connection state,
   * and triggers a re-render.
   *
   * @param {MouseEvent} e - Canvas click event; client coordinates are translated to canvas coordinates to detect node hits.
   */
  function handleCanvasClick(e) {
    if (connectionState.isDrawing) {
      const rect = canvas.getBoundingClientRect();
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
        addConnection(connectionState.sourceNodeId, clickedNode.id);
      }

      connectionState.isDrawing = false;
      connectionState.sourceNodeId = null;
      connectionState.targetNodeId = null;
      render();
    }
  }

  /**
   * Begin dragging the specified node by recording drag state and pointer offset.
   *
   * Stops propagation of the mouse event, sets dragState.isDragging to true,
   * stores the node id in dragState.nodeId, and records the pointer offset
   * within the node (used to preserve cursor position while moving).
   *
   * @param {MouseEvent} e - The mousedown event from the node element.
   * @param {string} nodeId - The id of the node to start dragging.
   */
  function handleNodeMouseDown(e, nodeId) {
    e.stopPropagation();
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const rect = e.currentTarget.getBoundingClientRect();
    dragState.isDragging = true;
    dragState.nodeId = nodeId;
    dragState.offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  /**
   * Updates the position of the node being dragged to follow the mouse during a drag operation.
   * @param {MouseEvent} e - The mousemove event used to compute the node's new canvas-relative coordinates.
   */
  function handleMouseMove(e) {
    if (dragState.isDragging && dragState.nodeId) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - dragState.offset.x;
      const y = e.clientY - rect.top - dragState.offset.y;

      updateNode(dragState.nodeId, {
        position: { x, y },
      });
    }
  }

  /**
   * Stops any active node dragging operation and resets the drag state.
   *
   * Clears the dragged node reference, marks dragging as inactive, and resets the drag offset to { x: 0, y: 0 }.
   */
  function handleMouseUp() {
    dragState.isDragging = false;
    dragState.nodeId = null;
    dragState.offset = { x: 0, y: 0 };
  }

  /**
   * Begin editing the node with the given id by selecting it and opening the edit modal.
   *
   * If a node with the provided id exists, sets it as the current editing target, toggles the editing flag, and opens the edit modal; does nothing if no matching node is found.
   * @param {string} nodeId - The id of the node to edit.
   */
  function handleNodeDoubleClick(nodeId) {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (node) {
      editingNode = node;
      isEditingNode = true;
      showEditModal();
    }
  }

  /**
   * Begin an interactive connection operation using the given node as the source.
   * @param {string} nodeId - The id of the node to use as the connection source.
   */
  function handleStartConnection(nodeId) {
    connectionState.isDrawing = true;
    connectionState.sourceNodeId = nodeId;
    connectionState.targetNodeId = null;
    render();
  }

  /**
   * Update the currently selected node in the workflow and refresh the UI.
   * @param {string|null} nodeId - The id of the node to select, or `null` to clear the selection.
   */
  function setSelectedNodeId(nodeId) {
    selectedNodeId = nodeId;
    render();
  }

  /**
   * Map a node type to its display color.
   *
   * @param {string} type - Node type; one of "agent", "condition", "action", "input", "output", "loop", "parallel".
   * @returns {string} Hex color code associated with the given node type; returns "#6c757d" for unknown types.
   */
  function getNodeColor(type) {
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
  }

  /**
   * Show a modal dialog to edit the currently active node's name and description.
   *
   * The modal is appended to the document body, binds inputs to the shared editingNode state,
   * and provides Cancel and Save actions. Cancel discards edits and closes the modal.
   * Save applies the changes to the node (via updateNode), clears editing state, closes the modal,
   * and triggers a re-render.
   */
  function showEditModal() {
    // Create modal overlay
    const overlay = createElement('div', {
      style: {
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
      },
    });

    const modal = createElement('div', {
      style: {
        backgroundColor: '#2d2d2d',
        padding: '20px',
        borderRadius: '8px',
        width: '400px',
      },
    });

    const title = createElement(
      'h3',
      {
        style: {
          margin: '0 0 20px 0',
        },
      },
      'Edit Node'
    );

    const nameInput = createElement('input', {
      type: 'text',
      value: editingNode.name,
      style: {
        padding: '8px',
        backgroundColor: '#333',
        border: '1px solid #555',
        borderRadius: '4px',
        color: '#fff',
        width: '100%',
        marginBottom: '10px',
      },
      oninput: e => (editingNode.name = e.target.value),
    });

    const descInput = createElement('textarea', {
      value: editingNode.description,
      style: {
        padding: '8px',
        backgroundColor: '#333',
        border: '1px solid #555',
        borderRadius: '4px',
        color: '#fff',
        width: '100%',
        minHeight: '80px',
        marginBottom: '10px',
      },
      oninput: e => (editingNode.description = e.target.value),
    });

    const buttonContainer = createElement('div', {
      style: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
      },
    });

    const cancelButton = createElement(
      'button',
      {
        style: {
          padding: '8px 16px',
          backgroundColor: '#555',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
        },
        onclick: () => {
          isEditingNode = false;
          editingNode = null;
          overlay.remove();
        },
      },
      'Cancel'
    );

    const saveButton = createElement(
      'button',
      {
        style: {
          padding: '8px 16px',
          backgroundColor: '#007acc',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
        },
        onclick: () => {
          updateNode(editingNode.id, editingNode);
          isEditingNode = false;
          editingNode = null;
          overlay.remove();
          render();
        },
      },
      'Save'
    );

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);

    modal.appendChild(title);
    modal.appendChild(nameInput);
    modal.appendChild(descInput);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
