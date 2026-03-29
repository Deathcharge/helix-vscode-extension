import * as vscode from 'vscode';
import {
  Product,
  ProductCategory,
  ProductStatus,
  ProductInstallationStatus,
} from '../types/marketplace';

export interface MarketplaceState {
  products: Product[];
  installedProducts: Map<string, Product>;
  purchaseHistory: Map<string, PurchaseRecord>;
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export interface PurchaseRecord {
  productId: string;
  purchaseDate: Date;
  price: number;
  licenseKey?: string;
  installationStatus: ProductInstallationStatus;
}

export class MarketplaceStore {
  private state: MarketplaceState;
  private context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.state = {
      products: [],
      installedProducts: new Map(),
      purchaseHistory: new Map(),
      lastUpdated: new Date(0),
      isLoading: false,
      error: null,
    };
    this.loadState();
  }

  /**
   * Gets all products
   */
  getProducts(): Product[] {
    return [...this.state.products];
  }

  /**
   * Gets products by category
   */
  getProductsByCategory(category: ProductCategory): Product[] {
    return this.state.products.filter(p => p.category === category);
  }

  /**
   * Gets installed products
   */
  getInstalledProducts(): Product[] {
    return Array.from(this.state.installedProducts.values());
  }

  /**
   * Gets enabled products
   */
  getEnabledProducts(): Product[] {
    return this.getInstalledProducts().filter(p => p.status === 'enabled');
  }

  /**
   * Gets product by ID
   */
  getProduct(id: string): Product | undefined {
    return this.state.products.find(p => p.id === id);
  }

  /**
   * Gets installed product by ID
   */
  getInstalledProduct(id: string): Product | undefined {
    return this.state.installedProducts.get(id);
  }

  /**
   * Checks if product is installed
   */
  isInstalled(productId: string): boolean {
    return this.state.installedProducts.has(productId);
  }

  /**
   * Checks if product is enabled
   */
  isEnabled(productId: string): boolean {
    const product = this.state.installedProducts.get(productId);
    return product ? product.status === 'enabled' : false;
  }

  /**
   * Gets product statistics
   */
  getProductStatistics(): {
    total: number;
    installed: number;
    enabled: number;
    disabled: number;
    byCategory: Record<ProductCategory, number>;
  } {
    const installed = this.getInstalledProducts();
    const enabled = installed.filter(p => p.status === 'enabled');
    const disabled = installed.filter(p => p.status === 'disabled');

    const byCategory: Record<ProductCategory, number> = {
      agent: 0,
      tool: 0,
      integration: 0,
      template: 0,
    };

    installed.forEach(product => {
      byCategory[product.category]++;
    });

    return {
      total: this.state.products.length,
      installed: installed.length,
      enabled: enabled.length,
      disabled: disabled.length,
      byCategory,
    };
  }

  /**
   * Gets purchase history
   */
  getPurchaseHistory(): PurchaseRecord[] {
    return Array.from(this.state.purchaseHistory.values());
  }

  /**
   * Gets state
   */
  getState(): MarketplaceState {
    return { ...this.state };
  }

  /**
   * Browses products
   */
  async browseProducts(category?: ProductCategory): Promise<Product[]> {
    this.setState({ isLoading: true, error: null });

    try {
      // Simulate API call
      await this.delay(1000);

      const products = this.generateMockProducts();
      const filteredProducts = category
        ? products.filter(p => p.category === category)
        : products;

      this.setState({
        products: filteredProducts,
        lastUpdated: new Date(),
        isLoading: false,
      });

      return filteredProducts;
    } catch (error) {
      this.setState({
        error:
          error instanceof Error ? error.message : 'Failed to browse products',
        isLoading: false,
      });
      throw error;
    }
  }

