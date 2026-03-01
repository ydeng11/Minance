<!-- rulesify-id: quarkus-quinoa-tdd-playwright -->
# Quarkus + Quinoa Fullstack TDD (with Playwright)

Expert guidelines for developing fullstack applications using Quarkus (Backend),
Quinoa (Frontend Engine), and React, with a strict Test-Driven Development methodology
including End-to-End (E2E) testing via Playwright.


## Core Philosophy & Architecture

• **Single Port Development:** Always run development via `mvn quarkus:dev`. Quinoa will proxy the React dev server (e.g., Vite) transparently.
• **Testing Pyramid:**
  - **E2E (Outer Loop):** Use `quarkus-playwright` to test user flows from the browser perspective.
  - **Integration (Backend):** Use `RestAssured` for API correctness.
  - **Unit (Frontend):** Use `Vitest`/`Jest` for component logic.
• **Reactive by Default:** Prefer `quarkus-resteasy-reactive` for all backend endpoints.

## E2E Testing (Playwright + Quarkus)

• **Dependency:** Use the `io.quarkiverse.playwright:quarkus-playwright` extension.
• **Test Structure:**
  - Annotate E2E test classes with `@QuarkusTest` and `@WithPlaywright`.
  - Use `@InjectPlaywright` to inject `BrowserContext` or `Page`.
  - Use `@TestHTTPResource("/")` to dynamically retrieve the running Quarkus URL (random port).
• **Quinoa Integration:**
  - Ensure Quinoa builds/serves the UI during tests. You may need to verify `quarkus.quinoa.enable-spa-routing=true` is active if testing deep links.
• **Example Pattern:**
  ```java
  @QuarkusTest
  @WithPlaywright
  public class AppFlowTest {
      @InjectPlaywright BrowserContext context;
      @TestHTTPResource("/") URL url;

      @Test
      void shouldLoginAndNavigate() {
          Page page = context.newPage();
          page.navigate(url.toString());
          assertThat(page.title()).isEqualTo("My App");
      }
  }
  ```

## Backend Guidelines (Quarkus)

• **Project Structure:** Keep frontend code in `src/main/webui` (Quinoa default).
• **Testing Strategy:**
  - Use `Testcontainers` for database integration tests (avoid mocking DB).
  - Use Constructor Injection for all CDI beans (`@ApplicationScoped`).

## Frontend Guidelines (Quinoa + React)

• **Package.json Scripts:** Ensure `build` (for prod) and `start`/`dev` (for Live Coding) scripts exist.
• **API Calls:** Configure Axios/Fetch to use relative paths (`/api/...`) to work in both Dev (proxied) and Prod (static serve).

## Fullstack TDD Workflow

1. **Red (E2E):** Create `AppFlowTest.java`. Assert that clicking "Login" shows the dashboard. Run -> Fail (Button missing).
2. **Red (Backend):** Create `AuthTest.java` (RestAssured). Assert `POST /api/login` works. Run -> Fail (404).
3. **Green (Backend):** Implement `AuthResource.java`. Run Backend Test -> Pass.
4. **Green (Frontend):** Implement React Login form calling `/api/login`.
5. **Green (E2E):** Run `AppFlowTest.java` -> Pass (User can now log in via UI).

