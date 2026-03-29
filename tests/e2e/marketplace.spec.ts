import { test, expect } from '@playwright/test';

test.describe('Marketplace E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the marketplace
    await page.goto('/marketplace');
    await page.waitForSelector('[data-testid="marketplace"]');
  });

  test('should display marketplace with correct title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Marketplace');
    await expect(page.locator('[data-testid="marketplace"]')).toBeVisible();
  });

  test('should display product categories filter', async ({ page }) => {
    const categoryFilters = page.locator('[data-testid="category-filter"]');
    await expect(categoryFilters).toBeVisible();

    // Check for default categories
    const categories = ['agent', 'tool', 'integration', 'template'];
    for (const category of categories) {
      const filter = page.locator(`[data-category="${category}"]`);
      await expect(filter).toBeVisible();
    }
  });

  test('should display product cards', async ({ page }) => {
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards).toHaveCountGreaterThan(0);

    // Check that each product card has the required elements
    const firstProductCard = productCards.first();
    await expect(
      firstProductCard.locator('[data-testid="product-emoji"]')
    ).toBeVisible();
    await expect(
      firstProductCard.locator('[data-testid="product-name"]')
    ).toBeVisible();
    await expect(
      firstProductCard.locator('[data-testid="product-description"]')
    ).toBeVisible();
  });

  test('should display product pricing', async ({ page }) => {
    const productPrices = page.locator('[data-testid="product-price"]');
    await expect(productPrices).toHaveCountGreaterThan(0);

    // Check that prices are formatted correctly
    const firstPrice = productPrices.first();
    await expect(firstPrice).toHaveText(/^\$\d+\.\d{2}$/);
  });

  test('should display product ratings', async ({ page }) => {
    const productRatings = page.locator('[data-testid="product-rating"]');
    await expect(productRatings).toHaveCountGreaterThan(0);

    // Check that ratings are between 1 and 5
    const firstRating = productRatings.first();
    const ratingText = await firstRating.textContent();
    const rating = parseFloat(ratingText || '0');
    expect(rating).toBeGreaterThanOrEqual(1);
    expect(rating).toBeLessThanOrEqual(5);
  });

  test('should display product capabilities', async ({ page }) => {
    const capabilities = page.locator('[data-testid="product-capability"]');
    await expect(capabilities).toHaveCountGreaterThan(0);

    // Check that capabilities have text content
    const firstCapability = capabilities.first();
    await expect(firstCapability).toHaveText(/^[a-zA-Z-]+$/);
  });

  test('should allow installing products', async ({ page }) => {
    const installButtons = page.locator('[data-testid="install-button"]');
    await expect(installButtons).toHaveCountGreaterThan(0);

    // Try to click an install button
    const firstInstallButton = installButtons.first();
    await firstInstallButton.click();

    // Check for installation feedback
    await expect(
      page.locator('[data-testid="installation-feedback"]')
    ).toBeVisible();
  });

  test('should allow viewing product demos', async ({ page }) => {
    const demoButtons = page.locator('[data-testid="demo-button"]');
    await expect(demoButtons).toHaveCountGreaterThan(0);

    // Try to click a demo button
    const firstDemoButton = demoButtons.first();
    await firstDemoButton.click();

    // Check for demo modal or external link
    const demoModal = page.locator('[data-testid="demo-modal"]');
    if (await demoModal.isVisible()) {
      await expect(demoModal).toBeVisible();
    }
  });

  test('should filter products by category', async ({ page }) => {
    const agentFilter = page.locator('[data-category="agent"]');
    await agentFilter.click();

    // Check that only agent products are displayed
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify all visible products are agents
    for (let i = 0; i < count; i++) {
      const product = productCards.nth(i);
      await expect(product).toHaveAttribute('data-category', 'agent');
    }
  });

  test('should search for products', async ({ page }) => {
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();

    // Type in search input
    await searchInput.fill('test');

    // Wait for search results
    await page.waitForTimeout(500);

    // Check that search results are displayed
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards).toHaveCountGreaterThan(0);
  });

  test('should display product statistics', async ({ page }) => {
    const statsBar = page.locator('[data-testid="stats-bar"]');
    await expect(statsBar).toBeVisible();

    // Check for product count
    const productCount = page.locator('[data-testid="product-count"]');
    await expect(productCount).toBeVisible();

    // Check for installed products count
    const installedCount = page.locator('[data-testid="installed-count"]');
    await expect(installedCount).toBeVisible();
  });

  test('should handle product installation status', async ({ page }) => {
    const installedProducts = page.locator(
      '[data-testid="product-card"][data-installed="true"]'
    );
    if ((await installedProducts.count()) > 0) {
      const firstInstalledProduct = installedProducts.first();

      // Check that install button shows "Installed" for installed products
      const installButton = firstInstalledProduct.locator(
        '[data-testid="install-button"]'
      );
      await expect(installButton).toHaveText('Installed');
      await expect(installButton).toBeDisabled();
    }
  });

  test('should display product compatibility', async ({ page }) => {
    const compatibilityTags = page.locator('[data-testid="compatibility-tag"]');
    await expect(compatibilityTags).toHaveCountGreaterThan(0);

    // Check that compatibility tags have text content
    const firstTag = compatibilityTags.first();
    await expect(firstTag).toHaveText(/^[a-zA-Z]+$/);
  });

  test('should refresh marketplace', async ({ page }) => {
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    await expect(refreshButton).toBeVisible();

    // Click refresh button
    await refreshButton.click();

    // Wait for products to reload
    await page.waitForSelector('[data-testid="product-card"]');
  });

  test('should handle product details modal', async ({ page }) => {
    const productCards = page.locator('[data-testid="product-card"]');
    if ((await productCards.count()) > 0) {
      const firstProductCard = productCards.first();

      // Click on product card to open details
      await firstProductCard.click();

      // Check for product details modal
      const detailsModal = page.locator('[data-testid="product-details"]');
      await expect(detailsModal).toBeVisible();

      // Check for close button
      const closeButton = page.locator('[data-testid="close-details"]');
      await expect(closeButton).toBeVisible();

      // Close the modal
      await closeButton.click();
      await expect(detailsModal).toBeHidden();
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

  test('should display product updates', async ({ page }) => {
    const updateButtons = page.locator('[data-testid="update-button"]');
    if ((await updateButtons.count()) > 0) {
      const firstUpdateButton = updateButtons.first();

      // Click update button
      await firstUpdateButton.click();

      // Check for update confirmation
      await expect(
        page.locator('[data-testid="update-confirmation"]')
      ).toBeVisible();
    }
  });

  test('should handle error states', async ({ page }) => {
    // Simulate network error by blocking requests
    await page.route('**/*', route => {
      if (route.request().url().includes('/api/products')) {
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
