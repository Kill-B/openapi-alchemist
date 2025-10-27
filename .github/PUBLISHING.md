# Publishing Guide

## Prerequisites

1. **NPM Account Setup**: Ensure you have an npm account
2. **NPM Token**: Create an access token on npm (https://www.npmjs.com/settings/your-username/tokens)
3. **GitHub Secret**: Add your npm token to GitHub Secrets:
   - Go to: Settings → Secrets and variables → Actions → New repository secret
   - Name: `NPM_TOKEN`
   - Value: Your npm access token

## Publishing Process

### Automatic Publishing via GitHub Actions

1. **Update version** in `package.json`
2. **Commit and push** your changes
3. **Create and push a tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. **GitHub Action will automatically**:
   - Run all tests
   - Build the package
   - Publish to npm

### Manual Publishing (Alternative)

If you prefer to publish manually:

```bash
# Build the package
npm run build

# Run tests
npm test

# Publish to npm
npm publish --access public
```

## Versioning

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version (1.0.0): Breaking changes
- **MINOR** version (0.1.0): New features, backwards compatible
- **PATCH** version (0.0.1): Bug fixes, backwards compatible

## Post-Publish

After publishing, the package will be available at:
https://www.npmjs.com/package/openapi-alchemist
