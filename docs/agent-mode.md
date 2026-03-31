# Agent Mode Guide

Agent Mode is the core feature of the Helix VS Code Extension, enabling autonomous code generation and modification with safety checks.

## What is Agent Mode?

Agent Mode allows you to describe coding tasks in natural language, and Helix agents will autonomously:
- Generate code
- Modify existing code
- Refactor for better practices
- Add tests
- Optimize performance
- Fix bugs

All with your approval and safety checks in place.

## Activating Agent Mode

### Method 1: Command Palette

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "Helix: Activate Agent Mode"
3. Press Enter

### Method 2: Keyboard Shortcut

Press `Ctrl+Shift+H A` (Windows/Linux) or `Cmd+Shift+H A` (Mac)

### Method 3: Agent Panel

1. Open the Helix Panel (click Helix icon in sidebar)
2. Click "Activate Agent Mode"

## Using Agent Mode

### Basic Workflow

1. **Describe Your Task**
   - Be specific and clear
   - Example: "Create a React component that displays a list of users with pagination"

2. **Review Generated Code**
   - The agent will generate code based on your description
   - Review the code for correctness
   - Check if it matches your requirements

3. **Approve or Modify**
   - Click "Approve" to accept the changes
   - Click "Modify" to request changes
   - Click "Reject" to discard and try again

4. **Iterate**
   - Provide feedback on what to change
   - Agent will refine the code
   - Repeat until satisfied

### Example Tasks

#### Generate a New Component

**Task**: "Create a React component for a weather widget that displays current temperature, conditions, and a 5-day forecast"

**What Agent Will Do**:
- Create component structure
- Add state management
- Include API integration
- Add styling
- Handle error cases

#### Refactor Existing Code

**Task**: "Refactor this function to use async/await instead of promises"

**What Agent Will Do**:
- Convert promise chains to async/await
- Handle errors with try/catch
- Maintain functionality
- Improve readability

#### Add Tests

**Task**: "Write comprehensive unit tests for this utility function"

**What Agent Will Do**:
- Create test file
- Write test cases for all scenarios
- Include edge cases
- Add assertions

#### Optimize Performance

**Task**: "Optimize this database query for better performance"

**What Agent Will Do**:
- Add indexes
- Optimize joins
- Reduce N+1 queries
- Add caching where appropriate

## Safety Features

### Approval System

Every change requires your approval before being applied:

- **Review Panel** - See exactly what will change
- **Diff View** - Compare old vs new code
- **Rollback** - Easily undo changes with checkpoints

### Safety Checks

Agent Mode includes built-in safety features:

- **Syntax Validation** - Ensures generated code is syntactically correct
- **Type Checking** - Validates TypeScript types
- **Linting** - Checks code style
- **Security Scan** - Detects potential security issues

### Checkpoint System

Always create a checkpoint before major changes:

```
Ctrl+Shift+P → "Helix: Create Checkpoint"
```

Then you can safely experiment and restore if needed:

```
Ctrl+Shift+P → "Helix: Restore Checkpoint"
```

## Advanced Features

### Context Awareness

Agent Mode understands your project context:

- **Project Structure** - Knows your file organization
- **Existing Code** - References similar patterns in your codebase
- **Dependencies** - Aware of installed packages
- **Configuration** - Respects your project settings

### Multi-Agent Coordination

Multiple agents can work together:

- **Specialist Agents** - Different agents for different tasks
- **Collaboration** - Agents coordinate to solve complex problems
- **Conflict Resolution** - Automatic resolution of conflicting changes

### Memory System

Agent Mode remembers your preferences:

- **Code Style** - Learns your coding style
- **Patterns** - Remembers common patterns you use
- **Preferences** - Respects your architectural decisions

## Configuration

### Agent Mode Settings

Open VS Code Settings and search for "Helix Agent":

```json
{
  "helix.agentMode.autoApprove": false,
  "helix.agentMode.maxIterations": 5,
  "helix.agentMode.timeout": 60000,
  "helix.agentMode.safetyLevel": "strict",
  "helix.agentMode.verboseLogging": false
}
```

### Safety Level Options

- **strict** - Requires approval for all changes
- **balanced** - Approves minor changes automatically
- **permissive** - Auto-approves most changes (use with caution)

## Troubleshooting

### Agent Not Responding

1. Check Agent Panel for connection status
2. Verify backend is running
3. Check network connectivity
4. Review error logs in Output panel

### Generated Code Not Correct

1. Provide more specific instructions
2. Include code examples
3. Reference similar patterns in your codebase
4. Try breaking down the task into smaller steps

### Performance Issues

1. Reduce task complexity
2. Limit context size
3. Disable verbose logging
4. Check system resources

### Safety Checks Failing

1. Review the error message
2. Fix the issue manually or request modifications
3. Check if dependencies are installed
4. Verify project configuration

## Best Practices

### Be Specific

❌ Bad: "Create a component"  
✅ Good: "Create a React component for a login form with email, password, and remember-me checkbox"

### Provide Context

Include relevant information:
- Framework/library versions
- Coding standards
- Project structure
- Related code examples

### Use Checkpoints

Create checkpoints before:
- Major refactoring
- Experimental features
- Significant changes

### Review Carefully

Always review generated code:
- Check for correctness
- Verify it matches requirements
- Look for potential issues
- Test before committing

### Iterate Gradually

Break complex tasks into steps:
1. Generate basic structure
2. Add features incrementally
3. Refactor and optimize
4. Add tests and documentation

## Advanced Usage

### Batch Operations

Process multiple files:

1. Select files in Explorer
2. Activate Agent Mode
3. Describe batch operation
4. Agent processes all files

### Custom Instructions

Set project-specific instructions:

1. Create `.helix/instructions.md`
2. Add your coding standards
3. Agent will follow these instructions

### Integration with Git

Agent Mode integrates with Git:

- **Auto-commit** - Optionally auto-commit changes
- **Branch Creation** - Create feature branches
- **PR Generation** - Generate pull requests

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Activate Agent Mode | Ctrl+Shift+H A |
| Approve Changes | Ctrl+Enter |
| Reject Changes | Ctrl+Backspace |
| Request Modification | Ctrl+Shift+Enter |
| Create Checkpoint | Ctrl+Shift+C |
| Restore Checkpoint | Ctrl+Shift+R |

## Tips & Tricks

### Combine with Chat Panel

Use Chat Panel for discussions while Agent Mode generates code:
- Ask questions about implementation
- Get explanations of generated code
- Discuss architectural decisions

### Use Memory System

Agent remembers your preferences:
- Coding style
- Common patterns
- Project structure
- Naming conventions

### Monitor Metrics

Keep Coordination Dashboard open:
- Watch agent performance
- Identify bottlenecks
- Optimize settings based on metrics

---

**Master Agent Mode and accelerate your development! 🚀**
