"use strict";
/**
 * Helix VS Code Extension - Marketplace Manager
 * Enhanced marketplace for utilities and extensions
 */
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
exports.MarketplaceManager = void 0;
const vscode = __importStar(require("vscode"));
class MarketplaceManager {
    constructor(context) {
        this.eventEmitter = new vscode.EventEmitter();
        /**
         * Event fired when installed packages change
         */
        this.onDidChangeInstalledPackages = this.eventEmitter.event;
        this.context = context;
        this.installedPackages = new Map();
        this.availablePackages = new Map();
        this.loadInstalledPackages();
        this.loadAvailablePackages();
    }
    static getInstance(context) {
        if (!MarketplaceManager.instance) {
            if (!context) {
                throw new Error('MarketplaceManager requires ExtensionContext on first initialization');
            }
            MarketplaceManager.instance = new MarketplaceManager(context);
        }
        return MarketplaceManager.instance;
    }
    /**
     * Load installed packages from storage
     */
    loadInstalledPackages() {
        try {
            const storageKey = 'installedPackages';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                stored.forEach(pkg => this.installedPackages.set(pkg.id, pkg));
            }
        }
        catch (error) {
            console.error('Failed to load installed packages:', error);
        }
    }
    /**
     * Save installed packages to storage
     */
    saveInstalledPackages() {
        try {
            const storageKey = 'installedPackages';
            const packages = Array.from(this.installedPackages.values());
            this.context.globalState.update(storageKey, packages);
            this.eventEmitter.fire(packages);
        }
        catch (error) {
            console.error('Failed to save installed packages:', error);
        }
    }
    /**
     * Load available packages from marketplace
     */
    async loadAvailablePackages() {
        // In a real implementation, this would fetch from a marketplace API
        // For now, we'll use sample packages
        const samplePackages = [
            {
                id: 'helix-python-analyzer',
                name: 'Python Code Analyzer',
                version: '1.2.0',
                latestVersion: '1.2.0',
                description: 'Advanced Python code analysis with Pylint and MyPy integration',
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
                description: 'Scan code for security vulnerabilities and best practices',
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
    getInstalledPackages() {
        return Array.from(this.installedPackages.values());
    }
    /**
     * Get installed package by ID
     */
    getInstalledPackage(id) {
        return this.installedPackages.get(id);
    }
    /**
     * Get all available packages
     */
    getAvailablePackages() {
        return Array.from(this.availablePackages.values());
    }
    /**
     * Get available package by ID
     */
    getAvailablePackage(id) {
        return this.availablePackages.get(id);
    }
    /**
     * Search available packages
     */
    searchPackages(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.availablePackages.values()).filter(pkg => pkg.name.toLowerCase().includes(lowerQuery) ||
            pkg.description.toLowerCase().includes(lowerQuery) ||
            pkg.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
            pkg.category.toLowerCase().includes(lowerQuery));
    }
    /**
     * Get packages by category
     */
    getPackagesByCategory(category) {
        return Array.from(this.availablePackages.values()).filter(pkg => pkg.category.toLowerCase() === category.toLowerCase());
    }
    /**
     * Get categories
     */
    getCategories() {
        const categories = new Set(Array.from(this.availablePackages.values()).map(pkg => pkg.category));
        return Array.from(categories).sort();
    }
    /**
     * Install package
     */
    async installPackage(id) {
        const available = this.availablePackages.get(id);
        if (!available) {
            vscode.window.showErrorMessage(`Package "${id}" not found in marketplace`);
            return false;
        }
        // Check if already installed
        if (this.installedPackages.has(id)) {
            vscode.window.showWarningMessage(`Package "${available.name}" is already installed`);
            return false;
        }
        // Install package
        const installed = {
            ...available,
            installedPath: '', // Would be set by actual installer
            installDate: new Date(),
            lastUpdated: new Date(),
            enabled: true,
        };
        this.installedPackages.set(id, installed);
        this.saveInstalledPackages();
        vscode.window.showInformationMessage(`Successfully installed ${available.name}`);
        return true;
    }
    /**
     * Uninstall package
     */
    async uninstallPackage(id) {
        const installed = this.installedPackages.get(id);
        if (!installed) {
            vscode.window.showErrorMessage(`Package "${id}" is not installed`);
            return false;
        }
        const result = await vscode.window.showWarningMessage(`Are you sure you want to uninstall ${installed.name}?`, 'Uninstall', 'Cancel');
        if (result === 'Uninstall') {
            this.installedPackages.delete(id);
            this.saveInstalledPackages();
            vscode.window.showInformationMessage(`Successfully uninstalled ${installed.name}`);
            return true;
        }
        return false;
    }
    /**
     * Update package
     */
    async updatePackage(id) {
        const installed = this.installedPackages.get(id);
        const available = this.availablePackages.get(id);
        if (!installed || !available) {
            vscode.window.showErrorMessage(`Package "${id}" not found`);
            return false;
        }
        if (!available.updateAvailable) {
            vscode.window.showInformationMessage(`${installed.name} is already up to date`);
            return false;
        }
        // Update package
        const updated = {
            ...installed,
            version: available.latestVersion,
            lastUpdated: new Date(),
        };
        this.installedPackages.set(id, updated);
        this.saveInstalledPackages();
        vscode.window.showInformationMessage(`Successfully updated ${installed.name} to v${available.latestVersion}`);
        return true;
    }
    /**
     * Enable package
     */
    enablePackage(id) {
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
    disablePackage(id) {
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
    checkForUpdates() {
        return Array.from(this.installedPackages.values())
            .map(installed => {
            const available = this.availablePackages.get(installed.id);
            if (!available)
                return null;
            return {
                ...available,
                updateAvailable: available.version !== installed.version,
            };
        })
            .filter(pkg => pkg !== null);
    }
    /**
     * Update all packages
     */
    async updateAllPackages() {
        const updates = this.checkForUpdates();
        const updateableCount = updates.filter(pkg => pkg.updateAvailable).length;
        if (updateableCount === 0) {
            vscode.window.showInformationMessage('All packages are up to date');
            return;
        }
        const result = await vscode.window.showWarningMessage(`Update ${updateableCount} packages?`, 'Update All', 'Cancel');
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
    getPackageDependencies(id) {
        // In a real implementation, this would parse package metadata
        // For now, return empty array
        return [];
    }
    /**
     * Refresh available packages from marketplace
     */
    async refreshMarketplace() {
        this.availablePackages.clear();
        await this.loadAvailablePackages();
        vscode.window.showInformationMessage('Marketplace refreshed');
    }
}
exports.MarketplaceManager = MarketplaceManager;
//# sourceMappingURL=MarketplaceManager.js.map