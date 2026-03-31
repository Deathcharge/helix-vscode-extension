# Helix VS Code Extension

**AI-powered development environment for VS Code**

An intelligent VS Code extension that brings Samsara Helix's autonomous agent capabilities directly into your editor. Write code faster with AI assistance, manage agents, coordinate workflows, and track consciousness metrics in real-time.

## ✨ Features

### AI-Powered Coding
- **Inline Completions** - Context-aware code suggestions
- **Code Actions** - Intelligent refactoring and fixes
- **Chat Panel** - Conversational coding assistance
- **Agent Mode** - Autonomous code generation and modification

### Agent Management
- **Agent Panel** - View and control active agents
- **Agent Memory** - Context awareness across sessions
- **Agent Coordination** - Multi-agent collaboration
- **Agent Marketplace** - Discover and install agent extensions

### Workflow Integration
- **Checkpoint Management** - Version control for code states
- **Git Integration** - Seamless git operations
- **Terminal Integration** - Execute commands and scripts
- **Browser Integration** - Web-based workflows

### Advanced Features
- **MCP Support** - Model Context Protocol integration
- **Safety Management** - Auto-approval and safety checks
- **Performance Monitoring** - Real-time metrics
- **Notification System** - Stay informed of agent actions

### Coordination Dashboard
- **Real-time Visualization** - See agent coordination in action
- **Metrics Tracking** - Monitor system health
- **Workflow Visualization** - Understand agent workflows
- **Performance Analysis** - Optimize agent execution

## 📦 Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Helix"
4. Click Install

Or install from the command line:
```bash
code --install-extension samsara-helix.helix-vscode-extension
```

## 🚀 Quick Start

1. **Open the Helix Panel** - Click the Helix icon in the sidebar
2. **Activate Agent Mode** - Enable autonomous coding
3. **Describe Your Task** - Tell the agent what to build
4. **Watch It Code** - See real-time code generation
5. **Review & Approve** - Accept or modify changes

## 🎯 Key Commands

- `Helix: Activate Agent Mode` - Enable autonomous coding
- `Helix: Open Agent Panel` - Show agent management UI
- `Helix: Create Checkpoint` - Save current code state
- `Helix: Restore Checkpoint` - Revert to saved state
- `Helix: Open Marketplace` - Browse agent extensions
- `Helix: Open Coordination Dashboard` - View agent metrics

## 📊 Statistics

- **Lines of Code**: 19,525 (TypeScript)
- **Components**: 50+ UI components
- **Features**: 30+ commands
- **Integrations**: MCP, Git, Browser, Terminal

## 🏗️ Architecture

```
helix-vscode-extension/
├── src/
│   ├── agent/              # Agent mode implementation
│   ├── browser/            # Browser integration
│   ├── checkpoint/         # Checkpoint management
│   ├── commands/           # VS Code commands
│   ├── configuration/      # Settings management
│   ├── context/            # Context management
│   ├── display/            # UI components
│   ├── marketplace/        # Marketplace integration
│   ├── mcp/                # MCP support
│   ├── memory/             # Agent memory
│   ├── notification/       # Notifications
│   ├── providers/          # VS Code providers
│   ├── safety/             # Safety management
│   ├── services/           # Core services
│   ├── stores/             # State management
│   ├── terminal/           # Terminal integration
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilities
│   ├── views/              # Tree views
│   ├── webviews/           # Web-based UI
│   ├── extension.ts        # Entry point
│   └── commands.ts         # Command definitions
├── media/                  # UI assets
├── tests/                  # Test suite
└── package.json            # Extension manifest
```

## 🔧 Core Modules

### Agent Mode
Autonomous code generation and modification with safety checks.

### Agent Panel
Visual interface for managing agents and their capabilities.

### Coordination Dashboard
Real-time visualization of multi-agent coordination and metrics.

### Marketplace
Discover, install, and manage agent extensions.

### Checkpoint System
Save and restore code states for version control.

### Memory System
Persistent context awareness across sessions.

## 📚 Documentation

- [Getting Started Guide](./docs/getting-started.md)
- [Agent Mode Guide](./docs/agent-mode.md)
- [Marketplace Guide](./docs/marketplace.md)
- [API Reference](./docs/api.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the Apache License 2.0 - see [LICENSE](./LICENSE) for details.

## 🙋 Support

- **Issues**: Report bugs on [GitHub Issues](https://github.com/Deathcharge/helix-vscode-extension/issues)
- **Discussions**: Join conversations on [GitHub Discussions](https://github.com/Deathcharge/helix-vscode-extension/discussions)
- **Documentation**: Check the [docs](./docs) directory

## 🎓 Learn More

- [Samsara Helix Orchestration](https://github.com/Deathcharge/helix-orchestration)
- [Helix Narrative Engine](https://github.com/Deathcharge/helix-narrative-engine)
- [Helix Spirals](https://github.com/Deathcharge/helix-spirals)
- [Helix Ethics](https://github.com/Deathcharge/helix-ethics)

---

**Built with ❤️ as part of the Samsara Helix Ecosystem**

**Publisher**: Samsara Helix  
**Repository**: https://github.com/Deathcharge/helix-vscode-extension  
**License**: Apache 2.0
