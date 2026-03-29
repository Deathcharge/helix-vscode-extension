# Helix Collective VSCode Extension

Seamless integration between VSCode and the Helix Collective coordination-aware AI platform.

## Features

### 🤖 Agent Panel

- Real-time agent status monitoring
- Connect/disconnect to AI agents
- Coordination level tracking
- Agent task management

### 🏪 Helix Marketplace

- Browse and install AI agents
- Product ratings and reviews
- Capability and compatibility filtering
- One-click installation

### 🌀 Coordination Dashboard

- Real-time UCF metrics monitoring
- Harmony, Resilience, Throughput, Focus, Friction, Velocity tracking
- Coordination alerts and recommendations
- Auto-refresh and manual refresh options

### 🌀 Spiral Builder

- Visual workflow creation
- Drag-and-drop node interface
- Agent integration workflows
- Workflow execution and testing

## Installation

### Prerequisites

- VSCode 1.80+
- Helix Collective backend server running
- Node.js 18+ for development

### Development Setup

1. Clone the repository
2. Navigate to the extension directory:

   ```bash
   cd helix-vscode-extension
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Build the extension:

   ```bash
   npm run compile
   ```

5. Build the web views:

   ```bash
   npm run build:webviews
   ```

6. Open in VSCode and press `F5` to start debugging

### Production Build

```bash
npm run vscode:prepublish
```

## Configuration

The extension can be configured through VSCode settings:

- `helix.apiEndpoint`: Helix Collective API endpoint (default: `http://localhost:8000`)
- `helix.websocketEndpoint`: WebSocket endpoint (default: `ws://localhost:8000/ws`)
- `helix.enableCoordinationMonitoring`: Enable coordination monitoring (default: `true`)
- `helix.enableAgentNotifications`: Enable agent notifications (default: `true`)
- `helix.enableWorkflowAutomation`: Enable workflow automation (default: `true`)
- `helix.theme`: Theme preference (default: `auto`)

## Commands

Access all features through the Command Palette (`Ctrl+Shift+P`):

- `Helix: Open Agent Panel` - View and manage AI agents
- `Helix: Open Marketplace` - Browse and install products
- `Helix: Open Coordination Dashboard` - Monitor coordination metrics
- `Helix: Open Spiral Builder` - Create visual workflows
- `Helix: Connect to Agent` - Connect to a specific agent
- `Helix: Execute Workflow` - Execute a workflow

## Keyboard Shortcuts

- `Ctrl+Shift+H A` - Open Agent Panel
- `Ctrl+Shift+H M` - Open Marketplace
- `Ctrl+Shift+H C` - Open Coordination Dashboard
- `Ctrl+Shift+H W` - Open Spiral Builder

## Architecture

### Extension Structure

```
helix-vscode-extension/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── extensionContext.ts   # Extension context and web view management
│   ├── commands.ts           # VSCode command handlers
│   ├── services/             # API and WebSocket services
│   ├── store/               # State management stores
│   └── utils/               # Utility functions
├── media/                   # React web view components
│   ├── src/
│   │   ├── webviews/        # React components
│   │   │   ├── agentPanel.tsx
│   │   │   ├── marketplace.tsx
│   │   │   ├── coordinationDashboard.tsx
│   │   │   └── spiralBuilder.tsx
│   │   └── utils/           # Web view utilities
│   ├── webpack.config.js    # Web view build configuration
│   └── template.html        # Web view template
└── out/                     # Compiled extension code
```

### Integration Points

The extension integrates with several Helix Collective services:

- **Core API** (`/api/vscode/*`) - Main REST API endpoints
- **WebSocket Service** - Real-time updates and streaming
- **Agent Orchestrator** - Agent management and task execution
- **Marketplace** - Product catalog and installation
- **Coordination Monitoring** - UCF metrics and alerts

## Development

### Adding New Features

1. Add API endpoints to the backend
2. Create TypeScript interfaces in `src/services/apiService.ts`
3. Implement service methods
4. Create React components in `media/src/webviews/`
5. Add commands in `src/commands.ts`
6. Update web view HTML generation in `src/extensionContext.ts`

### Testing

```bash
# Run extension tests
npm test

# Run web view tests
npm run test:webviews

# Watch mode for development
npm run watch
```

### Building for Distribution

```bash
# Clean build
npm run vscode:prepublish

# Package extension
vsce package
```

## Troubleshooting

### Common Issues

1. **Web views not loading**: Ensure the `media/dist` directory exists and contains compiled files
2. **API connection errors**: Check that the Helix Collective backend is running and accessible
3. **WebSocket connection issues**: Verify WebSocket endpoint configuration
4. **Agent connection failures**: Check agent availability and authentication

### Debugging

1. Open VSCode Developer Tools (`Help > Toggle Developer Tools`)
2. Check the Console for extension errors
3. Enable verbose logging in extension settings
4. Use the VSCode extension debugger for step-through debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

## License

This extension is part of the Helix Collective ecosystem. Please refer to the main repository license.

## Support

For support and questions:

- Check the [main Helix Collective documentation](../README.md)
- Report issues on the [GitHub repository](https://github.com/your-org/helix-unified/issues)
- Join our [Discord community](https://discord.gg/helix-unified)
