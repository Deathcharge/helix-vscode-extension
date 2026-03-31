"use strict";
/**
 * Helix VS Code Extension - Configuration Manager
 * Multi-profile API configuration management with provider routing
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
exports.ConfigurationManager = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class ConfigurationManager {
    constructor(context) {
        this.profiles = new Map();
        this.currentProfileId = 'default';
        this.configFilePath = path.join(context.globalStorageUri.fsPath, 'configurations.json');
        this.loadConfigurations();
        this.ensureDefaultProfile();
    }
    static getInstance(context) {
        if (!ConfigurationManager.instance) {
            if (!context) {
                throw new Error('ConfigurationManager requires ExtensionContext on first initialization');
            }
            ConfigurationManager.instance = new ConfigurationManager(context);
        }
        return ConfigurationManager.instance;
    }
    /**
     * Load configurations from storage
     */
    loadConfigurations() {
        try {
            if (fs.existsSync(this.configFilePath)) {
                const data = fs.readFileSync(this.configFilePath, 'utf-8');
                const config = JSON.parse(data);
                if (config.profiles) {
                    Object.entries(config.profiles).forEach(([id, profile]) => {
                        this.profiles.set(id, profile);
                    });
                }
                if (config.currentProfileId) {
                    this.currentProfileId = config.currentProfileId;
                }
            }
        }
        catch (error) {
            console.error('Failed to load configurations:', error);
        }
    }
    /**
     * Save configurations to storage
     */
    saveConfigurations() {
        try {
            const dir = path.dirname(this.configFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const config = {
                currentProfileId: this.currentProfileId,
                profiles: Object.fromEntries(this.profiles),
            };
            fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2));
        }
        catch (error) {
            console.error('Failed to save configurations:', error);
        }
    }
    /**
     * Ensure default profile exists
     */
    ensureDefaultProfile() {
        if (!this.profiles.has('default')) {
            this.profiles.set('default', {
                id: 'default',
                name: 'Default',
                isActive: true,
                providers: [],
                defaultProviderId: undefined,
                advancedSettings: this.getDefaultAdvancedSettings(),
            });
        }
    }
    /**
     * Get default advanced settings
     */
    getDefaultAdvancedSettings() {
        return {
            enableTodoTracking: true,
            autoRejectTruncatedWrites: true,
            matchPrecision: 100,
            temperature: 0.7,
            rateLimitAfterStream: true,
            rateLimitMs: 0,
            errorAndRepetitionLimit: 3,
        };
    }
    /**
     * Get all profiles
     */
    getAllProfiles() {
        return Array.from(this.profiles.values());
    }
    /**
     * Get active profile
     */
    getActiveProfile() {
        const profile = this.profiles.get(this.currentProfileId);
        return profile;
    }
    /**
     * Get profile by ID
     */
    getProfile(id) {
        return this.profiles.get(id);
    }
    /**
     * Set active profile
     */
    setActiveProfile(id) {
        if (this.profiles.has(id)) {
            this.currentProfileId = id;
            this.saveConfigurations();
            return true;
        }
        return false;
    }
    /**
     * Create new profile
     */
    createProfile(name) {
        const id = `profile-${Date.now()}`;
        const profile = {
            id,
            name,
            isActive: false,
            providers: [],
            defaultProviderId: undefined,
            advancedSettings: this.getDefaultAdvancedSettings(),
        };
        this.profiles.set(id, profile);
        this.saveConfigurations();
        return profile;
    }
    /**
     * Update profile
     */
    updateProfile(id, updates) {
        const profile = this.profiles.get(id);
        if (!profile) {
            return false;
        }
        Object.assign(profile, updates);
        this.saveConfigurations();
        return true;
    }
    /**
     * Delete profile
     */
    deleteProfile(id) {
        if (id === 'default') {
            return false; // Cannot delete default profile
        }
        const deleted = this.profiles.delete(id);
        if (deleted && this.currentProfileId === id) {
            this.currentProfileId = 'default';
        }
        this.saveConfigurations();
        return deleted;
    }
    /**
     * Add provider to profile
     */
    addProvider(profileId, provider) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            return false;
        }
        profile.providers.push(provider);
        if (!profile.defaultProviderId) {
            profile.defaultProviderId = provider.id;
        }
        this.saveConfigurations();
        return true;
    }
    /**
     * Update provider in profile
     */
    updateProvider(profileId, providerId, updates) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            return false;
        }
        const provider = profile.providers.find(p => p.id === providerId);
        if (!provider) {
            return false;
        }
        Object.assign(provider, updates);
        this.saveConfigurations();
        return true;
    }
    /**
     * Remove provider from profile
     */
    removeProvider(profileId, providerId) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            return false;
        }
        const index = profile.providers.findIndex(p => p.id === providerId);
        if (index === -1) {
            return false;
        }
        profile.providers.splice(index, 1);
        if (profile.defaultProviderId === providerId) {
            profile.defaultProviderId =
                profile.providers.length > 0 ? profile.providers[0]?.id : undefined;
        }
        this.saveConfigurations();
        return true;
    }
    /**
     * Get default provider from active profile
     */
    getDefaultProvider() {
        const profile = this.getActiveProfile();
        if (!profile || !profile.defaultProviderId) {
            return undefined;
        }
        return profile.providers.find(p => p.id === profile.defaultProviderId);
    }
    /**
     * Set default provider for profile
     */
    setDefaultProvider(profileId, providerId) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            return false;
        }
        const provider = profile.providers.find(p => p.id === providerId);
        if (!provider) {
            return false;
        }
        profile.defaultProviderId = providerId;
        this.saveConfigurations();
        return true;
    }
    /**
     * Update advanced settings for profile
     */
    updateAdvancedSettings(profileId, settings) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            return false;
        }
        profile.advancedSettings = { ...profile.advancedSettings, ...settings };
        this.saveConfigurations();
        return true;
    }
    /**
     * Export configuration to JSON
     */
    exportConfiguration(profileId) {
        if (profileId) {
            const profile = this.profiles.get(profileId);
            return JSON.stringify(profile, null, 2);
        }
        return JSON.stringify({
            currentProfileId: this.currentProfileId,
            profiles: Object.fromEntries(this.profiles),
        }, null, 2);
    }
    /**
     * Import configuration from JSON
     */
    importConfiguration(configJson) {
        try {
            const config = JSON.parse(configJson);
            if (config.profiles) {
                Object.entries(config.profiles).forEach(([id, profile]) => {
                    this.profiles.set(id, profile);
                });
            }
            if (config.currentProfileId) {
                this.currentProfileId = config.currentProfileId;
            }
            this.saveConfigurations();
            return true;
        }
        catch (error) {
            console.error('Failed to import configuration:', error);
            return false;
        }
    }
    /**
     * Reset to default configuration
     */
    resetToDefaults() {
        this.profiles.clear();
        this.currentProfileId = 'default';
        this.ensureDefaultProfile();
        this.saveConfigurations();
    }
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=ConfigurationManager.js.map