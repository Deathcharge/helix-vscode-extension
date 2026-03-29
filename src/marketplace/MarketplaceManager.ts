/**
 * Helix VS Code Extension - Marketplace Manager
 * Enhanced marketplace for utilities and extensions
 */

import * as vscode from 'vscode';

export interface PackageMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  license: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
}

export interface InstalledPackage extends PackageMetadata {
  installedPath: string;
  installDate: Date;
  lastUpdated: Date;
  enabled: boolean;
}

export interface AvailablePackage extends PackageMetadata {
  downloads: number;
  rating: number;
  latestVersion: string;
  updateAvailable: boolean;
}

export class MarketplaceManager {
  private static instance: MarketplaceManager;
  private context: vscode.ExtensionContext;
  private installedPackages: Map<string, InstalledPackage>;
  private availablePackages: Map<string, AvailablePackage>;
  private eventEmitter: vscode.EventEmitter<InstalledPackage[]> =
    new vscode.EventEmitter<InstalledPackage[]>();

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.installedPackages = new Map();
    this.availablePackages = new Map();

    this.loadInstalledPackages();
    this.loadAvailablePackages();
  }

  public static getInstance(
    context?: vscode.ExtensionContext
  ): MarketplaceManager {
    if (!MarketplaceManager.instance) {
      if (!context) {
        throw new Error(
          'MarketplaceManager requires ExtensionContext on first initialization'
        );
      }
      MarketplaceManager.instance = new MarketplaceManager(context);
    }
    return MarketplaceManager.instance;
  }

  /**
   * Load installed packages from storage
   */
  private loadInstalledPackages(): void {
    try {
      const storageKey = 'installedPackages';
      const stored =
        this.context.globalState.get<InstalledPackage[]>(storageKey);
      if (stored) {
        stored.forEach(pkg => this.installedPackages.set(pkg.id, pkg));
      }
    } catch (error) {
      console.error('Failed to load installed packages:', error);
    }
  }

  /**
   * Save installed packages to storage
   */
  private saveInstalledPackages(): void {
    try {
      const storageKey = 'installedPackages';
      const packages = Array.from(this.installedPackages.values());
      this.context.globalState.update(storageKey, packages);
      this.eventEmitter.fire(packages);
    } catch (error) {
      console.error('Failed to save installed packages:', error);
    }
  }

  /**
   * Load available packages from marketplace
   */
  private async loadAvailablePackages(): Promise<void> {
    // In a real implementation, this would fetch from a marketplace API
    // For now, we'll use sample packages
    const samplePackages: AvailablePackage[] = [
      {
        id: 'helix-python-analyzer',
        name: 'Python Code Analyzer',
        version: '1.2.0',
        latestVersion: '1.2.0',
        description:
          'Advanced Python code analysis with Pylint and MyPy integration',
        author: 'Helix Team',
        category: 'Analysis',
        license: 'MIT',
        homepage: 'https://github.com/helix/python-analyzer',
        repository: 'https://github.com/helix/python-analyzer',
        keywords: ['python', 'analysis', 'linting'],
        downloads: 12543,
        rating: 4.7,
        updateAvailable: false,
      },
      {
        id: 'helix-test-generator',
        name: 'Test Generator',
        version: '1.0.5',
        latestVersion: '1.1.0',
        description: 'Generate comprehensive unit tests from code using AI',
        author: 'Helix Team',
        category: 'Testing',
        license: 'Apache-2.0',
        homepage: 'https://github.com/helix/test-generator',
        repository: 'https://github.com/helix/test-generator',
        keywords: ['testing', 'unittest', 'pytest'],
        downloads: 8976,
        rating: 4.5,
        updateAvailable: true,
      },
      {
        id: 'helix-doc-generator',
        name: 'Documentation Generator',
        version: '1.3.2',
        latestVersion: '1.3.2',
        description: 'Auto-generate API documentation from code comments',
        author: 'Helix Team',
        category: 'Documentation',
        license: 'MIT',
        keywords: ['documentation', 'api', 'docs'],
        downloads: 15234,
        rating: 4.8,
        updateAvailable: false,
      },
      {
        id: 'helix-security-scanner',
        name: 'Security Scanner',
        version: '1.1.0',
        latestVersion: '1.1.0',
        description:
          'Scan code for security vulnerabilities and best practices',
        author: 'Helix Team',
        category: 'Security',
        license: 'GPL-3.0',
        keywords: ['security', 'vulnerability', 'scan'],
        downloads: 6789,
        rating: 4.6,
        updateAvailable: false,
      },
      {
        id: 'helix-performance-profiler',
        name: 'Performance Profiler',
        version: '1.0.8',
        latestVersion: '1.0.9',
        description: 'Profile code performance and identify bottlenecks',
        author: 'Helix Team',
        category: 'Performance',
        license: 'MIT',
        keywords: ['performance', 'profiling', 'optimization'],
        downloads: 9432,
        rating: 4.4,
        updateAvailable: true,
      },
    ];

    samplePackages.forEach(pkg => this.availablePackages.set(pkg.id, pkg));
  }

  /**
   * Get all installed packages
   */
  public getInstalledPackages(): InstalledPackage[] {
    return Array.from(this.installedPackages.values());
  }

  /**
   * Get installed package by ID
   */
  public getInstalledPackage(id: string): InstalledPackage | undefined {
    return this.installedPackages.get(id);
  }

  /**
   * Get all available packages
   */
  public getAvailablePackages(): AvailablePackage[] {
    return Array.from(this.availablePackages.values());
  }

  /**
   * Get available package by ID
   */
  public getAvailablePackage(id: string): AvailablePackage | undefined {
    return this.availablePackages.get(id);
  }

  /**
   * Search available packages
   */
  public searchPackages(query: string): AvailablePackage[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.availablePackages.values()).filter(
      pkg =>
        pkg.name.toLowerCase().includes(lowerQuery) ||
        pkg.description.toLowerCase().includes(lowerQuery) ||
        pkg.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
        pkg.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get packages by category
   */
  public getPackagesByCategory(category: string): AvailablePackage[] {
    return Array.from(this.availablePackages.values()).filter(
      pkg => pkg.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Get categories
   */
  public getCategories(): string[] {
    const categories = new Set(
      Array.from(this.availablePackages.values()).map(pkg => pkg.category)
    );
    return Array.from(categories).sort();
  }

  /**
   * Install package
   */
  public async installPackage(id: string): Promise<boolean> {
    const available = this.availablePackages.get(id);
    if (!available) {
      vscode.window.showErrorMessage(
        `Package "${id}" not found in marketplace`
      );
      return false;
    }

    // Check if already installed
    if (this.installedPackages.has(id)) {
      vscode.window.showWarningMessage(
        `Package "${available.name}" is already installed`
      );
      return false;
    }

    // Install package
    const installed: InstalledPackage = {
      ...available,
      installedPath: '', // Would be set by actual installer
      installDate: new Date(),
      lastUpdated: new Date(),
      enabled: true,
    };

    this.installedPackages.set(id, installed);
    this.saveInstalledPackages();

    vscode.window.showInformationMessage(
      `Successfully installed ${available.name}`
    );
    return true;
  }

  /**
   * Uninstall package
   */
  public async uninstallPackage(id: string): Promise<boolean> {
    const installed = this.installedPackages.get(id);
    if (!installed) {
      vscode.window.showErrorMessage(`Package "${id}" is not installed`);
      return false;
    }

    const result = await vscode.window.showWarningMessage(
      `Are you sure you want to uninstall ${installed.name}?`,
      'Uninstall',
      'Cancel'
    );

    if (result === 'Uninstall') {
      this.installedPackages.delete(id);
      this.saveInstalledPackages();
      vscode.window.showInformationMessage(
        `Successfully uninstalled ${installed.name}`
      );
      return true;
    }

    return false;
  }

  /**
   * Update package
   */
  public async updatePackage(id: string): Promise<boolean> {
    const installed = this.installedPackages.get(id);
    const available = this.availablePackages.get(id);

    if (!installed || !available) {
      vscode.window.showErrorMessage(`Package "${id}" not found`);
      return false;
    }

    if (!available.updateAvailable) {
      vscode.window.showInformationMessage(
        `${installed.name} is already up to date`
      );
      return false;
    }

    // Update package
    const updated: InstalledPackage = {
      ...installed,
      version: available.latestVersion,
      lastUpdated: new Date(),
    };

    this.installedPackages.set(id, updated);
    this.saveInstalledPackages();

    vscode.window.showInformationMessage(
      `Successfully updated ${installed.name} to v${available.latestVersion}`
    );
    return true;
  }

  /**
   * Enable package
   */
  public enablePackage(id: string): boolean {
    const installed = this.installedPackages.get(id);
    if (!installed) {
      return false;
    }

    installed.enabled = true;
    this.saveInstalledPackages();
    return true;
  }

  /**
   * Disable package
   */
  public disablePackage(id: string): boolean {
    const installed = this.installedPackages.get(id);
    if (!installed) {
      return false;
    }

    installed.enabled = false;
    this.saveInstalledPackages();
    return true;
  }

  /**
   * Check for updates
   */
  public checkForUpdates(): AvailablePackage[] {
    return Array.from(this.installedPackages.values())
      .map(installed => {
        const available = this.availablePackages.get(installed.id);
        if (!available) return null;

        return {
          ...available,
          updateAvailable: available.version !== installed.version,
        };
      })
      .filter(pkg => pkg !== null) as AvailablePackage[];
  }

  /**
   * Update all packages
   */
  public async updateAllPackages(): Promise<void> {
    const updates = this.checkForUpdates();
    const updateableCount = updates.filter(pkg => pkg.updateAvailable).length;

    if (updateableCount === 0) {
      vscode.window.showInformationMessage('All packages are up to date');
      return;
    }

    const result = await vscode.window.showWarningMessage(
      `Update ${updateableCount} packages?`,
      'Update All',
      'Cancel'
    );

    if (result === 'Update All') {
      for (const pkg of updates) {
        if (pkg.updateAvailable) {
          await this.updatePackage(pkg.id);
        }
      }
    }
  }

  /**
   * Get package dependencies
   */
  public getPackageDependencies(id: string): string[] {
    // In a real implementation, this would parse package metadata
    // For now, return empty array
    return [];
  }

  /**
   * Refresh available packages from marketplace
   */
  public async refreshMarketplace(): Promise<void> {
    this.availablePackages.clear();
    await this.loadAvailablePackages();
    vscode.window.showInformationMessage('Marketplace refreshed');
  }

  /**
   * Event fired when installed packages change
   */
  public readonly onDidChangeInstalledPackages = this.eventEmitter.event;
}
