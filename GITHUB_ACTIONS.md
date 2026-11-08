# GitHub Actions CI/CD Documentation

Comprehensive CI/CD automation for the Node.js notes app with testing and documentation workflows.

## 📋 Overview

We have **two workflows** that provide testing and documentation automation:

### 🧪 **Testing Workflow** (`node.js.yml`)
- **Runs unit tests** with coverage reporting
- **Tests both database backends** (CouchDB and MongoDB) with Docker Compose
- **Provides fast feedback** for code quality

### 📚 **Documentation Workflow** (`docs.yml`)
- **Generates JSDoc documentation** automatically
- **Validates documentation quality** with coverage analysis
- **Deploys to GitHub Pages** for public access
- **Three-job pipeline** that separates generation, quality checks, and deployment

Both workflows run on `ubuntu-22.04` and are configured in `.github/workflows/`.

## 🔧 Workflows

### `node.js.yml` - Testing Pipeline

**Purpose**: Simple, comprehensive testing for every commit.

**Two Jobs**:

1. **`build`** - Dependency installation and project build across Node.js versions; coverage on Node.js 26
2. **`docker-compose-tests`** - Database integration testing (matrix: CouchDB × MongoDB)

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch

**Execution Flow**:
```
build (Node.js 22/24/26 matrix; coverage on 26)
   ↓
docker-compose-tests (parallel: CouchDB + MongoDB)
```

### `docs.yml` - Documentation Pipeline

**Purpose**: Automated documentation generation, quality control, and deployment.

**Three Jobs**:

1. **`generate-docs`** - Generates and uploads the JSDoc site as a 30-day artifact
2. **`docs-quality`** - Downloads the artifact and runs link and coverage checks
3. **`deploy-docs`** - Publishes the artifact to GitHub Pages after the checks pass

**Triggers**:
- Push to `main` and `develop` branches
- Pull requests to `main` branch
- Release publications

**Execution Flow**:
```
Generate (`checkout`, Node.js 26, `npm ci`, `npm run docs`)
   ↓
Artifact (upload generated `docs/`)
   ↓
Quality Check (download artifact, link validation, coverage analysis)
   ↓
Deploy (GitHub Pages - main branch pushes only)
```

**Key Features**:
- ✅ **Artifact-based handoff**: Generated documentation is passed between jobs
- ✅ **Quality gates**: Documentation must pass link and coverage checks before deployment
- ✅ **Conditional deployment**: Only deploys on main branch pushes
- ✅ **Independent triggers**: Runs on pushes to `main`/`develop`, pull requests to `main`, and published releases

## 🧪 What Gets Tested & Generated

### Testing Pipeline (`node.js.yml`)

#### Unit Tests Job
- ✅ **Dependencies installation** (`npm ci`)
- ✅ **Project build** (if a build script exists) on Node.js 22, 24, and 26
- ✅ **Unit test execution** with coverage on Node.js 26
- ✅ **Coverage upload** to Codecov on Node.js 26 (`CODECOV_TOKEN` secret required)

#### Docker Compose Tests Job
- ✅ **CouchDB setup** with secure credentials
- ✅ **MongoDB setup** with secure credentials
- ✅ **API functionality** (health, CRUD operations)
- ✅ **Automatic cleanup** after tests

### Documentation Pipeline (`docs.yml`)

#### Documentation Generation
- ✅ **JSDoc compilation** from source code comments
- ✅ **Generated site upload** as the `documentation` artifact
- ✅ **30-day artifact retention** for generated `docs/`

#### Quality Validation
- ✅ **Documentation coverage analysis** (95% overall function/class threshold)
- ✅ **Broken link detection** with linkinator
- ✅ **Function/class documentation reporting** and required-tag checks

#### Deployment (Main Branch Only)
- ✅ **GitHub Pages deployment** using the generated documentation artifact
- ✅ **Automatic updates** on every main branch push
- ✅ **Deployment environment**: `github-pages`

## 🛡️ Security Features

### Credential Management

```yaml
# Secure credential generation for each test run
- name: Configure test credentials
  run: |
    echo "MONGODB_PASSWORD=ci_test_$(openssl rand -hex 12)" >> $GITHUB_ENV
```

**Benefits**:
- ✅ **No hardcoded credentials** in workflows
- ✅ **Unique passwords** per test run
- ✅ **Automatic cleanup** prevents credential leakage

## 🧪 Local Testing

### Quick Validation

Before pushing changes, validate locally:

