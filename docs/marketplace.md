# Helix Marketplace Guide

The Helix Marketplace is your gateway to discovering, installing, and managing AI agents for your development workflow.

## Accessing the Marketplace

### Method 1: Command Palette

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Helix: Open Marketplace"
3. Press Enter

### Method 2: Keyboard Shortcut

Press `Ctrl+Shift+H M` (Windows/Linux) or `Cmd+Shift+H M` (Mac)

### Method 3: Agent Panel

1. Open the Helix Panel (click Helix icon in sidebar)
2. Click "Browse Marketplace"

## Browsing Agents

### Categories

The marketplace organizes agents by category:

- **Code Generation** - Generate code from descriptions
- **Code Analysis** - Analyze and understand code
- **Testing** - Generate and run tests
- **Refactoring** - Improve code quality
- **Documentation** - Generate documentation
- **Debugging** - Debug and fix issues
- **Performance** - Optimize performance
- **Security** - Identify security issues

### Search and Filter

**Search by Name**:
1. Type agent name in search box
2. Results update in real-time

**Filter by Category**:
1. Click category filter
2. Select one or more categories
3. Results filtered to selected categories

**Filter by Capability**:
1. Click capability filter
2. Select required capabilities
3. Only compatible agents shown

**Filter by Rating**:
1. Use rating slider
2. Only highly-rated agents shown

## Agent Details

### Information Displayed

Each agent shows:

- **Name** - Agent identifier
- **Description** - What the agent does
- **Rating** - User ratings (1-5 stars)
- **Reviews** - User feedback
- **Capabilities** - What the agent can do
- **Compatibility** - Compatible frameworks/languages
- **Version** - Current version
- **Author** - Who created it
- **Last Updated** - When it was last updated

### Agent Capabilities

Common capabilities include:

- **Code Generation** - Generate code from descriptions
- **Code Analysis** - Analyze code for issues
- **Refactoring** - Improve code structure
- **Testing** - Generate tests
- **Documentation** - Generate docs
- **Debugging** - Debug code
- **Performance Optimization** - Improve performance
- **Security Analysis** - Find security issues

## Installing Agents

### Basic Installation

1. Find agent in marketplace
2. Click "Install" button
3. Confirm installation
4. Agent appears in Agent Panel

### Configuration After Install

1. Open Agent Panel
2. Click on installed agent
3. Configure settings:
   - API keys (if needed)
   - Preferences
   - Capabilities to enable/disable

### Multiple Agent Installation

Install multiple agents for different tasks:

1. Install Code Generation agent
2. Install Testing agent
3. Install Refactoring agent
4. Agents coordinate automatically

## Popular Agents

### Code Generation Agents

**Kael** - General-purpose code generation
- Generates code from descriptions
- Supports multiple languages
- Context-aware

**Lumina** - Frontend-focused agent
- React/Vue/Angular components
- Styling and responsive design
- UI best practices

**Vega** - Backend-focused agent
- API endpoints
- Database operations
- Authentication/authorization

### Analysis Agents

**Sage** - Code analysis and insights
- Identifies code smells
- Suggests improvements
- Performance analysis

**Guardian** - Security analysis
- Finds security vulnerabilities
- Suggests fixes
- Best practices

### Testing Agents

**Tester** - Test generation and execution
- Unit tests
- Integration tests
- E2E tests

## Managing Installed Agents

### View Installed Agents

1. Open Agent Panel
2. "Installed Agents" section shows all active agents
3. Click agent to view details

### Enable/Disable Agents

1. Open Agent Panel
2. Click agent settings icon
3. Toggle "Enabled" switch

### Update Agents

1. Open Agent Panel
2. Click agent settings
3. Click "Check for Updates"
4. Click "Update" if available

### Uninstall Agents

1. Open Agent Panel
2. Click agent settings
3. Click "Uninstall"
4. Confirm removal

## Agent Coordination

### Multi-Agent Workflows

Multiple agents work together:

1. **Task Distribution** - Each agent handles its specialty
2. **Communication** - Agents share context
3. **Conflict Resolution** - Automatic resolution of conflicts
4. **Optimization** - Agents optimize each other's work

### Example Workflow

1. **Kael** generates code
2. **Sage** analyzes for improvements
3. **Guardian** checks security
4. **Tester** generates tests
5. All results combined into final output

## Reviews and Ratings

### Reading Reviews

1. Open agent details
2. Scroll to "Reviews" section
3. Read user feedback
4. Filter by rating

### Leaving Reviews

1. Install and use agent
2. Open agent details
3. Click "Leave Review"
4. Rate (1-5 stars)
5. Write feedback
6. Submit

### Helpful Review Tips

- Be specific about your experience
- Mention what worked well
- Suggest improvements
- Include use case examples

## Troubleshooting

### Agent Not Installing

- Check internet connection
- Verify VS Code version compatibility
- Check available disk space
- Review error message in Output panel

### Agent Not Working After Install

1. Restart VS Code
2. Check agent is enabled in Agent Panel
3. Verify configuration is correct
4. Check error logs

### Agent Performance Issues

1. Disable unnecessary agents
2. Check system resources
3. Review agent settings
4. Update agent to latest version

### Compatibility Issues

1. Check agent requirements
2. Verify framework versions
3. Check language support
4. Review compatibility notes

## Advanced Features

### Custom Agent Development

Create your own agents:

1. Fork helix-agent-template
2. Implement agent logic
3. Add to marketplace
4. Share with community

### Agent Marketplace API

Integrate marketplace into your tools:

```typescript
const agents = await helixMarketplace.search({
  category: 'code-generation',
  rating: 4.5,
  limit: 10
});
```

### Bulk Operations

Manage multiple agents:

1. Select multiple agents
2. Perform batch operations:
   - Update all
   - Enable/disable all
   - Configure all

## Best Practices

### Choose Right Agents

- Select agents for your specific needs
- Check ratings and reviews
- Verify compatibility
- Test with small tasks first

### Manage Agent Load

- Don't install too many agents
- Disable unused agents
- Monitor performance
- Remove unused agents

### Keep Agents Updated

- Check for updates regularly
- Review update notes
- Test after updates
- Report issues if found

### Provide Feedback

- Leave reviews
- Report bugs
- Suggest features
- Share use cases

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Marketplace | Ctrl+Shift+H M |
| Search Agents | Ctrl+F (in marketplace) |
| Install Agent | Enter (on selected agent) |
| View Details | Space (on selected agent) |

## Support

- **Agent Issues**: Report in agent's issue tracker
- **Marketplace Issues**: Report on GitHub
- **Questions**: Ask in GitHub Discussions

---

**Discover and install the perfect agents for your workflow! 🎯**