  /**
   * Installs a product
   */
  async installProduct(productId: string): Promise<void> {
    const product = this.getProduct(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (this.isInstalled(productId)) {
      throw new Error('Product already installed');
    }

    // Check dependencies
    const missingDeps = this.checkDependencies(product.dependencies);
    if (missingDeps.length > 0) {
      throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
    }

    try {
      // Simulate installation
      await this.delay(2000);

      const installedProduct = {
        ...product,
        status: 'enabled' as ProductStatus,
        installedAt: new Date(),
        lastUpdated: new Date(),
      };

      this.state.installedProducts.set(productId, installedProduct);
      this.state.purchaseHistory.set(productId, {
        productId,
        purchaseDate: new Date(),
        price: product.price,
        installationStatus: 'installed',
      });

      this.setState({ lastUpdated: new Date() });
      this.saveState();

      vscode.window.showInformationMessage(
        `Successfully installed ${product.name}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Installation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Uninstalls a product
   */
  async uninstallProduct(productId: string): Promise<void> {
    const product = this.getInstalledProduct(productId);
    if (!product) {
      throw new Error('Product not installed');
    }

    // Check if product is in use
    const dependents = this.getDependents(productId);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall ${product.name}: used by ${dependents.join(', ')}`
      );
    }

    try {
      // Simulate uninstallation
      await this.delay(1000);

      this.state.installedProducts.delete(productId);
      this.setState({ lastUpdated: new Date() });
      this.saveState();

      vscode.window.showInformationMessage(
        `Successfully uninstalled ${product.name}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Uninstallation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Enables a product
   */
  async enableProduct(productId: string): Promise<void> {
    const product = this.getInstalledProduct(productId);
    if (!product) {
      throw new Error('Product not installed');
    }

    product.status = 'enabled';
    product.updatedAt = new Date();
    this.setState({ lastUpdated: new Date() });
    this.saveState();

    vscode.window.showInformationMessage(`Enabled ${product.name}`);
  }

  /**
   * Disables a product
   */
  async disableProduct(productId: string): Promise<void> {
    const product = this.getInstalledProduct(productId);
    if (!product) {
      throw new Error('Product not installed');
    }

    product.status = 'disabled';
    product.updatedAt = new Date();
    this.setState({ lastUpdated: new Date() });
    this.saveState();

    vscode.window.showInformationMessage(`Disabled ${product.name}`);
  }

  /**
   * Updates a product
   */
  async updateProduct(productId: string): Promise<void> {
    const product = this.getInstalledProduct(productId);
    if (!product) {
      throw new Error('Product not installed');
    }

    try {
      // Simulate update check
      await this.delay(1000);

      const mockUpdate = this.generateMockUpdate(productId);
      if (!mockUpdate) {
        vscode.window.showInformationMessage('No updates available');
        return;
      }

      // Simulate update
      await this.delay(2000);

      product.version = mockUpdate.newVersion;
      product.updatedAt = new Date();
      this.setState({ lastUpdated: new Date() });
      this.saveState();

      vscode.window.showInformationMessage(
        `Updated ${product.name} to version ${mockUpdate.newVersion}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Update failed: ${error}`);
      throw error;
    }
  }

  /**
   * Checks for updates
   */
  async checkForUpdates(): Promise<
    Array<{
      productId: string;
      productName: string;
      currentVersion: string;
      newVersion: string;
      description: string;
      changelog: string[];
      breakingChanges: boolean;
    }>
  > {
    const installedProducts = this.getInstalledProducts();
    const updates: Array<{
      productId: string;
      productName: string;
      currentVersion: string;
      newVersion: string;
      description: string;
      changelog: string[];
      breakingChanges: boolean;
    }> = [];

    for (const product of installedProducts) {
      const update = this.generateMockUpdate(product.id);
      if (update) {
        updates.push(update);
      }
    }

    return updates;
  }

  /**
   * Gets dependents of a product
   */
  getDependents(productId: string): string[] {
    const dependents: string[] = [];

    this.state.installedProducts.forEach((product, id) => {
      if (product.dependencies.includes(productId)) {
        dependents.push(product.name);
      }
    });

    return dependents;
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.state = {
      products: [],
      installedProducts: new Map(),
      purchaseHistory: new Map(),
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
        this.state = parsed.state;
      }
    } catch (error) {
      console.error('Failed to import marketplace data:', error);
    }
  }

  async initialize(): Promise<void> {
    // Initialize marketplace store
    this.loadState();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }

  private setState(partialState: Partial<MarketplaceState>): void {
    this.state = { ...this.state, ...partialState };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private checkDependencies(dependencies: string[]): string[] {
    const missing: string[] = [];

    dependencies.forEach(depId => {
      if (!this.isInstalled(depId)) {
        const product = this.getProduct(depId);
        if (product) {
          missing.push(product.name);
        } else {
          missing.push(depId);
        }
      }
    });

    return missing;
  }

  private generateMockProducts(): Product[] {
    return [
      {
        id: 'agent-code-analyzer-pro',
        name: 'Code Analyzer Pro',
        description: 'Advanced static code analysis with AI-powered insights',
        category: 'agent',
        price: 29.99,
        rating: 4.8,
        downloads: 1542,
        capabilities: ['code-analysis', 'refactoring', 'documentation'],
        compatibility: ['typescript', 'javascript', 'python', 'rust'],
        version: '1.0.0',
        thumbnail: '🔍',
        demoUrl: 'https://example.com/demo',
        status: 'available',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        license: 'commercial',
        author: 'Helix Team',
        tags: ['analysis', 'ai', 'code-quality'],
        dependencies: [],
      },
      {
        id: 'test-suite-generator',
        name: 'Test Suite Generator',
        description:
          'Automatically generate comprehensive test suites for your code',
        category: 'agent',
        price: 19.99,
        rating: 4.6,
        downloads: 891,
        capabilities: [
          'test-generation',
          'coverage-analysis',
          'mock-generation',
        ],
        compatibility: ['typescript', 'javascript', 'python', 'java'],
        version: '1.0.0',
        thumbnail: '🧪',
        demoUrl: 'https://example.com/demo',
        status: 'available',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10'),
        license: 'commercial',
        author: 'Helix Team',
        tags: ['testing', 'automation', 'coverage'],
        dependencies: [],
      },
      {
        id: 'security-audit-suite',
        name: 'Security Audit Suite',
        description: 'Complete security analysis and vulnerability detection',
        category: 'agent',
        price: 39.99,
        rating: 4.9,
        downloads: 654,
        capabilities: [
          'security-scanning',
          'vulnerability-detection',
          'best-practices',
        ],
        compatibility: ['all-languages'],
        version: '1.0.0',
        thumbnail: '🔒',
        demoUrl: 'https://example.com/demo',
        status: 'available',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
        license: 'commercial',
        author: 'Helix Team',
        tags: ['security', 'vulnerability', 'compliance'],
        dependencies: [],
      },
      {
        id: 'performance-optimizer',
        name: 'Performance Optimizer',
        description: 'Optimize your code for better performance and efficiency',
        category: 'tool',
        price: 24.99,
        rating: 4.4,
        downloads: 1234,
        capabilities: ['performance-analysis', 'optimization', 'memory-usage'],
        compatibility: ['typescript', 'javascript', 'python', 'rust'],
        version: '1.0.0',
        thumbnail: '⚡',
        demoUrl: 'https://example.com/demo',
        status: 'available',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
        license: 'commercial',
        author: 'Helix Team',
        tags: ['performance', 'optimization', 'memory'],
        dependencies: [],
      },
    ];
  }

  private generateMockUpdate(productId: string): {
    productId: string;
    productName: string;
    currentVersion: string;
    newVersion: string;
    description: string;
    changelog: string[];
    breakingChanges: boolean;
  } | null {
    const product = this.getInstalledProduct(productId);
    if (!product) return null;

    // Simulate 50% chance of update
    if (Math.random() > 0.5) {
      return {
        productId,
        productName: product.name,
        currentVersion: product.version,
        newVersion: this.incrementVersion(product.version),
        description:
          'Updated to latest version with bug fixes and improvements',
        changelog: [
          'Fixed critical security vulnerability',
          'Improved performance by 20%',
          'Added new features',
          'Updated dependencies',
        ],
        breakingChanges: Math.random() > 0.8,
      };
    }

    return null;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
  }

  private loadState(): void {
    try {
      const data = this.context.globalState.get<string>('marketplace.state');
      if (data) {
        const parsed = JSON.parse(data);
        this.state = {
          ...this.state,
          ...parsed,
          installedProducts: new Map(parsed.installedProducts || []),
          purchaseHistory: new Map(parsed.purchaseHistory || []),
        };
      }
    } catch (error) {
      console.error('Failed to load marketplace state:', error);
    }
  }

  private saveState(): void {
    try {
      const data = JSON.stringify({
        ...this.state,
        installedProducts: Array.from(this.state.installedProducts.entries()),
        purchaseHistory: Array.from(this.state.purchaseHistory.entries()),
      });
      this.context.globalState.update('marketplace.state', data);
    } catch (error) {
      console.error('Failed to save marketplace state:', error);
    }
  }
}
