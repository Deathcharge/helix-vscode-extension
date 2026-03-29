/**
 * Helix VS Code Extension - Configuration Manager
 * Multi-profile API configuration management with provider routing
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ApiProvider {
  id: string;
  name: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  supportsImages?: boolean;
  supportsPromptCaching?: boolean;
  contextWindow?: number;
  maxOutput?: number;
  capabilities?: string[];
  zeroDataRetention?: boolean;
}

export interface ConfigurationProfile {
  id: string;
  name: string;
  isActive: boolean;
  providers: ApiProvider[];
  defaultProviderId?: string;
  advancedSettings: AdvancedSettings;
}

export interface AdvancedSettings {
  enableTodoTracking: boolean;
  autoRejectTruncatedWrites: boolean;
  matchPrecision: number;
  temperature: number;
  rateLimitAfterStream: boolean;
  rateLimitMs: number;
  errorAndRepetitionLimit: number;
}

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private profiles: Map<string, ConfigurationProfile>;
  private currentProfileId: string;
  private configFilePath: string;

  private constructor(context: vscode.ExtensionContext) {
    this.profiles = new Map();
    this.currentProfileId = 'default';
    this.configFilePath = path.join(
      context.globalStorageUri.fsPath,
      'configurations.json'
    );

    this.loadConfigurations();
    this.ensureDefaultProfile();
  }

  public static getInstance(
    context?: vscode.ExtensionContext
  ): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      if (!context) {
        throw new Error(
          'ConfigurationManager requires ExtensionContext on first initialization'
        );
      }
      ConfigurationManager.instance = new ConfigurationManager(context);
    }
    return ConfigurationManager.instance;
  }

  /**
   * Load configurations from storage
   */
  private loadConfigurations(): void {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const data = fs.readFileSync(this.configFilePath, 'utf-8');
        const config = JSON.parse(data);

        if (config.profiles) {
          Object.entries(config.profiles).forEach(
            ([id, profile]: [string, any]) => {
              this.profiles.set(id, profile);
            }
          );
        }

        if (config.currentProfileId) {
          this.currentProfileId = config.currentProfileId;
        }
      }
    } catch (error) {
      console.error('Failed to load configurations:', error);
    }
  }

  /**
   * Save configurations to storage
   */
  private saveConfigurations(): void {
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
    } catch (error) {
      console.error('Failed to save configurations:', error);
    }
  }

  /**
   * Ensure default profile exists
   */
  private ensureDefaultProfile(): void {
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
  private getDefaultAdvancedSettings(): AdvancedSettings {
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
  public getAllProfiles(): ConfigurationProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get active profile
   */
  public getActiveProfile(): ConfigurationProfile | undefined {
    const profile = this.profiles.get(this.currentProfileId);
    return profile;
  }

  /**
   * Get profile by ID
   */
  public getProfile(id: string): ConfigurationProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Set active profile
   */
  public setActiveProfile(id: string): boolean {
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
  public createProfile(name: string): ConfigurationProfile {
    const id = `profile-${Date.now()}`;
    const profile: ConfigurationProfile = {
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
  public updateProfile(
    id: string,
    updates: Partial<ConfigurationProfile>
  ): boolean {
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
  public deleteProfile(id: string): boolean {
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
  public addProvider(profileId: string, provider: ApiProvider): boolean {
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
  public updateProvider(
    profileId: string,
    providerId: string,
    updates: Partial<ApiProvider>
  ): boolean {
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
  public removeProvider(profileId: string, providerId: string): boolean {
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
  public getDefaultProvider(): ApiProvider | undefined {
    const profile = this.getActiveProfile();
    if (!profile || !profile.defaultProviderId) {
      return undefined;
    }

    return profile.providers.find(p => p.id === profile.defaultProviderId);
  }

  /**
   * Set default provider for profile
   */
  public setDefaultProvider(profileId: string, providerId: string): boolean {
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
  public updateAdvancedSettings(
    profileId: string,
    settings: Partial<AdvancedSettings>
  ): boolean {
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
  public exportConfiguration(profileId?: string): string {
    if (profileId) {
      const profile = this.profiles.get(profileId);
      return JSON.stringify(profile, null, 2);
    }

    return JSON.stringify(
      {
        currentProfileId: this.currentProfileId,
        profiles: Object.fromEntries(this.profiles),
      },
      null,
      2
    );
  }

  /**
   * Import configuration from JSON
   */
  public importConfiguration(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);

      if (config.profiles) {
        Object.entries(config.profiles).forEach(
          ([id, profile]: [string, any]) => {
            this.profiles.set(id, profile);
          }
        );
      }

      if (config.currentProfileId) {
        this.currentProfileId = config.currentProfileId;
      }

      this.saveConfigurations();
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * Reset to default configuration
   */
  public resetToDefaults(): void {
    this.profiles.clear();
    this.currentProfileId = 'default';
    this.ensureDefaultProfile();
    this.saveConfigurations();
  }
}
