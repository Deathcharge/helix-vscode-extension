import { test, expect } from '@playwright/test';

test.describe('Spiral Builder E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the spiral builder
    await page.goto('/spiral-builder');
    await page.waitForSelector('[data-testid="spiral-builder"]');
  });

  test('should display spiral builder with correct title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Spiral Builder');
    await expect(page.locator('[data-testid="spiral-builder"]')).toBeVisible();
  });

  test('should display node types toolbar', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    await expect(toolbar).toBeVisible();

    // Check for node type buttons
    const nodeTypes = [
      'agent',
      'condition',
      'action',
      'input',
      'output',
      'loop',
      'parallel',
    ];
    for (const type of nodeTypes) {
      const nodeButton = page.locator(`[data-node-type="${type}"]`);
      await expect(nodeButton).toBeVisible();
    }
  });

  test('should allow adding nodes to canvas', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    await expect(canvas).toBeVisible();

    // Click on a node type to add it to canvas
    const agentButton = page.locator('[data-node-type="agent"]');
    await agentButton.click();

    // Check that node was added to canvas
    const nodes = page.locator('[data-testid="node"]');
    await expect(nodes).toHaveCountGreaterThan(0);
  });

  test('should display node properties panel', async ({ page }) => {
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).toBeVisible();

    // Check for property fields
    const nameField = page.locator('[data-testid="property-name"]');
    const descriptionField = page.locator(
      '[data-testid="property-description"]'
    );
    const typeField = page.locator('[data-testid="property-type"]');

    await expect(nameField).toBeVisible();
    await expect(descriptionField).toBeVisible();
    await expect(typeField).toBeVisible();
  });

  test('should allow connecting nodes', async ({ page }) => {
    // Add two nodes first
    const agentButton = page.locator('[data-node-type="agent"]');
    await agentButton.click();
    await agentButton.click();

    // Wait for nodes to be added
    await page.waitForTimeout(500);

    const nodes = page.locator('[data-testid="node"]');
    expect(await nodes.count()).toBe(2);

    // Try to connect nodes
    const firstNode = nodes.first();
    const connectButton = firstNode.locator('[data-testid="connect-button"]');
    await connectButton.click();

    // Click on second node to complete connection
    const secondNode = nodes.last();
    await secondNode.click();

    // Check for connection line
    const connections = page.locator('[data-testid="connection"]');
    await expect(connections).toHaveCountGreaterThan(0);
  });

  test('should validate workflow connections', async ({ page }) => {
    // Add nodes and create a cycle
    const agentButton = page.locator('[data-node-type="agent"]');
    await agentButton.click();
    await agentButton.click();

    await page.waitForTimeout(500);

    // Create connection from node 1 to node 2
    const nodes = page.locator('[data-testid="node"]');
    const firstNode = nodes.first();
    const connectButton = firstNode.locator('[data-testid="connect-button"]');
    await connectButton.click();

    const secondNode = nodes.last();
    await secondNode.click();

    // Try to create cycle (node 2 to node 1)
    const secondNodeConnect = secondNode.locator(
      '[data-testid="connect-button"]'
    );
    await secondNodeConnect.click();
    await firstNode.click();

    // Check for cycle detection warning
    const cycleWarning = page.locator('[data-testid="cycle-warning"]');
    await expect(cycleWarning).toBeVisible();
  });

  test('should allow editing node properties', async ({ page }) => {
    // Add a node
    const agentButton = page.locator('[data-node-type="agent"]');
    await agentButton.click();

    await page.waitForTimeout(500);

    // Select the node
    const node = page.locator('[data-testid="node"]').first();
    await node.click();

    // Edit properties
    const nameField = page.locator('[data-testid="property-name"]');
    await nameField.fill('Test Node');

    const descriptionField = page.locator(
      '[data-testid="property-description"]'
    );
    await descriptionField.fill('This is a test node');

    // Check that properties were updated
    await expect(nameField).toHaveValue('Test Node');
    await expect(descriptionField).toHaveValue('This is a test node');
  });

  test('should allow deleting nodes', async ({ page }) => {
    // Add a node
    const agentButton = page.locator('[data-node-type="agent"]');
    await agentButton.click();

    await page.waitForTimeout(500);

    // Delete the node
    const node = page.locator('[data-testid="node"]').first();
    const deleteButton = node.locator('[data-testid="delete-button"]');
    await deleteButton.click();

    // Check that node was removed
    const nodes = page.locator('[data-testid="node"]');
    await expect(nodes).toHaveCount(0);
  });

  test('should display workflow statistics', async ({ page }) => {
    const statsPanel = page.locator('[data-testid="stats-panel"]');
    await expect(statsPanel).toBeVisible();

    // Check for statistics
    const nodeCount = page.locator('[data-testid="node-count"]');
    const connectionCount = page.locator('[data-testid="connection-count"]');
    const status = page.locator('[data-testid="workflow-status"]');

    await expect(nodeCount).toBeVisible();
    await expect(connectionCount).toBeVisible();
    await expect(status).toBeVisible();
  });

  test('should allow saving workflows', async ({ page }) => {
    const saveButton = page.locator('[data-testid="save-button"]');
    await expect(saveButton).toBeVisible();

    // Click save button
    await saveButton.click();

    // Check for save confirmation
    const saveConfirmation = page.locator('[data-testid="save-confirmation"]');
    await expect(saveConfirmation).toBeVisible();
  });

  test('should allow loading workflows', async ({ page }) => {
    const loadButton = page.locator('[data-testid="load-button"]');
    await expect(loadButton).toBeVisible();

    // Click load button
    await loadButton.click();

    // Check for load dialog
    const loadDialog = page.locator('[data-testid="load-dialog"]');
    await expect(loadDialog).toBeVisible();
  });

  test('should validate workflow before execution', async ({ page }) => {
    const validateButton = page.locator('[data-testid="validate-button"]');
    await expect(validateButton).toBeVisible();

    // Click validate button
    await validateButton.click();

    // Check for validation results
    const validationResults = page.locator(
      '[data-testid="validation-results"]'
    );
    await expect(validationResults).toBeVisible();
  });

  test('should handle node drag and drop', async ({ page }) => {
    // Add a node
    const agentButton = page.locator('[data-node-type="agent"]');
    await agentButton.click();

    await page.waitForTimeout(500);

    // Drag the node
    const node = page.locator('[data-testid="node"]').first();
    const initialPosition = await node.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    });

    // Perform drag operation
    await node.hover();
    await page.mouse.down();
    await page.mouse.move(initialPosition.x + 100, initialPosition.y + 100);
    await page.mouse.up();

    // Check that node position changed
    const newPosition = await node.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    });

    expect(newPosition.x).not.toBe(initialPosition.x);
    expect(newPosition.y).not.toBe(initialPosition.y);
  });

  test('should display connection indicators', async ({ page }) => {
    // Add a node and start connection
    const agentButton = page.locator('[data-node-type="agent"]');
    await agentButton.click();

    await page.waitForTimeout(500);

    const node = page.locator('[data-testid="node"]').first();
    const connectButton = node.locator('[data-testid="connect-button"]');
    await connectButton.click();

    // Check for connection indicator
    const connectionIndicator = page.locator(
      '[data-testid="connection-indicator"]'
    );
    await expect(connectionIndicator).toBeVisible();
  });

  test('should handle workflow templates', async ({ page }) => {
    const templateButton = page.locator('[data-testid="template-button"]');
    await expect(templateButton).toBeVisible();

    // Click template button
    await templateButton.click();

    // Check for template selection
    const templateDialog = page.locator('[data-testid="template-dialog"]');
    await expect(templateDialog).toBeVisible();
  });

  test('should export workflow', async ({ page }) => {
    const exportButton = page.locator('[data-testid="export-button"]');
    await expect(exportButton).toBeVisible();

    // Click export button
    await exportButton.click();

    // Check for export options
    const exportDialog = page.locator('[data-testid="export-dialog"]');
    await expect(exportDialog).toBeVisible();
  });

  test('should import workflow', async ({ page }) => {
    const importButton = page.locator('[data-testid="import-button"]');
    await expect(importButton).toBeVisible();

    // Click import button
    await importButton.click();

    // Check for import dialog
    const importDialog = page.locator('[data-testid="import-dialog"]');
    await expect(importDialog).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Simulate network error by blocking requests
    await page.route('**/*', route => {
      if (route.request().url().includes('/api/workflows')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Try to save workflow to trigger error
    const saveButton = page.locator('[data-testid="save-button"]');
    await saveButton.click();

    // Check for error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should display node types with correct colors', async ({ page }) => {
    const nodeTypes = [
      { type: 'agent', color: '#007acc' },
      { type: 'condition', color: '#ffc107' },
      { type: 'action', color: '#28a745' },
      { type: 'input', color: '#6c757d' },
      { type: 'output', color: '#17a2b8' },
      { type: 'loop', color: '#e83e8c' },
      { type: 'parallel', color: '#fd7e14' },
    ];

    for (const nodeType of nodeTypes) {
      const nodeButton = page.locator(`[data-node-type="${nodeType.type}"]`);
      await nodeButton.click();

      await page.waitForTimeout(500);

      const node = page.locator('[data-testid="node"]').last();
      const backgroundColor = await node.evaluate(
        el => window.getComputedStyle(el).backgroundColor
      );

      // Convert hex to rgb for comparison
      const expectedColor = nodeType.color;
      expect(backgroundColor).toContain(expectedColor);
    }
  });

  test('should handle workflow execution', async ({ page }) => {
    // Add nodes and connections to create a valid workflow
    const agentButton = page.locator('[data-node-type="agent"]');
    await agentButton.click();
    await agentButton.click();

    await page.waitForTimeout(500);

    // Connect nodes
    const nodes = page.locator('[data-testid="node"]');
    const firstNode = nodes.first();
    const connectButton = firstNode.locator('[data-testid="connect-button"]');
    await connectButton.click();

    const secondNode = nodes.last();
    await secondNode.click();

    // Execute workflow
    const executeButton = page.locator('[data-testid="execute-button"]');
    await executeButton.click();

    // Check for execution status
    const executionStatus = page.locator('[data-testid="execution-status"]');
    await expect(executionStatus).toBeVisible();
  });
});
