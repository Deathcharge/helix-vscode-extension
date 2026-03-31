# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Extension Not Showing in VS Code

**Problem**: Extension doesn't appear after installation

**Solutions**:
1. Verify VS Code version is 1.85.0 or later
   ```bash
   code --version
   ```
2. Restart VS Code completely
3. Check Extensions panel (Ctrl+Shift+X)
4. Search for "Helix" and verify it's installed
5. If not listed, reinstall from marketplace

#### Installation Fails

**Problem**: Installation stops with error

**Solutions**:
1. Check internet connection
2. Verify VS Code is up to date
3. Check available disk space (need ~500MB)
4. Disable other extensions temporarily
5. Try installing from command line:
   ```bash
   code --install-extension samsara-helix.helix-vscode-extension
   ```

---

### Connection Issues

#### Cannot Connect to Helix Backend

**Problem**: "Failed to connect to backend" error

**Solutions**:
1. Verify backend is running:
   ```bash
   curl http://localhost:8000/health
   ```
2. Check API endpoint in settings:
   - Open Settings (Ctrl+,)
   - Search "helix.apiEndpoint"
   - Verify it's correct
3. Check WebSocket endpoint:
   - Search "helix.websocketEndpoint"
   - Should be `ws://localhost:8000/ws`
4. Check firewall settings
5. Try connecting to different endpoint

#### WebSocket Connection Timeout

**Problem**: WebSocket connection times out

**Solutions**:
1. Verify WebSocket endpoint is correct
2. Check network connectivity
3. Increase timeout in settings:
   ```json
   {
     "helix.websocketTimeout": 30000
   }
   ```
4. Check backend logs for errors
5. Restart backend service

#### SSL/TLS Certificate Errors

**Problem**: "Certificate verification failed" error

**Solutions**:
1. For development, disable SSL verification:
   ```json
   {
     "helix.ssl.verify": false
   }
   ```
2. For production, ensure certificates are valid
3. Update CA certificates:
   ```bash
   npm install -g node-gyp
   npm rebuild
   ```

---

### Agent Issues

#### Agent Not Responding

**Problem**: Agent appears connected but doesn't respond

**Solutions**:
1. Check agent status in Agent Panel
2. Verify agent is enabled
3. Check agent logs in Output panel
4. Restart agent connection:
   - Click agent in Agent Panel
   - Click "Disconnect"
   - Click "Connect"
5. Check backend logs

#### Agent Crashes

**Problem**: Agent crashes during operation

**Solutions**:
1. Check error message in Output panel
2. Review agent logs
3. Restart the agent
4. Update agent to latest version
5. Report issue on GitHub with logs

#### Agent Slow Performance

**Problem**: Agent takes too long to respond

**Solutions**:
1. Check system resources (CPU, memory)
2. Reduce task complexity
3. Disable unnecessary agents
4. Check network latency
5. Review Coordination Dashboard metrics
6. Increase timeout:
   ```json
   {
     "helix.agentMode.timeout": 120000
   }
   ```

#### Agent Not in Marketplace

**Problem**: Expected agent not showing in marketplace

**Solutions**:
1. Refresh marketplace (F5)
2. Clear VS Code cache:
   ```bash
   rm -rf ~/.vscode/extensions/samsara-helix*
   ```
3. Reinstall extension
4. Check agent compatibility with your VS Code version
5. Report missing agent on GitHub

---

### Feature Issues

#### Agent Mode Not Working

**Problem**: Agent Mode command not available

**Solutions**:
1. Verify extension is enabled
2. Check if backend is running
3. Verify at least one agent is connected
4. Restart VS Code
5. Check Output panel for errors

#### Checkpoints Not Saving

**Problem**: Cannot create or restore checkpoints

**Solutions**:
1. Verify write permissions in project directory
2. Check available disk space
3. Ensure Git is initialized in project
4. Check Output panel for errors
5. Try manual checkpoint:
   ```bash
   git commit -m "checkpoint"
   ```

#### Marketplace Not Loading

**Problem**: Marketplace shows loading but doesn't display agents

**Solutions**:
1. Check internet connection
2. Verify backend is running
3. Check API endpoint configuration
4. Clear browser cache (Ctrl+Shift+Delete in webview)
5. Restart VS Code

#### Dashboard Not Updating

**Problem**: Coordination Dashboard shows stale metrics

**Solutions**:
1. Click "Refresh" button in dashboard
2. Check WebSocket connection
3. Verify metrics are being collected
4. Check backend logs
5. Restart dashboard

