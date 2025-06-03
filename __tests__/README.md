# Tests for Node.js Simple Notes App

This directory contains tests for the Node.js Simple Notes App.

## Test Structure

- `__tests__/models/` - Tests for data models
- `__tests__/api/` - Tests for API endpoints
- `__tests__/routes/` - Tests for route handlers

## Running Tests

To run all tests:

```bash
npm test
```

To run a specific test file:

```bash
npm test -- __tests__/models/note.test.js
```

## Test Coverage

The tests cover:

1. **Note Model**
   - Creating notes with default and custom values
   - Converting between Note objects and plain objects

2. **Health Endpoint**
   - Verifying the health endpoint returns the correct status

3. **Notes API Routes**
   - GET /api/notes - Retrieving all notes
   - POST /api/notes - Creating new notes
   - Validation of required fields

## Adding New Tests

When adding new tests:

1. Place them in the appropriate directory based on what they're testing
2. Follow the existing patterns for mocking dependencies
3. Ensure tests are isolated and don't depend on external services