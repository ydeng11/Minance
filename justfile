# Show available recipes
default:
    @just --list

# Install workspace dependencies
install:
    pnpm install

# Start both development servers (run just install first)
dev:
    just --dotenv-filename .env.development _dev

[private]
_dev:
    just _prepare-data development
    pnpm exec tsx scripts/run-with-open-ports.ts dev

# Start the Next.js app in development mode
dev-web:
    pnpm dev:web

# Start the API server in development mode
dev-api:
    just --dotenv-filename .env.development _dev-api

[private]
_dev-api:
    just _prepare-data development
    pnpm dev:api

# Prepare a SQLite database from the deterministic fixture
# Usage: just _prepare-data <development|test>
[private]
_prepare-data DB:
    pnpm migrate:sqlite -- --source services/api/test/fixtures/deterministic-financial-store.json --db services/api/data/{{DB}}-minance.sqlite

# Build the web app
build-web:
    pnpm build:web

# Start both production servers
start:
    just --dotenv-filename .env.production _start

[private]
_start:
    pnpm exec tsx scripts/run-with-open-ports.ts start

# Start the Next.js app in production mode
start-web:
    pnpm start:web

# Start the API server in production mode
start-api:
    just --dotenv-filename .env.production _start-api

[private]
_start-api:
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
# Example: just docker-release 0.1.0
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
    just _prepare-data test
    pnpm test

# Run guardrails and tests with test data preparation
check:
    just guardrails
    just test

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