---

### Performance Issues

#### VS Code Slow/Unresponsive

**Problem**: VS Code becomes slow when extension is active

**Solutions**:
1. Disable verbose logging:
   ```json
   {
     "helix.verboseLogging": false
   }
   ```
2. Disable unnecessary integrations:
   ```json
   {
     "helix.enableCoordinationMonitoring": false,
     "helix.enableAgentNotifications": false
   }
   ```
3. Reduce number of active agents
4. Close unused webviews
5. Check system resources
6. Update VS Code to latest version

#### High Memory Usage

**Problem**: Extension uses excessive memory

**Solutions**:
1. Disable monitoring features
2. Reduce agent count
3. Clear cache:
   ```bash
   rm -rf ~/.helix/cache
   ```
4. Restart VS Code
5. Check for memory leaks in Output panel

#### High CPU Usage

**Problem**: Extension uses excessive CPU

**Solutions**:
1. Disable auto-refresh in dashboard
2. Increase refresh interval:
   ```json
   {
     "helix.dashboard.refreshInterval": 5000
   }
   ```
3. Disable unnecessary agents
4. Check for infinite loops in logs
5. Report performance issue on GitHub

---

### Error Messages

#### "Failed to parse response"

**Problem**: Backend returns invalid response

**Solutions**:
1. Check backend version compatibility
2. Verify backend is running correctly
3. Check backend logs for errors
4. Restart backend
5. Update extension to latest version

#### "Authentication failed"

**Problem**: Cannot authenticate with backend

**Solutions**:
1. Verify credentials are correct
2. Check authentication endpoint
3. Verify token hasn't expired
4. Clear stored credentials:
   ```bash
   rm ~/.helix/credentials
   ```
5. Re-authenticate

#### "Timeout waiting for response"

**Problem**: Request times out

**Solutions**:
1. Increase timeout value
2. Check network connectivity
3. Verify backend is responsive
4. Check for network issues
5. Try again with simpler request

#### "Resource not found"

**Problem**: Requested resource doesn't exist

**Solutions**:
1. Verify resource ID is correct
2. Check if resource was deleted
3. Refresh marketplace/agents
4. Try creating new resource
5. Report if resource should exist

---

### Logging and Debugging

#### Enable Verbose Logging

```json
{
  "helix.verboseLogging": true
}
```

#### View Logs

1. Open Output panel (Ctrl+Shift+U)
2. Select "Helix" from dropdown
3. Review log messages

#### Export Logs

```bash
# Copy logs to file
cp ~/.helix/logs/extension.log ~/helix-logs.txt
```

#### Debug Mode

1. Open VS Code in debug mode:
   ```bash
   code --inspect-extensions=9222
   ```
2. Open Chrome DevTools: `chrome://inspect`
3. Inspect extension process

---

### Getting Help

#### Check Documentation

- [Getting Started](./getting-started.md)
- [Agent Mode Guide](./agent-mode.md)
- [Marketplace Guide](./marketplace.md)
- [API Reference](./api.md)

#### Report Issues

1. Gather information:
   - VS Code version
   - Extension version
   - Error message
   - Steps to reproduce
   - Relevant logs

2. Open GitHub issue:
   - https://github.com/Deathcharge/helix-vscode-extension/issues

3. Include:
   - Clear title
   - Description
   - Steps to reproduce
   - Expected vs actual behavior
   - Logs/screenshots

#### Ask Questions

- GitHub Discussions: https://github.com/Deathcharge/helix-vscode-extension/discussions
- Include context and what you've tried

---

### System Requirements

**Minimum**:
- VS Code 1.85.0+
- 4GB RAM
- 500MB disk space
- Node.js 18+ (for development)

**Recommended**:
- VS Code latest
- 8GB+ RAM
- 1GB+ disk space
- Fast internet connection

---

### FAQ

**Q: Does the extension work offline?**  
A: Basic features work offline, but agent coordination requires backend connection.

**Q: Can I use multiple agents simultaneously?**  
A: Yes, multiple agents coordinate automatically.

**Q: Is my code sent to external servers?**  
A: Only to your configured backend. Configure to use local backend for privacy.

**Q: How do I uninstall the extension?**  
A: Open Extensions (Ctrl+Shift+X), find Helix, click Uninstall.

**Q: Can I contribute to the extension?**  
A: Yes! See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Still having issues? Open a GitHub issue with detailed information!**
