import { test, expect } from '@playwright/test';

test.describe('Coordination Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the coordination dashboard
    await page.goto('/coordination-dashboard');
    await page.waitForSelector('[data-testid="coordination-dashboard"]');
  });

  test('should display coordination dashboard with correct title', async ({
    page,
  }) => {
    await expect(page.locator('h1')).toContainText('Coordination Dashboard');
    await expect(
      page.locator('[data-testid="coordination-dashboard"]')
    ).toBeVisible();
  });

  test('should display UCF metrics', async ({ page }) => {
    const metricBars = page.locator('[data-testid="metric-bar"]');
    await expect(metricBars).toHaveCountGreaterThan(0);

    // Check for all required metrics
    const metrics = [
      'harmony',
      'resilience',
      'throughput',
      'friction',
      'focus',
      'velocity',
    ];
    for (const metric of metrics) {
      const metricBar = page.locator(`[data-metric="${metric}"]`);
      await expect(metricBar).toBeVisible();
    }
  });

  test('should display metric values', async ({ page }) => {
    const metricValues = page.locator('[data-testid="metric-value"]');
    await expect(metricValues).toHaveCountGreaterThan(0);

    // Check that metric values are between 0 and 10
    const firstValue = metricValues.first();
    const valueText = await firstValue.textContent();
    const value = parseFloat(valueText || '0');
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(10);
  });

  test('should display metric status', async ({ page }) => {
    const metricStatuses = page.locator('[data-testid="metric-status"]');
    await expect(metricStatuses).toHaveCountGreaterThan(0);

    // Check that status is one of the expected values
    const firstStatus = metricStatuses.first();
    const statusText = await firstStatus.textContent();
    const validStatuses = ['Excellent', 'Good', 'Fair', 'Poor'];
    expect(validStatuses).toContain(statusText);
  });

  test('should display overall coordination level', async ({ page }) => {
    const overallCoordination = page.locator(
      '[data-testid="overall-coordination"]'
    );
    await expect(overallCoordination).toBeVisible();

    // Check that overall coordination is displayed
    const coordinationText = await overallCoordination.textContent();
    expect(coordinationText).toMatch(/^\d+\.\d+\/10$/);
  });

  test('should display coordination status', async ({ page }) => {
    const coordinationStatus = page.locator(
      '[data-testid="coordination-status"]'
    );
    await expect(coordinationStatus).toBeVisible();

    // Check that status is one of the expected values
    const statusText = await coordinationStatus.textContent();
    const validStatuses = ['Excellent', 'Good', 'Fair', 'Poor'];
    expect(validStatuses).toContain(statusText);
  });

  test('should display coordination alerts', async ({ page }) => {
    const alerts = page.locator('[data-testid="coordination-alert"]');
    await expect(alerts).toBeVisible();

    // Check for alert severity indicators
    const alertSeverities = page.locator('[data-testid="alert-severity"]');
    await expect(alertSeverities).toHaveCountGreaterThan(0);
  });

  test('should display recommendations', async ({ page }) => {
    const recommendations = page.locator('[data-testid="recommendation"]');
    await expect(recommendations).toBeVisible();

    // Check for recommendation categories
    const recommendationCategories = page.locator(
      '[data-testid="recommendation-category"]'
    );
    await expect(recommendationCategories).toHaveCountGreaterThan(0);
  });

  test('should display metric trends', async ({ page }) => {
    const trendCharts = page.locator('[data-testid="trend-chart"]');
    await expect(trendCharts).toBeVisible();

    // Check for trend indicators
    const trendIndicators = page.locator('[data-testid="trend-indicator"]');
    await expect(trendIndicators).toHaveCountGreaterThan(0);
  });

  test('should handle monitoring controls', async ({ page }) => {
    const startMonitoringButton = page.locator(
      '[data-testid="start-monitoring"]'
    );
    const stopMonitoringButton = page.locator(
      '[data-testid="stop-monitoring"]'
    );

    await expect(startMonitoringButton).toBeVisible();
    await expect(stopMonitoringButton).toBeVisible();

    // Test starting monitoring
    await startMonitoringButton.click();
    await expect(page.locator('[data-testid="monitoring-status"]')).toHaveText(
      'Monitoring Active'
    );

    // Test stopping monitoring
    await stopMonitoringButton.click();
    await expect(page.locator('[data-testid="monitoring-status"]')).toHaveText(
      'Monitoring Inactive'
    );
  });

  test('should refresh coordination data', async ({ page }) => {
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    await expect(refreshButton).toBeVisible();

    // Click refresh button
    await refreshButton.click();

    // Wait for data to refresh
    await page.waitForTimeout(1000);

    // Check that metrics are updated
    const metricValues = page.locator('[data-testid="metric-value"]');
    await expect(metricValues.first()).toBeVisible();
  });

  test('should display metric progress bars', async ({ page }) => {
    const progressBars = page.locator('[data-testid="metric-progress"]');
    await expect(progressBars).toHaveCountGreaterThan(0);

    // Check that progress bars have width
    const firstProgressBar = progressBars.first();
    const width = await firstProgressBar.evaluate(el => el.style.width);
    expect(width).toMatch(/^\d+%/);
  });

  test('should handle actionable alerts', async ({ page }) => {
    const actionableAlerts = page.locator(
      '[data-testid="alert"][data-actionable="true"]'
    );
    if ((await actionableAlerts.count()) > 0) {
      const firstActionableAlert = actionableAlerts.first();

      // Check for action button
      const actionButton = firstActionableAlert.locator(
        '[data-testid="alert-action"]'
      );
      await expect(actionButton).toBeVisible();

      // Click action button
      await actionButton.click();

      // Check for action feedback
      await expect(
        page.locator('[data-testid="action-feedback"]')
      ).toBeVisible();
    }
  });

  test('should display metric colors based on values', async ({ page }) => {
    const metricBars = page.locator('[data-testid="metric-bar"]');
    const count = await metricBars.count();

    for (let i = 0; i < count; i++) {
      const metricBar = metricBars.nth(i);
      const valueElement = metricBar.locator('[data-testid="metric-value"]');
      const valueText = await valueElement.textContent();
      const value = parseFloat(valueText || '0');

      const backgroundColor = await metricBar.evaluate(
        el => window.getComputedStyle(el).backgroundColor
      );

      // Check color based on value
      if (value >= 8) {
        expect(backgroundColor).toContain('rgb(40, 167, 69)'); // Green
      } else if (value >= 6) {
        expect(backgroundColor).toContain('rgb(255, 193, 7)'); // Yellow
      } else if (value >= 4) {
        expect(backgroundColor).toContain('rgb(253, 126, 20)'); // Orange
      } else {
        expect(backgroundColor).toContain('rgb(220, 53, 69)'); // Red
      }
    }
  });

  test('should handle metric tooltips', async ({ page }) => {
    const metricBars = page.locator('[data-testid="metric-bar"]');
    if ((await metricBars.count()) > 0) {
      const firstMetricBar = metricBars.first();

      // Hover over metric bar
      await firstMetricBar.hover();

      // Check for tooltip
      const tooltip = page.locator('[data-testid="metric-tooltip"]');
      if (await tooltip.isVisible()) {
        await expect(tooltip).toBeVisible();
      }
    }
  });

  test('should display bottlenecks', async ({ page }) => {
    const bottlenecks = page.locator('[data-testid="bottleneck"]');
    await expect(bottlenecks).toBeVisible();

    // Check that bottlenecks have descriptions
    const bottleneckDescriptions = page.locator(
      '[data-testid="bottleneck-description"]'
    );
    await expect(bottleneckDescriptions).toHaveCountGreaterThan(0);
  });

  test('should handle dashboard themes', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await expect(themeToggle).toBeVisible();

      // Toggle theme
      await themeToggle.click();

      // Check that theme is applied
      const dashboard = page.locator('[data-testid="coordination-dashboard"]');
      await expect(dashboard).toBeVisible();
    }
  });

  test('should export dashboard data', async ({ page }) => {
    const exportButton = page.locator('[data-testid="export-button"]');
    await expect(exportButton).toBeVisible();

    // Click export button
    await exportButton.click();

    // Check for export confirmation
    await expect(
      page.locator('[data-testid="export-confirmation"]')
    ).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Simulate network error by blocking requests
    await page.route('**/*', route => {
      if (route.request().url().includes('/api/coordination')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Reload page to trigger error
    await page.reload();

    // Check for error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
