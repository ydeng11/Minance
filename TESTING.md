# Local Testing & E2E Strategy

## 1. Unit & Integration Testing (Frontend)

We use **Vitest** + **React Testing Library** for frontend logic and component tests.
Network calls inside Vitest are mocked via **MSW** (`src/main/webui/src/test/setup.ts`), so hooks and services can run without a live backend.

### Running Tests
```bash
cd src/main/webui
npm run test
```

### Writing Tests
- **Hooks**: Test custom hooks (like `useMerchantAnalytics`) using `@testing-library/react-hooks`. This isolates logic from UI.
- **Components**: Test components using `@testing-library/react`. Mock complex children or contexts if necessary.

## 2. End-to-End (E2E) Testing (Full Stack)

We use **Playwright (Java)** to test the application running as a whole (Quarkus backend + React frontend).

### Running E2E Tests
```bash
# Run all Java E2E tests
./mvnw test -Dtest="*E2ETest"

# Run specific test class
./mvnw test -Dtest="OverviewE2ETest"
```

The Java E2E tests are organized by feature and use the Page Object pattern:
- **Test Classes**: Located in `src/test/java/today/ihelio/minance/webui/`
  - `OverviewE2ETest` - Tests overview page tiles, API data loading, and transaction table
  - `VisualizationE2ETest` - Tests expense analysis, merchant analytics, and date range selection
  - `CategoriesE2ETest` - Tests category linking and grouping management
  - `AccountsE2ETest` - Tests account viewing and management
  - `ImportE2ETest` - Tests CSV import workflow end-to-end
- **Page Objects**: Located in `src/test/java/today/ihelio/minance/webui/pages/`
  - `BasePage` - Common navigation and utility methods
  - `OverviewPage`, `VisualizationPage`, `CategoriesPage`, `AccountsPage` - Page-specific selectors
- **Base Test**: `BaseE2ETest` provides shared infrastructure (database seeding, Playwright context, utility methods)

These tests run inside `@QuarkusTest` with `QuinoaTestProfiles.Enable` so the backend and Vite build run together in the same JVM. They use Playwright (Java) and provide comprehensive coverage of:
- Data fetching and API calls
- UI element visibility and data validation
- User interactions (clicks, form fills, file uploads)
- Date range selection and chart refresh
- Transaction import and persistence

### E2E Strategy
- **Data State**: Tests use `TestDataResource.java` endpoints to seed and reset the database before each test.
- **Seed Data**: `TestDataResource.java` provides endpoints like `/api/test/seed` and `/api/test/seed/extensive` to populate the database. Each test method hits these endpoints before running so UI assertions always start from a deterministic dataset.

### Test Categories

#### Functional Tests
- **Transactions**: CRUD operations, filtering, sorting.
- **Accounts**: Creation, editing, deletion.
- **Categories**: Management and mapping.
- **CSV Import**: Uploading and parsing bank CSVs.
- **Visualization**: Chart rendering and data verification.

### CI/CD Integration
Tests run automatically on GitHub Actions (`.github/workflows/tests.yml`) on push and PR:
- **frontend**: installs `src/main/webui` and runs lint and Vitest (`--run`).
- **backend**: executes `./mvnw test` which includes unit tests, service layer tests, and Java-based Playwright E2E tests.

## 3. Backend Tests

- **Service layer**: `src/test/java/today/ihelio/minance/service` (e.g., `AccountServiceTest`, `TransactionServiceTest`) cover core business logic, database writes, and CSV ingestion.
- **REST contracts**: `src/test/java/today/ihelio/minance/rest` uses **RestAssured** inside `@QuarkusTest` to verify resource endpoints. The shared `RestTestBase` resets/seeds the DB before each test by calling `TestDataResource`.
- **E2E Web UI**: `src/test/java/today/ihelio/minance/webui` contains Playwright-based E2E tests organized by feature, testing full user workflows across the integrated stack.
- Run everything with:
```bash
./mvnw test
```
or target suites via `-Dtest=...`.

## 4. Test Coverage Summary

### Frontend (TypeScript)
- **Unit Tests**: Vitest + React Testing Library (in `src/main/webui/src/components/__tests__/`)

### Backend (Java)
- **Unit Tests**: JUnit 5 for service layer
- **Integration Tests**: RestAssured for REST endpoints
- **E2E Tests**: Playwright (Java-based) for full-stack workflows

### Test Organization
E2E tests follow the Page Object pattern for maintainability:
- **Java**: `src/test/java/today/ihelio/minance/webui/pages/` (VisualizationPage.java, CategoriesPage.java, etc.)

## 5. Structure Improvements

- **Custom Hooks**: Logic extracted to `src/main/webui/src/hooks/` (e.g., `useMerchantAnalytics.ts`) to be unit-testable.
- **Service Layer**: API calls centralized in `src/main/webui/src/services/`.
- **E2E Tests**: Comprehensive Playwright tests in `src/test/java/today/ihelio/minance/webui/` testing full-stack workflows.
