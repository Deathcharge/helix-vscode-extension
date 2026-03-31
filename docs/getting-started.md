# Getting Started with Helix VS Code Extension

Welcome to the Samsara Helix VS Code Extension! This guide will help you get up and running in minutes.

## Prerequisites

- **VS Code**: Version 1.85.0 or later
- **Node.js**: 18+ (for development only)
- **Helix Backend**: A running Helix Collective backend server (optional for basic features)

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. Search for "Helix"
4. Click the "Install" button on the "Helix" extension by Samsara Helix

### From Command Line

```bash
code --install-extension samsara-helix.helix-vscode-extension
```

## Initial Setup

### 1. Open the Helix Panel

After installation, you'll see a Helix icon in the VS Code sidebar. Click it to open the Helix Panel.

**Keyboard Shortcut**: `Ctrl+Shift+H A` (Windows/Linux) or `Cmd+Shift+H A` (Mac)

### 2. Configure Connection Settings

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Helix"
3. Configure the following:

```json
{
  "helix.apiEndpoint": "http://localhost:8000",
  "helix.websocketEndpoint": "ws://localhost:8000/ws",
  "helix.enableCoordinationMonitoring": true,
  "helix.enableAgentNotifications": true,
  "helix.enableWorkflowAutomation": true,
  "helix.theme": "auto"
}
```

### 3. Connect to Agents

1. Open the Agent Panel
2. Click "Add Agent" or "Browse Marketplace"
3. Select an agent to connect
4. Authorize the connection

## Core Features

### Agent Mode

Activate autonomous code generation:

1. Press `Ctrl+Shift+P` to open Command Palette
2. Type "Helix: Activate Agent Mode"
3. Describe what you want to build
4. Watch the agent generate code in real-time
5. Review and approve changes

### Checkpoints

Save code states for version control:

**Create Checkpoint**:
```
Ctrl+Shift+P → "Helix: Create Checkpoint"
```

**Restore Checkpoint**:
```
Ctrl+Shift+P → "Helix: Restore Checkpoint"
```

### Marketplace

Browse and install agent extensions:

1. Press `Ctrl+Shift+H M` to open Marketplace
2. Browse available agents
3. Read reviews and ratings
4. Click "Install" to add to your workspace

### Coordination Dashboard

Monitor agent metrics and performance:

1. Press `Ctrl+Shift+H C` to open Dashboard
2. View real-time metrics:
   - Harmony - Agent coordination level
   - Resilience - Error recovery capability
   - Throughput - Task completion rate
   - Focus - Attention concentration
   - Friction - Workflow obstacles
   - Velocity - Execution speed

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Open Agent Panel | Ctrl+Shift+H A | Cmd+Shift+H A |
| Open Marketplace | Ctrl+Shift+H M | Cmd+Shift+H M |
| Open Dashboard | Ctrl+Shift+H C | Cmd+Shift+H C |
| Open Spiral Builder | Ctrl+Shift+H W | Cmd+Shift+H W |
| Command Palette | Ctrl+Shift+P | Cmd+Shift+P |

## Common Tasks

### Generate Code with Agent Mode

1. Open a file or create a new one
2. Press `Ctrl+Shift+P` and type "Helix: Activate Agent Mode"
3. Describe what you want:
   - "Create a React component for a todo list"
   - "Add error handling to this function"
   - "Write unit tests for this module"
4. Review the generated code
5. Accept or request modifications

### Create a Workflow

1. Press `Ctrl+Shift+H W` to open Spiral Builder
2. Drag and drop nodes to create workflow
3. Connect agents and tasks
4. Configure parameters
5. Execute workflow

### Monitor Agent Performance

1. Press `Ctrl+Shift+H C` to open Coordination Dashboard
2. View real-time metrics
3. Set up alerts for performance issues
4. Analyze bottlenecks

## Troubleshooting

### Extension Not Showing

- Ensure VS Code is version 1.85.0 or later
- Restart VS Code
- Check if extension is enabled in Extensions panel

### Connection Issues

- Verify Helix backend is running
- Check API endpoint in settings
- Ensure WebSocket endpoint is correct
- Check firewall/network settings

### Agent Not Responding

- Verify agent is connected in Agent Panel
- Check agent status in Coordination Dashboard
- Review error logs in Output panel
- Restart the agent connection

### Performance Issues

- Disable unnecessary integrations in settings
- Reduce number of active agents
- Check system resources
- Review Coordination Dashboard metrics

## Next Steps

- Read the [Agent Mode Guide](./agent-mode.md)
- Explore the [Marketplace Guide](./marketplace.md)
- Check the [API Reference](./api.md)
- Join our community on GitHub

## Support

- **Issues**: https://github.com/Deathcharge/helix-vscode-extension/issues
- **Discussions**: https://github.com/Deathcharge/helix-vscode-extension/discussions
- **Documentation**: https://github.com/Deathcharge/helix-vscode-extension/tree/main/docs

## Tips & Tricks

### Use Checkpoints for Experimentation

Create a checkpoint before trying experimental features, then restore if needed.

### Monitor Metrics Regularly

Keep the Coordination Dashboard open to catch performance issues early.

### Customize Keyboard Shortcuts

Open VS Code keyboard shortcuts (`Ctrl+K Ctrl+S`) to customize Helix shortcuts.

### Enable Verbose Logging

Set `helix.verboseLogging` to `true` in settings for detailed debug information.

---

**Happy coding with Samsara Helix! 🚀**
