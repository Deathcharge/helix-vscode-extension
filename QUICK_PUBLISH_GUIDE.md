# Quick Publishing Guide - VSCode Marketplace

**TL;DR**: 3 steps to publish the Helix extension to VSCode Marketplace

---

## Step 1: Setup (One-Time)

### 1.1 Create Publisher Account

1. Go to https://marketplace.visualstudio.com/
2. Click "Publish extensions"
3. Sign in with Microsoft account (create if needed)
4. Create publisher:
   - **Publisher ID**: `samsara-helix`
   - **Display Name**: `Samsara Helix`
   - **Email**: your-email@example.com

### 1.2 Create Personal Access Token (PAT)

1. Go to https://dev.azure.com/
2. Click your profile → Personal access tokens
3. Click "New Token"
4. Configure:
   - **Name**: `vscode-marketplace`
   - **Scopes**: Select "Marketplace (manage)"
   - **Expiration**: 1 year
5. **Copy and save the token** (you'll need it)

### 1.3 Install Publishing Tool

```bash
npm install -g @vscode/vsce
```

Verify:
```bash
vsce --version
```

---

## Step 2: Prepare for Publishing

### 2.1 Verify Everything

```bash
cd /home/ubuntu/helix-vscode-extension

# Run tests
npm test

# Run linter
npm run lint

# Build extension
npm run compile
npm run build:webviews

# Check for errors
npm run type-check
```

### 2.2 Create Production Build

```bash
npm run vscode:prepublish
```

### 2.3 Package Extension

```bash
vsce package
```

This creates a `.vsix` file (the extension package).

### 2.4 Test Package Locally

```bash
code --install-extension helix-vscode-extension-1.0.0.vsix
```

Test in VS Code:
- Open Helix panel
- Try Agent Mode
- Check all commands work
- Verify no console errors

---

## Step 3: Publish to Marketplace

### 3.1 Publish Command

```bash
cd /home/ubuntu/helix-vscode-extension
vsce publish -p <YOUR_PAT_TOKEN>
```

Replace `<YOUR_PAT_TOKEN>` with your personal access token from Step 1.2

### 3.2 Alternative: Publish Without Token (Interactive)

```bash
vsce publish
```

This will prompt you for your token.

### 3.3 Verify Publication

1. Go to https://marketplace.visualstudio.com/
2. Search for "Helix"
3. Verify listing appears
4. Check all information is correct
5. Test installation from marketplace

---

## Updating the Extension

When you make updates:

### Update Version

Edit `package.json`:
```json
{
  "version": "1.0.1"
}
```

### Update Changelog

Edit `CHANGELOG.md`:
```markdown
## [1.0.1] - 2024-03-30

### Added
- New feature

### Fixed
- Bug fix
```

### Publish Update

```bash
npm run vscode:prepublish
vsce publish -p <YOUR_PAT_TOKEN>
```

---

## Troubleshooting

### "Publisher not found"

```bash
vsce login samsara-helix
```

Then try publishing again.

### "Authentication failed"

- Verify your PAT token is correct
- Check token hasn't expired
- Create new token if needed
- Verify token has "Marketplace (manage)" scope

### "Package too large"

Update `.vscodeignore` to exclude unnecessary files:
```
**/*.map
**/*.test.ts
node_modules/**/test/**
```

Then rebuild and republish.

### Build errors

```bash
npm clean-install
npm run compile
npm run build:webviews
npm run vscode:prepublish
```

---

## Full Documentation

For detailed information, see:
- `MARKETPLACE_PUBLISHING.md` - Complete checklist
- `docs/getting-started.md` - User guide
- `README.md` - Extension overview

---

## Key Commands Reference

```bash
# Development
npm install              # Install dependencies
npm run compile         # Compile TypeScript
npm run build:webviews  # Build React components
npm run watch          # Watch mode

# Testing
npm test               # Run tests
npm run lint          # Run linter
npm run type-check    # Check TypeScript

# Publishing
npm run vscode:prepublish  # Production build
vsce package               # Create .vsix file
vsce publish -p TOKEN      # Publish to marketplace

# Local testing
code --install-extension helix-vscode-extension-1.0.0.vsix
```

---

## Marketplace Links

- **Marketplace**: https://marketplace.visualstudio.com/
- **Publisher Dashboard**: https://marketplace.visualstudio.com/manage/publishers/samsara-helix
- **Extension Page**: https://marketplace.visualstudio.com/items?itemName=samsara-helix.helix-vscode-extension
- **GitHub Repo**: https://github.com/Deathcharge/helix-vscode-extension

---

## Success Checklist

Before publishing:
- [ ] All tests pass
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Version updated in package.json
- [ ] Changelog updated
- [ ] Local package tested
- [ ] PAT token ready

After publishing:
- [ ] Listing appears on marketplace
- [ ] All information correct
- [ ] Installation works
- [ ] Features work as expected
- [ ] Monitor reviews

---

## Need Help?

- **Issues**: https://github.com/Deathcharge/helix-vscode-extension/issues
- **Discussions**: https://github.com/Deathcharge/helix-vscode-extension/discussions
- **VSCode Docs**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

---

**Ready to publish? You've got this! 🚀**
