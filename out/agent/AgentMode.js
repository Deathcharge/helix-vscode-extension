"use strict";
/**
 * Helix VS Code Extension - Agent Mode System
 * Specialized personas for different agent behaviors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentModeManager = void 0;
class AgentModeManager {
    constructor(context) {
        this.context = context;
        this.modes = new Map();
        this.currentModeId = 'code';
        this.loadModes();
        this.ensureDefaultModes();
    }
    static getInstance(context) {
        if (!AgentModeManager.instance) {
            if (!context) {
                throw new Error('AgentModeManager requires ExtensionContext on first initialization');
            }
            AgentModeManager.instance = new AgentModeManager(context);
        }
        return AgentModeManager.instance;
    }
    /**
     * Load modes from storage
     */
    loadModes() {
        try {
            const storageKey = 'agentModes';
            const stored = this.context.globalState.get(storageKey);
            if (stored) {
                const modes = JSON.parse(stored);
                modes.forEach(mode => this.modes.set(mode.id, mode));
            }
        }
        catch (error) {
            console.error('Failed to load agent modes:', error);
        }
    }
    /**
     * Save modes to storage
     */
    saveModes() {
        try {
            const storageKey = 'agentModes';
            const modes = Array.from(this.modes.values());
            this.context.globalState.update(storageKey, JSON.stringify(modes));
        }
        catch (error) {
            console.error('Failed to save agent modes:', error);
        }
    }
    /**
     * Ensure default modes exist
     */
    ensureDefaultModes() {
        const defaultModes = this.getDefaultModes();
        defaultModes.forEach(mode => {
            if (!this.modes.has(mode.id)) {
                this.modes.set(mode.id, mode);
            }
        });
        if (!this.currentModeId || !this.modes.has(this.currentModeId)) {
            this.currentModeId = 'code';
        }
    }
    /**
     * Get default built-in modes
     */
    getDefaultModes() {
        return [
            {
                id: 'code',
                name: 'Code',
                type: 'code',
                roleDefinition: 'You are a highly skilled software engineer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.',
                shortDescription: 'Write, modify, and refactor code',
                whenToUse: 'Use this mode when you need to write, modify, or refactor code. Ideal for implementing features, fixing bugs, creating new files, or making code improvements across any programming language or framework.',
                apiConfigurationId: 'default',
                availableTools: this.getDefaultTools(),
            },
            {
                id: 'audit',
                name: 'Code Audit',
                type: 'audit',
                roleDefinition: 'You are a meticulous code auditor focused on identifying security vulnerabilities, performance issues, and code quality problems.',
                shortDescription: 'Analyze code for security and quality issues',
                whenToUse: 'Use this mode when you need to audit code for security vulnerabilities, performance bottlenecks, or quality issues. Ideal for code reviews, security assessments, and optimization.',
                apiConfigurationId: 'default',
                availableTools: this.getDefaultTools().map(t => t.id === 'browser' ? { ...t, enabled: false } : t),
            },
            {
                id: 'research',
                name: 'Research',
                type: 'research',
                roleDefinition: 'You are a technical researcher skilled at gathering and synthesizing information from multiple sources to provide comprehensive answers.',
                shortDescription: 'Research and synthesize technical information',
                whenToUse: 'Use this mode when you need to research technical topics, gather information from multiple sources, or synthesize complex information.',
                apiConfigurationId: 'default',
                availableTools: this.getDefaultTools().map(t => t.id === 'execute' ? { ...t, enabled: false } : t),
            },
            {
                id: 'documentation',
                name: 'Documentation',
                type: 'documentation',
                roleDefinition: 'You are a technical writer who excels at creating clear, comprehensive documentation for software projects.',
                shortDescription: 'Generate and improve documentation',
                whenToUse: 'Use this mode when you need to generate documentation, explain code, or improve existing documentation.',
                apiConfigurationId: 'default',
                availableTools: this.getDefaultTools().filter(t => ['read', 'write', 'edit'].includes(t.id)),
            },
            {
                id: 'testing',
                name: 'Testing',
                type: 'testing',
                roleDefinition: 'You are a testing expert focused on creating comprehensive test suites, including unit tests, integration tests, and end-to-end tests.',
                shortDescription: 'Generate and improve tests',
                whenToUse: 'Use this mode when you need to generate test cases, improve test coverage, or debug test failures.',
                apiConfigurationId: 'default',
                availableTools: this.getDefaultTools(),
            },
            {
                id: 'architecture',
                name: 'Architecture',
                type: 'architecture',
                roleDefinition: 'You are a software architect with deep expertise in system design, microservices, scalability, and distributed systems.',
                shortDescription: 'Design and review system architecture',
                whenToUse: 'Use this mode when you need to design system architecture, review architectural decisions, or plan scalable solutions.',
                apiConfigurationId: 'default',
                availableTools: this.getDefaultTools(),
            },
            {
                id: 'security',
                name: 'Security',
                type: 'security',
                roleDefinition: 'You are a security expert focused on identifying vulnerabilities, implementing secure coding practices, and ensuring compliance.',
                shortDescription: 'Analyze security and implement secure practices',
                whenToUse: 'Use this mode when you need to perform security audits, implement secure coding practices, or ensure regulatory compliance.',
                apiConfigurationId: 'default',
                availableTools: this.getDefaultTools(),
            },
        ];
    }
    /**
     * Get default tool definitions
     */
    getDefaultTools() {
        return [
            {
                id: 'read',
                name: 'Read Files',
                description: 'Read file contents',
                enabled: true,
            },
            {
                id: 'write',
                name: 'Write Files',
                description: 'Write or create files',
                enabled: true,
            },
            {
                id: 'edit',
                name: 'Edit Files',
                description: 'Edit existing files',
                enabled: true,
            },
            {
                id: 'delete',
                name: 'Delete Files',
                description: 'Delete files',
                enabled: true,
            },
            {
                id: 'execute',
                name: 'Run Commands',
                description: 'Execute terminal commands',
                enabled: true,
            },
            {
                id: 'browser',
                name: 'Use Browser',
                description: 'Interact with web pages',
                enabled: true,
            },
            {
                id: 'mcp',
                name: 'Use MCP',
                description: 'Use Model Context Protocol tools',
                enabled: true,
            },
        ];
    }
    /**
     * Get all modes
     */
    getAllModes() {
        return Array.from(this.modes.values());
    }
    /**
     * Get modes by type
     */
    getModesByType(type) {
        return Array.from(this.modes.values()).filter(m => m.type === type);
    }
    /**
     * Get current active mode
     */
    getCurrentMode() {
        return this.modes.get(this.currentModeId);
    }
    /**
     * Get mode by ID
     */
    getMode(id) {
        return this.modes.get(id);
    }
    /**
     * Set current mode
     */
    setCurrentMode(id) {
        if (this.modes.has(id)) {
            this.currentModeId = id;
            this.saveModes();
            return true;
        }
        return false;
    }
    /**
     * Create custom mode
     */
    createMode(mode) {
        const id = `custom-mode-${Date.now()}`;
        const newMode = {
            ...mode,
            id,
            availableTools: mode.availableTools || this.getDefaultTools(),
        };
        this.modes.set(id, newMode);
        this.saveModes();
        return newMode;
    }
    /**
     * Update mode
     */
    updateMode(id, updates) {
        const mode = this.modes.get(id);
        if (!mode) {
            return false;
        }
        Object.assign(mode, updates);
        this.saveModes();
        return true;
    }
    /**
     * Delete mode (only custom modes)
     */
    deleteMode(id) {
        const mode = this.modes.get(id);
        if (!mode) {
            return false;
        }
        // Don't allow deleting built-in modes
        const builtInModeIds = this.getDefaultModes().map(m => m.id);
        if (builtInModeIds.includes(id)) {
            return false;
        }
        const deleted = this.modes.delete(id);
        if (deleted && this.currentModeId === id) {
            this.currentModeId = 'code';
        }
        this.saveModes();
        return deleted;
    }
    /**
     * Duplicate mode
     */
    duplicateMode(id, newName) {
        const mode = this.modes.get(id);
        if (!mode) {
            return undefined;
        }
        const newId = `${id}-copy-${Date.now()}`;
        const newMode = {
            ...mode,
            id: newId,
            name: newName,
            availableTools: [...mode.availableTools],
        };
        this.modes.set(newId, newMode);
        this.saveModes();
        return newMode;
    }
    /**
     * Import mode
     */
    importMode(modeJson) {
        try {
            const mode = JSON.parse(modeJson);
            // Generate new ID if it conflicts
            if (this.modes.has(mode.id)) {
                mode.id = `${mode.id}-imported-${Date.now()}`;
            }
            this.modes.set(mode.id, mode);
            this.saveModes();
            return mode;
        }
        catch (error) {
            console.error('Failed to import mode:', error);
            return undefined;
        }
    }
    /**
     * Export mode
     */
    exportMode(id) {
        const mode = this.modes.get(id);
        if (!mode) {
            return undefined;
        }
        return JSON.stringify(mode, null, 2);
    }
    /**
     * Get effective system prompt for current mode
     */
    getEffectiveSystemPrompt() {
        const mode = this.getCurrentMode();
        if (!mode) {
            return '';
        }
        let prompt = mode.roleDefinition;
        // Add custom instructions if present
        if (mode.customInstructions) {
            prompt += '\n\n' + mode.customInstructions;
        }
        // Override with custom system prompt if provided
        if (mode.systemPromptOverride) {
            prompt = mode.systemPromptOverride;
        }
        return prompt;
    }
    /**
     * Get enabled tools for current mode
     */
    getEnabledTools() {
        const mode = this.getCurrentMode();
        if (!mode) {
            return [];
        }
        return mode.availableTools.filter(t => t.enabled);
    }
    /**
     * Check if tool is enabled in current mode
     */
    isToolEnabled(toolId) {
        const mode = this.getCurrentMode();
        if (!mode) {
            return false;
        }
        const tool = mode.availableTools.find(t => t.id === toolId);
        return tool ? tool.enabled : false;
    }
}
exports.AgentModeManager = AgentModeManager;
//# sourceMappingURL=AgentMode.js.map