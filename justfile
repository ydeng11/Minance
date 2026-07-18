# Show available recipes
default:
    @just --list

# Install workspace dependencies
install:
    pnpm install

# Install dependencies and start both development servers
dev:
    just --dotenv-filename .env.development _dev

[private]
_dev:
    pnpm install
    just _prepare-dev-data
    pnpm exec tsx scripts/run-with-open-ports.ts dev

# Start the Next.js app in development mode
dev-web:
    pnpm dev:web

# Start the API server in development mode
dev-api:
    just --dotenv-filename .env.development _dev-api

[private]
_dev-api:
    just _prepare-dev-data
    pnpm dev:api

[private]
_prepare-dev-data:
    pnpm migrate:sqlite -- --source services/api/test/fixtures/deterministic-financial-store.json --db services/api/data/development-minance.sqlite

# Build the web app
build-web:
    pnpm build:web

# Start both production servers
start:
    pnpm exec tsx scripts/run-with-open-ports.ts start

# Start the Next.js app in production mode
start-web:
    pnpm start:web

# Start the API server in production mode
start-api:
    pnpm start:api

# Build the nightly image for the host arch (test → build → load)
docker-build:
    just test
    docker buildx build --builder orbstack -t ydeng11/minance:nightly -f deploy/docker/Dockerfile.combined --load .
    echo "✅ Image built: ydeng11/minance:nightly"

# Build and push nightly image for amd64 + arm64 (test → buildx → push)
docker-nightly:
    just test
    docker buildx build \
      --platform linux/amd64,linux/arm64 \
      -t ydeng11/minance:nightly \
      -f deploy/docker/Dockerfile.combined \
      --builder multi-builder \
      --push \
      .
    echo "✅ Image built and pushed: ydeng11/minance:nightly (amd64 + arm64)"

# Build and push versioned release image (test → buildx → push)
# Usage: just docker-release VERSION
# Example: just docker-release 2.0.0
docker-release VERSION:
    just test
    docker buildx build \
      --platform linux/amd64,linux/arm64 \
      -t ydeng11/minance:{{VERSION}} \
      -t ydeng11/minance:latest \
      -f deploy/docker/Dockerfile.combined \
      --builder multi-builder \
      --push \
      .
    echo "✅ Image built and pushed: ydeng11/minance:{{VERSION}} + ydeng11/minance:latest"

# Run the project guardrails
guardrails:
    pnpm guardrails

# Run the full test suite
test:
    just --dotenv-filename .env.test _test

[private]
_test:
    pnpm test

# Run guardrails and tests
check:
    just --dotenv-filename .env.test _check

[private]
_check:
    pnpm check

# Run Playwright end-to-end tests
e2e:
    just --dotenv-filename .env.test _e2e

[private]
_e2e:
    pnpm e2e

# Run headed Playwright tests for local debugging
e2e-headed:
    pnpm e2e:headed

# Run accessibility-focused Playwright tests
e2e-a11y:
    pnpm e2e:a11y

# Generate API documentation
docs-api:
    pnpm docs:api

# Migrate JSON data into SQLite
migrate-sqlite:
    pnpm migrate:sqlite

# Validate JSON and SQLite parity
validate-sqlite:
    pnpm validate:sqlite

# Seed the deterministic fixture dataset
seed-fixture:
    pnpm seed:fixture -- --target services/api/test/fixtures/deterministic-financial-store.json
    just _prepare-dev-data

# Load data from the legacy API into the dev database
seed-legacy-api:
    pnpm seed:legacy-api -- --base-url http://10.0.0.20:18080 --start 2024-01-01 --end 2026-12-31
