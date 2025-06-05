# GitHub Actions CI Documentation

Simple, straightforward CI workflow for the Node.js notes app with Docker Compose testing.

## 📋 Overview

We have a **single, simple CI workflow** that:

- **Runs unit tests** with coverage reporting
- **Tests both database backends** (CouchDB and MongoDB) with Docker Compose
- **Keeps it simple** - no performance tests, security scans, or complex scheduling
- **Provides fast feedback** for developers

## 🔧 Build Workflow

### `node.js.yml` - Complete CI Pipeline

**Purpose**: Simple, comprehensive testing for every commit.

**Two Jobs**:

1. **`build`** - Unit tests and coverage
2. **`docker-compose-tests`** - Database integration testing (matrix: CouchDB × MongoDB)

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch

**Execution Flow**:
```
build (unit tests + coverage)
   ↓
docker-compose-tests (parallel: CouchDB + MongoDB)
```

## 🧪 What Gets Tested

### Unit Tests Job
- ✅ **Dependencies installation** (`npm ci`)
- ✅ **Project build** (if build script exists)
- ✅ **Unit test execution** with coverage
- ✅ **Coverage upload** to Codecov

### Docker Compose Tests Job
- ✅ **CouchDB setup** with secure credentials
- ✅ **MongoDB setup** with secure credentials
- ✅ **API functionality** (health, CRUD operations)
- ✅ **Automatic cleanup** after tests

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
```

### What the Validation Script Checks

- ✅ GitHub Actions workflow syntax
- ✅ Docker Compose file syntax
- ✅ Environment variable requirements
- ✅ Docker Compose credential validation

## 📊 Typical Execution Time

**Pull Request/Push:**
- **Unit tests**: ~2-3 minutes
- **Docker Compose tests**: ~4-6 minutes (parallel)
- **Total**: ~6-8 minutes

**What Runs in Parallel:**
- CouchDB and MongoDB tests run simultaneously (matrix strategy)
- Unit tests run first, then Docker Compose tests start

## 🎯 Design Philosophy

**Simple is Better:**
- ✅ **One workflow file** instead of multiple complex ones
- ✅ **Essential testing only** - unit tests + integration tests
- ✅ **Fast feedback** for developers
- ✅ **Easy to understand** and maintain

**No Complexity:**
- ❌ No performance testing
- ❌ No security scanning
- ❌ No scheduled runs
- ❌ No multiple test levels
- ❌ No advanced configurations

## 🚨 Troubleshooting

### Common Issues

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

### Debug Steps

1. **Check workflow syntax**: `./validate-ci.sh workflows-only`
2. **Test Docker Compose locally**: `./test-docker-setups.sh both`
3. **Verify credentials setup**: Check environment variables are set
4. **Review container logs**: Available in GitHub Actions if tests fail

## 📈 Success Criteria

- ✅ **Unit tests pass** with good coverage
- ✅ **CouchDB integration works** (API CRUD operations)
- ✅ **MongoDB integration works** (API CRUD operations)
- ✅ **Clean execution** (no leftover containers/volumes)

## 🔧 Configuration

### Environment Variables

**For local testing:**
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

## 🎯 Best Practices

### For Contributors

1. **Always test locally first:**
   ```bash
   npm test
   ./validate-ci.sh quick
   ```

2. **Ensure credentials are set** when testing Docker Compose locally

3. **Keep Docker environment clean** after testing

### For Maintainers

1. **Monitor CI execution times** - should stay under 10 minutes
2. **Review failed builds** quickly - logs are available in GitHub Actions
3. **Keep the workflow simple** - resist adding complexity

## 🚀 Benefits of This Approach

**Developer Friendly:**
- Fast feedback (~6-8 minutes total)
- Clear pass/fail status
- Easy to debug when things go wrong

**Maintainable:**
- Single workflow file to manage
- Simple job dependencies
- No complex conditional logic

**Reliable:**
- Essential testing only
- Proven patterns
- Minimal moving parts

**Cost Effective:**
- Efficient use of CI minutes
- No unnecessary test runs
- Parallel execution where beneficial

---

This simple approach ensures that every commit is properly tested without overwhelming complexity or long execution times. 