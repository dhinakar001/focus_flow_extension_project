# FocusFlow Testing Strategy

## Goals
- Validate that API contracts remain stable.
- Ensure widgets render placeholder data without errors.
- Confirm Python summarization service responds as expected.

## Tooling
- **JavaScript**: Jest + Supertest for routes and controllers.
- **Python**: Pytest + HTTPX for FastAPI clients.
- **Static Analysis**: ESLint and mypy (optional).

## Test Types
1. **Unit Tests** – Controllers, services, and utilities.
2. **Integration Tests** – API routes hitting in-memory stores.
3. **End-to-End Tests** – Simulate bot interactions and widget rendering flows.

## Sample Commands
- 
pm test – Runs Node.js unit tests.
- pytest python_service – Executes Python unit tests.
- 
pm run lint – Applies linting to JavaScript files.

## CI/CD Suggestions
- Run tests on pull requests with GitHub Actions or similar.
- Publish coverage reports for visibility.
- Block deployments if critical suites fail.

## Manual Verification
- Trigger /health endpoints for quick checks.
- Load widgets locally in a browser to confirm markup integrity.
- Manually invoke bots in a Cliq sandbox environment.
