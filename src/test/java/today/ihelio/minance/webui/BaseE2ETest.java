package today.ihelio.minance.webui;

import java.net.URI;
import java.net.URL;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.BeforeAll;

import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

import io.quarkiverse.playwright.InjectPlaywright;
import io.quarkus.test.common.http.TestHTTPResource;

/**
 * Base class for all E2E tests providing shared infrastructure.
 * All E2E test classes should extend this class and must include:
 * - @QuarkusIntegrationTest
 * - @TestProfile(QuinoaTestProfiles.Enable.class)
 * - @WithPlaywright
 * - @TestInstance(TestInstance.Lifecycle.PER_CLASS)
 */
public abstract class BaseE2ETest {

	@InjectPlaywright
	protected BrowserContext context;

	@TestHTTPResource("/")
	protected URL appUrl;

	@BeforeAll
	void seedDatabase() {
		try {
			// Call the test seed endpoint via HTTP
			String seedUrl = appUrl.toString().replaceAll("/$", "") + "/test/seed";
			HttpClient client = HttpClient.newHttpClient();
			HttpRequest request = HttpRequest.newBuilder()
					.uri(URI.create(seedUrl))
					.POST(HttpRequest.BodyPublishers.noBody())
					.build();

			HttpResponse<String> response = client.send(request,
					HttpResponse.BodyHandlers.ofString());

			if (response.statusCode() != 200) {
				throw new RuntimeException("Failed to seed database: HTTP " + response.statusCode());
			}

			// Ensure seeding completes and database is ready
			// Small delay to ensure all database operations are committed
			Thread.sleep(100);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new RuntimeException("Database seeding was interrupted", e);
		} catch (Exception e) {
			throw new RuntimeException("Failed to seed database via HTTP", e);
		}
	}

	/**
	 * Wait for loading indicators to disappear on a page.
	 *
	 * @param page The Playwright page
	 */
	protected void waitForLoading(Page page) {
		try {
			page.waitForSelector("text=Loading",
					new Page.WaitForSelectorOptions()
							.setState(WaitForSelectorState.HIDDEN)
							.setTimeout(10000));
		} catch (Exception e) {
			// Loading indicator may not exist or already disappeared, continue
		}

		try {
			page.waitForSelector("text=Loading transactions...",
					new Page.WaitForSelectorOptions()
							.setState(WaitForSelectorState.HIDDEN)
							.setTimeout(10000));
		} catch (Exception e) {
			// Loading indicator may not exist or already disappeared, continue
		}
	}

	/**
	 * Navigate to a specific path and wait for the page to load.
	 *
	 * @param page The Playwright page
	 * @param path The path to navigate to (e.g., "/visualization")
	 */
	protected void navigateAndWait(Page page, String path) {
		String fullUrl = appUrl.toString().replaceAll("/$", "") + path;
		page.navigate(fullUrl);
		page.waitForLoadState();
		waitForLoading(page);
	}

	/**
	 * Get the full URL for a given path.
	 *
	 * @param path The path (e.g., "/visualization")
	 * @return The full URL
	 */
	protected String getUrl(String path) {
		return appUrl.toString().replaceAll("/$", "") + path;
	}
}
