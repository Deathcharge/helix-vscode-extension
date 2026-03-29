import { test, expect } from '@playwright/test';

test.describe('Agent Panel E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the agent panel
    await page.goto('/agent-panel');
    await page.waitForSelector('[data-testid="agent-panel"]');
  });

  test('should display agent panel with correct title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Agent Panel');
    await expect(page.locator('[data-testid="agent-panel"]')).toBeVisible();
  });

  test('should display agent cards', async ({ page }) => {
    const agentCards = page.locator('[data-testid="agent-card"]');
    await expect(agentCards).toHaveCountGreaterThan(0);

    // Check that each agent card has the required elements
    const firstAgentCard = agentCards.first();
    await expect(
      firstAgentCard.locator('[data-testid="agent-emoji"]')
    ).toBeVisible();
    await expect(
      firstAgentCard.locator('[data-testid="agent-name"]')
    ).toBeVisible();
    await expect(
      firstAgentCard.locator('[data-testid="agent-role"]')
    ).toBeVisible();
  });

  test('should show agent status indicators', async ({ page }) => {
    const statusIndicators = page.locator('[data-testid="status-indicator"]');
    await expect(statusIndicators).toBeVisible();

    // Check for online/offline status
    const statusDots = page.locator('[data-testid="status-dot"]');
    await expect(statusDots).toHaveCountGreaterThan(0);
  });

  test('should display agent capabilities', async ({ page }) => {
    const capabilities = page.locator('[data-testid="capability-tag"]');
    await expect(capabilities).toHaveCountGreaterThan(0);

    // Check that capabilities have text content
    const firstCapability = capabilities.first();
    await expect(firstCapability).toHaveText(/^[a-zA-Z-]+$/);
  });

  test('should display coordination metrics', async ({ page }) => {
    const coordinationMetrics = page.locator(
      '[data-testid="coordination-metric"]'
    );
    await expect(coordinationMetrics).toHaveCountGreaterThan(0);

    // Check that metrics have values
    const metricValues = page.locator('[data-testid="metric-value"]');
    await expect(metricValues).toHaveCountGreaterThan(0);
  });

  test('should allow connecting to agents', async ({ page }) => {
    const connectButtons = page.locator('[data-testid="connect-button"]');
    await expect(connectButtons).toHaveCountGreaterThan(0);

    // Try to click a connect button (if agent is online)
    const onlineAgents = page.locator(
      '[data-testid="agent-card"][data-status="online"]'
    );
    if ((await onlineAgents.count()) > 0) {
      const firstOnlineAgent = onlineAgents.first();
      await firstOnlineAgent.locator('[data-testid="connect-button"]').click();

      // Check for success message or connection indicator
      await expect(
        page.locator('[data-testid="connection-status"]')
      ).toBeVisible();
    }
  });

  test('should allow analyzing code', async ({ page }) => {
    const analyzeButton = page.locator('[data-testid="analyze-code-button"]');
    await expect(analyzeButton).toBeVisible();

    // Click analyze button
    await analyzeButton.click();

    // Check for analysis results or loading indicator
    await expect(
      page.locator('[data-testid="analysis-results"]')
    ).toBeVisible();
  });

  test('should refresh agent list', async ({ page }) => {
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    await expect(refreshButton).toBeVisible();

    // Click refresh button
    await refreshButton.click();

    // Wait for agents to reload
    await page.waitForSelector('[data-testid="agent-card"]');
  });

  test('should display agent statistics', async ({ page }) => {
    const statsBar = page.locator('[data-testid="stats-bar"]');
    await expect(statsBar).toBeVisible();

    // Check for connected agents count
    const connectedCount = page.locator('[data-testid="connected-count"]');
    await expect(connectedCount).toBeVisible();

    // Check for total agents count
    const totalCount = page.locator('[data-testid="total-count"]');
    await expect(totalCount).toBeVisible();
  });

  test('should handle agent offline state', async ({ page }) => {
    const offlineAgents = page.locator(
      '[data-testid="agent-card"][data-status="offline"]'
    );
    if ((await offlineAgents.count()) > 0) {
      const firstOfflineAgent = offlineAgents.first();

      // Check that connect button is disabled for offline agents
      const connectButton = firstOfflineAgent.locator(
        '[data-testid="connect-button"]'
      );
      await expect(connectButton).toBeDisabled();

      // Check for offline status indicator
      const statusDot = firstOfflineAgent.locator('[data-testid="status-dot"]');
      await expect(statusDot).toHaveCSS(
        'background-color',
        'rgb(102, 102, 102)'
      );
    }
  });

  test('should display agent details on hover', async ({ page }) => {
    const firstAgentCard = page.locator('[data-testid="agent-card"]').first();

    // Hover over agent card
    await firstAgentCard.hover();

    // Check for tooltip or expanded details
    const tooltip = page.locator('[data-testid="agent-tooltip"]');
    if (await tooltip.isVisible()) {
      await expect(tooltip).toBeVisible();
    }
  });

  test('should handle quick actions', async ({ page }) => {
    const quickActions = page.locator('[data-testid="quick-action"]');
    await expect(quickActions).toHaveCountGreaterThan(0);

    // Test each quick action
    const actionCount = await quickActions.count();
    for (let i = 0; i < actionCount; i++) {
      const action = quickActions.nth(i);
      await action.click();

      // Check for action feedback
      await expect(
        page.locator('[data-testid="action-feedback"]')
      ).toBeVisible();
    }
  });
});