```bash
# Validate workflows and compose files
./validate-ci.sh quick

# Test both databases locally
./test-docker-setups.sh both

# Test individual databases
./test-docker-setups.sh mongodb
./test-docker-setups.sh couchdb

# Test documentation pipeline locally
npm run docs                           # Generate documentation
node scripts/check-docs-coverage.js    # Run quality checks
npm run docs:serve                     # Preview locally
```

### What the Validation Script Checks

#### Testing Validation
- ✅ GitHub Actions workflow syntax
- ✅ Docker Compose file syntax
- ✅ Environment variable requirements
- ✅ Docker Compose credential validation

#### Documentation Validation
- ✅ Workflow and Docker Compose validation (via `validate-ci.sh`)
- ✅ Documentation generation (`npm run docs`)
- ✅ Documentation coverage threshold (`node scripts/check-docs-coverage.js`)
- ✅ Link validation in CI via `linkinator`

## 📊 Typical Execution Time

### Testing Pipeline (`node.js.yml`)
- The `build` job runs a Node.js `22.x`/`24.x`/`26.x` matrix.
- Coverage and Codecov upload run only for the `26.x` matrix entry.
- The Docker Compose matrix starts only after `build` completes, with CouchDB and MongoDB running in parallel.

### Documentation Pipeline (`docs.yml`)
- `generate-docs` and `docs-quality` run sequentially through the uploaded artifact.
- `deploy-docs` runs after both jobs and only for pushes to `main`.
- Pull requests and published releases run generation and quality checks but do not satisfy the deployment condition.

## 🎯 Design Philosophy

**Simple is Better:**
- ✅ **Two focused workflows** - testing and documentation (single responsibility)
- ✅ **Essential automation only** - comprehensive testing + documentation
- ✅ **Fast feedback** for developers
- ✅ **Easy to understand** and maintain
- ✅ **Explicit job dependencies** - documentation quality and deployment consume generated artifacts

**Quality Without Complexity:**
- ✅ **Automated quality gates** for code and documentation
- ✅ **Parallel execution** where beneficial
- ✅ **Conditional deployment** based on branch and checks
- ✅ **Professional documentation** with GitHub Pages integration

**No Unnecessary Complexity:**
- ❌ No performance testing
- ❌ No security scanning
- ❌ No scheduled runs
- ❌ No multiple test levels
- ❌ No advanced configurations

## 🚨 Troubleshooting

### Common Issues

#### Testing Pipeline Issues

**1. Unit test failures:**
```bash
# Run locally first
npm test
npm run test:coverage
```

**2. Docker Compose test failures:**
```bash
# Test locally with proper credentials
export MONGODB_USERNAME="test_user"
export MONGODB_PASSWORD="test_password"
export MONGODB_DATABASE="test_db"
./test-docker-setups.sh mongodb
```

**3. Workflow syntax issues:**
```bash
# Validate before pushing
./validate-ci.sh workflows-only
```

#### Documentation Pipeline Issues

**4. Documentation generation failures:**
```bash
# Test JSDoc compilation locally
npm run docs

# Check the generated output
ls -la docs/
```

**5. Documentation coverage failures:**
```bash
# Run coverage analysis locally
node scripts/check-docs-coverage.js

# Check for missing @param, @returns, @example tags
```

**6. GitHub Pages deployment failures:**
```bash
# Verify documentation builds correctly
npm run docs
ls -la docs/    # Should contain index.html and other files

# Check GitHub Pages settings in repository
```

**7. Broken link detection failures:**
```bash
# Test link validation locally
npm install -g linkinator
linkinator docs/ --recurse --silent --skip "https://www.linkedin.com/in/vadim-starichkov/"
```

### Debug Steps

#### For Testing Issues
1. **Check workflow syntax**: `./validate-ci.sh workflows-only`
2. **Test Docker Compose locally**: `./test-docker-setups.sh both`
3. **Verify credentials setup**: Check environment variables are set
4. **Review container logs**: Available in GitHub Actions if tests fail

#### For Documentation Issues
1. **Generate documentation locally**: `npm run docs`
2. **Run quality checks**: `node scripts/check-docs-coverage.js`
3. **Test local preview**: `npm run docs:serve`
4. **Check GitHub Pages settings**: Repository → Settings → Pages
5. **Review workflow logs**: GitHub Actions → docs.yml workflow

## 📈 Success Criteria

