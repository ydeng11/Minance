<!-- rulesify-id: playwright-quarkus -->
# Quarkus Playwright & Quinoa E2E Testing Guide

Detailed guide for implementing reliable End-to-End (E2E) tests in Quarkus applications using Playwright for browser automation and Quinoa for frontend management.


## Guidelines

### 1. Dependency and Configuration
* **Dependencies**: Ensure `io.quarkiverse.quinoa:quarkus-quinoa` and `io.quarkiverse.playwright:quarkus-playwright` are included in `pom.xml`.
* **Scope**: The Playwright dependency and `quarkus-junit5` must use `<scope>test</scope>`.
* **Quinoa Test Profile**: For testing the frontend served by Quinoa, ensure the test is run in a profile that enables the UI build/serve process (e.g., using a custom `QuarkusTestProfile` or ensuring Quinoa is configured to run during tests if not using `quarkus-quinoa-testing`).

### 2. Test Structure and Injection
* **Test Annotations**: Always annotate the test class with `@QuarkusTest` and `@WithPlaywright`.
* **Context Injection**: Inject the browser context using `@InjectPlaywright BrowserContext context;`. Using `BrowserContext` ensures isolated sessions for each test.
* **URL Resolution**: Use `@TestHTTPResource("/") URL index;` to dynamically and safely retrieve the correct URL and port for the running Quarkus application. **Avoid** hardcoding `localhost:8080`.

### 3. Synchronization and Best Practices
* **Avoid Hard Waits**: Never use `Thread.sleep()` or fixed delays. Rely on Playwright's auto-waiting mechanism.
* **Dynamic Waiting**: Use explicit waits for asynchronous content loaded by Quinoa's SPA:
    * `page.waitForLoadState()` after navigation.
    * `page.waitForSelector(".my-element")` or Playwright's Locator assertions (e.g., `expect(locator).toBeVisible()`) to ensure dynamic elements are ready.
* **Debugging**: To visually debug a failing test, temporarily set the annotation to `@WithPlaywright(debug = true)`.

### 4. CI/CD Environment
* **Browser Setup**: In Continuous Integration (CI) environments, ensure the necessary browser dependencies are installed before tests run using the Playwright CLI:
    * `mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install-deps chromium"`

## Code Example

package org.acme.e2e;

import com.microsoft.playwright.*;
import io.quarkiverse.playwright.InjectPlaywright;
import io.quarkiverse.playwright.WithPlaywright;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import java.net.URL;

@QuarkusTest
@WithPlaywright(browser = "chromium", headless = true)
public class QuinoaE2ETest {

    @InjectPlaywright
    BrowserContext context;

    @TestHTTPResource("/")
    URL index;

    @Test
    public void testWebUIInteraction() {
        // 1. Create a new isolated page
        final Page page = context.newPage();

        // 2. Navigate to the application root URL
        page.navigate(index.toString());

        // 3. Wait for the SPA content (Quinoa served) to load and render
        page.waitForSelector("#app-root-element");

        // 4. Perform an interaction and assertion
        Locator titleLocator = page.locator("h1");
        Assertions.assertEquals("Welcome to My Quinoa App", titleLocator.innerText());
    }
}

