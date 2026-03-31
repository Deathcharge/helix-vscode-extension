# VSCode Marketplace Publishing Checklist

This document outlines the steps needed to publish the Helix VS Code Extension to the VSCode Marketplace.

## Prerequisites

### 1. Create Publisher Account

- [ ] Go to https://marketplace.visualstudio.com/
- [ ] Click "Publish extensions"
- [ ] Sign in with Microsoft account (create if needed)
- [ ] Create publisher profile:
  - [ ] Publisher name: `samsara-helix`
  - [ ] Display name: `Samsara Helix`
  - [ ] Email: your-email@example.com
  - [ ] Website: https://samsarahelix.com (when available)

### 2. Install Publishing Tools

```bash
npm install -g @vscode/vsce
```

Verify installation:
```bash
vsce --version
```

### 3. Create Personal Access Token (PAT)

- [ ] Go to https://dev.azure.com/
- [ ] Create organization (if needed)
- [ ] Go to User Settings → Personal access tokens
- [ ] Create new token:
  - [ ] Name: `vscode-marketplace`
  - [ ] Scopes: Select "Marketplace (manage)"
  - [ ] Expiration: 1 year
  - [ ] Copy token (save securely!)

## Pre-Publication Checks

### Code Quality

- [ ] Run tests: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Build extension: `npm run compile`
- [ ] Build webviews: `npm run build:webviews`
- [ ] Check for TypeScript errors: `npm run type-check`

### Documentation

- [ ] README.md is comprehensive
- [ ] Getting Started guide is clear
- [ ] All docs links are valid
- [ ] Screenshots/GIFs added (if applicable)
- [ ] Troubleshooting guide is helpful

### Configuration

- [ ] package.json has correct metadata:
  - [ ] `name`: helix-vscode-extension
  - [ ] `displayName`: Helix
  - [ ] `publisher`: samsara-helix
  - [ ] `version`: Semantic versioning (e.g., 1.0.0)
  - [ ] `description`: Clear and concise
  - [ ] `keywords`: Relevant terms
  - [ ] `categories`: Appropriate categories
  - [ ] `icon`: icon.png exists (128x128px minimum)
  - [ ] `license`: Apache-2.0
  - [ ] `repository`: Points to GitHub repo
  - [ ] `bugs`: Points to GitHub issues

### Assets

- [ ] Icon (icon.png):
  - [ ] 128x128px minimum
  - [ ] PNG format
  - [ ] Professional appearance
  - [ ] Readable at small sizes

- [ ] Screenshots (optional but recommended):
  - [ ] 1280x720px or larger
  - [ ] PNG or GIF format
  - [ ] Show key features
  - [ ] Add captions if helpful

### Security

- [ ] No hardcoded secrets
- [ ] No API keys in code
- [ ] Dependencies are up to date
- [ ] No known vulnerabilities
- [ ] Security policy documented

## Publishing Steps

### 1. Create Release Build

```bash
npm run vscode:prepublish
```

This creates optimized build for distribution.

### 2. Package Extension

```bash
vsce package
```

This creates `.vsix` file (extension package).

Verify package:
```bash
ls -lh *.vsix
```

### 3. Test Package Locally

```bash
code --install-extension helix-vscode-extension-1.0.0.vsix
```

Test all features:
- [ ] Extension loads
- [ ] All commands work
- [ ] Webviews render correctly
- [ ] Settings apply
- [ ] No console errors

### 4. Publish to Marketplace

```bash
vsce publish -p <YOUR_PAT_TOKEN>
```

Or publish without token (will prompt):
```bash
vsce publish
```

### 5. Verify Publication

- [ ] Go to https://marketplace.visualstudio.com/
- [ ] Search for "Helix"
- [ ] Verify listing appears
- [ ] Check all information is correct
- [ ] Test installation from marketplace
- [ ] Verify version number

## Post-Publication

### Marketplace Optimization

- [ ] Add extension to collections
- [ ] Request featured status (if eligible)
- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback
- [ ] Track download metrics

### Ongoing Maintenance

- [ ] Monitor for security issues
- [ ] Update dependencies regularly
- [ ] Fix reported bugs
- [ ] Add features based on feedback
- [ ] Release updates regularly

### Update Process

For each update:

1. Update version in package.json
2. Update CHANGELOG.md
3. Commit changes
4. Create git tag
5. Build and test
6. Publish with: `vsce publish`

## Version Management

### Semantic Versioning

Follow semver: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Changelog Format

```markdown
## [1.0.1] - 2024-03-30

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description
```

## Troubleshooting

### Publisher Not Found

```bash
vsce login samsara-helix
```

### Authentication Failed

- [ ] Verify PAT token is correct
- [ ] Check token hasn't expired
- [ ] Verify token has "Marketplace (manage)" scope
- [ ] Create new token if needed

### Package Too Large

- [ ] Remove unnecessary files
- [ ] Update .vscodeignore
- [ ] Minify JavaScript
- [ ] Compress images

### Build Errors

```bash
npm clean-install
npm run compile
npm run build:webviews
```

## Security Considerations

### Before Publishing

- [ ] Scan dependencies for vulnerabilities:
  ```bash
  npm audit
  ```
- [ ] Fix critical issues
- [ ] Document known issues
- [ ] Add security policy

### After Publishing

- [ ] Monitor for reported vulnerabilities
- [ ] Update dependencies promptly
- [ ] Release security patches quickly
- [ ] Communicate security updates

## Marketing

### Promotion Ideas

- [ ] Create demo video
- [ ] Write blog post
- [ ] Share on social media
- [ ] Submit to VS Code newsletter
- [ ] Share in developer communities
- [ ] Create tutorial content

### Community Engagement

- [ ] Respond to reviews
- [ ] Answer questions
- [ ] Fix reported issues
- [ ] Implement feature requests
- [ ] Build community

## Metrics to Track

- [ ] Total installs
- [ ] Monthly active users
- [ ] Average rating
- [ ] Number of reviews
- [ ] Feature usage
- [ ] Error rates

## Resources

- [VS Code Extension Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)
- [Marketplace Policies](https://marketplace.visualstudio.com/manage/publishers/samsara-helix/extensions)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Checklist Summary

- [ ] Publisher account created
- [ ] Publishing tools installed
- [ ] Personal access token created
- [ ] Code quality verified
- [ ] Documentation complete
- [ ] Configuration correct
- [ ] Assets prepared
- [ ] Security checked
- [ ] Package created and tested
- [ ] Published to marketplace
- [ ] Listing verified
- [ ] Metrics tracked

---

**Ready to publish? Follow this checklist and you'll be live on the VSCode Marketplace! 🚀**

For questions or issues, open a GitHub issue or check the troubleshooting section.