### Testing Pipeline
- ✅ **Unit tests pass** with good coverage
- ✅ **CouchDB integration works** (API CRUD operations)
- ✅ **MongoDB integration works** (API CRUD operations)
- ✅ **Clean execution** (no leftover containers/volumes)

### Documentation Pipeline
- ✅ **Documentation generates successfully** from JSDoc comments
- ✅ **Quality checks pass** (95% coverage threshold)
- ✅ **No broken links** in generated documentation
- ✅ **GitHub Pages deployment succeeds** (main branch only)
- ✅ **Documentation is publicly accessible** and up-to-date

### Combined Success
- ✅ **Both pipelines complete** within expected time frames
- ✅ **Parallel execution** works without conflicts
- ✅ **Quality gates** prevent deployment of failing builds
- ✅ **Fast feedback** for developers on all aspects

## 🔧 Configuration

### Environment Variables

#### For Testing Pipeline

**Local testing:**
```bash
# MongoDB
export MONGODB_USERNAME="your_username"
export MONGODB_PASSWORD="your_password"
export MONGODB_DATABASE="your_database"

# CouchDB
export COUCHDB_USERNAME="your_username"
export COUCHDB_PASSWORD="your_password"
export COUCHDB_DATABASE="your_database"
```

**In CI:**
- Credentials are automatically generated with secure random values
- Each test run gets unique credentials
- No secrets need to be configured in GitHub repository settings

#### For Documentation Pipeline

**Local development:**
```bash
# Node.js version (the workflow uses Node.js 26)
node --version

# Documentation generation
npm run docs                           # Generate docs
npm run docs:serve                     # Local preview
node scripts/check-docs-coverage.js    # Quality check
```

**GitHub Pages setup:**
1. **Repository Settings** → **Pages**
2. **Source**: GitHub Actions
3. **Automatic deployment** on main branch pushes

**Node.js Requirements:**
```json
{
  "engines": {
    "node": ">=22.0.0",
    "npm": ">=10.0.0"
  }
}
```

The test workflow covers Node.js 22, 24, and 26. The documentation workflow uses Node.js 26. The package requires Node.js 22 or newer and npm 10 or newer.

## 🎯 Best Practices

### For Contributors

1. **Always test locally first:**
   ```bash
   # Test code
   npm test
   ./validate-ci.sh quick
   
   # Test documentation
   npm run docs
   node scripts/check-docs-coverage.js
   ```

2. **Ensure credentials are set** when testing Docker Compose locally

3. **Keep Docker environment clean** after testing

4. **Write comprehensive JSDoc comments:**
   ```javascript
   /**
    * Brief description
    * @param {type} name - Description
    * @returns {type} Description
    * @throws {Error} When error occurs
    * @example
    * // Usage example
    */
   ```

5. **Check documentation coverage** before pushing - aim for 95%+

### For Maintainers

1. **Monitor CI execution times** - should stay under 10 minutes total
2. **Review failed builds** quickly - logs are available in GitHub Actions
3. **Keep workflows simple** - resist adding complexity
4. **Monitor documentation quality:**
   - Check coverage reports in failed builds
   - Ensure GitHub Pages deploys successfully
   - Review documentation accuracy periodically
5. **Maintain Node.js LTS compatibility** - update when new LTS releases

## 🚀 Benefits of This Approach

**Developer Friendly:**
- **Clear workflow stages** for testing and documentation
- **Clear pass/fail status** for testing and documentation
- **Easy to debug** when things go wrong
- **Automatic documentation** always up-to-date with code

**Maintainable:**
- **Two focused workflows** - clear separation of concerns
- **Explicit job dependencies** - generated documentation is quality-checked before deployment
- **Simple dependencies** - no complex conditional logic
- **Quality gates** prevent bad deployments

**Reliable:**
- **Essential automation only** - testing + documentation
- **Proven patterns** with industry best practices
- **Minimal moving parts** reduce failure points
- **Professional documentation** with automated quality control

**Cost Effective:**
- **Artifact reuse** - generated documentation is passed between documentation jobs
- **Parallel execution** where beneficial
- **No redundant operations** (eliminated duplicate checkouts/setups)
- **Smart conditional deployment** (main branch only)

**Professional Results:**
- **Complete test coverage** across database backends
- **Always up-to-date documentation** on GitHub Pages
- **Quality-gated deployments** ensure reliability
- **Public API documentation** for consumers

---

This comprehensive approach ensures that every commit is properly tested AND documented, providing both code quality and professional documentation without overwhelming complexity or long execution times. 