# Contributor and Agent Checks

This repository supports interchangeable CouchDB and MongoDB backends. New functionality is not complete until it works with both backends, is covered by tests, and is documented.

## Mandatory checks for functionality changes

Run these checks locally before considering a change complete:

```bash
npm test -- --runInBand --coverage
npm run lint
npm run format:check
npm run docs
node scripts/check-docs-coverage.js
./test-docker-setups.sh both
git diff --check
```

The Docker check is required even when unit tests pass. It builds and exercises the complete application once with CouchDB and once with MongoDB, catching container-image omissions, environment differences, database query incompatibilities, and startup or health-check failures.

If the change affects a specific backend, run its focused integration tests as well as the complete Docker check. Do not replace the `both` invocation with only the affected backend.

## Test expectations

- Add or update unit tests for route validation, response contracts, repository behavior, and error paths.
- Add or update integration tests when persistence behavior, ordering, filtering, pagination, deletion, restoration, or database initialization changes.
- Verify active-note and recycle-bin behavior separately; soft-deleted notes must not leak into active-note APIs.
- Verify empty results, malformed input, repository failures, and other boundary conditions for new API behavior.
- Run the full suite after focused tests. Do not hide failures with skipped tests, weakened assertions, or test-pattern exclusions.

## Documentation expectations

- Update `README.md` for public endpoint, request, response, configuration, or behavior changes.
- Add or update JSDoc for every new or changed public route, class, and function, including `@param`, `@returns`, `@throws`, and an `@example` where applicable.
- Use JSDoc type syntax accepted by JSDoc 4.0.5. In particular, do not use TypeScript-style `import('express').Request` expressions; use the project’s supported Express type notation.
- Run `npm run docs` and `node scripts/check-docs-coverage.js`; documentation coverage must remain at or above the 95% threshold.
- Keep generated documentation out of source changes unless the project workflow explicitly requires generated artifacts to be committed.
- Remove completed recommendations from `RECOMMENDATIONS.md` when implementing a roadmap item.

## Persistence and container rules

- Keep the repository contract, CouchDB implementation, MongoDB implementation, and their tests synchronized.
- Use database-level filtering, sorting, counting, and pagination rather than loading complete collections into routes.
- Preserve deterministic ordering when results are exposed in pages or otherwise compared across requests.
- When adding source directories or runtime dependencies, inspect `notes.Dockerfile` and ensure every required runtime file is copied into the image.
- Validate both Compose configurations with `./test-docker-setups.sh both`; clean up failed local services before retrying.

## CI failure prevention

Before pushing, confirm that the local commands above match the CI workflows in `.github/workflows/node.js.yml` and `.github/workflows/docs.yml`. A passing unit suite alone is insufficient: CI also enforces formatting, linting, generated documentation, documentation quality, and both database setups.

When a CI failure reveals a reusable requirement, update this file and the relevant project documentation so the check becomes part of the standard workflow rather than a one-off fix.