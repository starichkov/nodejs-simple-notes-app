# Junie Project Guidelines — Node.js Simple Notes App

These guidelines help Junie make minimal, correct changes to this repository and understand how to validate them.

## Project Overview
A RESTful Notes API built with Node.js (ES Modules) and Express, featuring a database‑agnostic architecture with interchangeable NoSQL backends. The app currently supports CouchDB and MongoDB via repository implementations, includes a lightweight web UI, and provides JSDoc-based documentation and Jest tests. Target runtime includes Node.js 20, 22, and 24 (LTS versions).

Key characteristics:
- Layered design: Model → Repository (vendor-specific) → API (Express routes)
- Recycle Bin flow (soft delete + restore, with permanent delete)
- Environment-driven configuration and Docker Compose setups per database

## Repository Layout (top-level)
- src/ — application source code (server, routes, repositories, models)
- __tests__/ — Jest test suite
- scripts/ — helper scripts for docs and maintenance
- docs/ — generated JSDoc output (created by scripts)
- docker-compose.couchdb.yml — CouchDB stack for local dev
- docker-compose.mongodb.yml — MongoDB stack for local dev
- couchdb.Dockerfile, mongodb.Dockerfile, notes.Dockerfile — container images
- env.template — template of required environment variables
- jest.config.js — Jest configuration
- jsdoc.config.json — JSDoc configuration
- README.md — product overview and setup
- DOCUMENTATION.md — documentation workflow and tips

## Prerequisites
- Node.js: 20.x, 22.x, or 24.x (as enforced by package.json engines)
- npm: 10+
- One database backend available locally (CouchDB ≥3.5.1 or MongoDB ≥7.0.28), or use Docker Compose

## Local Development
1) Clone and install
- npm install

2) Configure environment
- cp env.template .env
- Choose a DB vendor via DB_VENDOR=couchdb or DB_VENDOR=mongodb
- For CouchDB: set COUCHDB_URL and COUCHDB_DB_NAME
- For MongoDB: set MONGODB_URL and MONGODB_DB_NAME
- Optional server config: HOST, PORT

3) Run the server
- npm start
- Server binds to HOST:PORT (defaults in README); open the web UI in your browser

## Using Docker Compose (recommended for full stack)
- CouchDB: docker-compose -f docker-compose.couchdb.yml up --build
- MongoDB: docker-compose -f docker-compose.mongodb.yml up --build
Ensure .env contains the required credentials before starting.

## Tests
- Run unit/integration tests: npm test
- Run with coverage: npm run test:coverage
- Open coverage report: npm run test:coverage:open (Linux requires xdg-open)
Notes:
- Jest runs under Node 24 with experimental VM modules flag set by the script

## Documentation
- Generate docs: npm run docs
- Watch docs: npm run docs:watch
- Serve docs locally: npm run docs:serve (http://localhost:8080)
- Version docs for releases: npm run docs:version
See DOCUMENTATION.md for details.

## Code Style and Conventions
- ESM only ("type": "module"); prefer async/await and modern Node 24 APIs
- Keep repository interface boundaries clean when touching data access code
- Add or update Jest tests when changing behavior
- JSDoc for public methods and API routes is encouraged
- No separate build step is required; server starts with node src/notes-api-server.js

## CI/CD
- GitHub Actions workflows validate tests and documentation (see .github/workflows)
- validate-ci.sh and test-docker-setups.sh provide extra checks locally if needed

## Guidance for Junie (this assistant)
- Make the minimal change required to satisfy the issue
- When renaming code entities, use the dedicated rename tool so all references update safely
- Prefer adding tests or adjusting existing ones to validate new behavior when applicable
- Respect the supported Node.js versions (20, 22, 24); avoid adding dependencies unnecessarily
- If environment-sensitive features are involved, document .env expectations succinctly

## Helpful References
- Primary setup and usage: README.md
- Docs workflow: DOCUMENTATION.md
- Scripts and commands: package.json scripts section
