package today.ihelio.minance.webui;

import java.net.URL;

import org.junit.jupiter.api.BeforeAll;

import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.WaitForSelectorState;

import io.quarkiverse.playwright.InjectPlaywright;
import io.quarkus.test.common.http.TestHTTPResource;
import jakarta.inject.Inject;
import today.ihelio.minance.service.AccountService;
import today.ihelio.minance.service.BankService;
import today.ihelio.minance.service.CategoryMappingService;
import today.ihelio.minance.service.TransactionService;
import today.ihelio.minance.testutil.TestDataResource;

/**
 * Base class for all E2E tests providing shared infrastructure.
 * All E2E test classes should extend this class and must include:
 * - @QuarkusTest
 * - @TestProfile(QuinoaTestProfiles.Enable.class)
 * - @WithPlaywright
 * - @TestInstance(TestInstance.Lifecycle.PER_CLASS)
 */
public abstract class BaseE2ETest {

	@InjectPlaywright
	protected BrowserContext context;

	@TestHTTPResource("/")
	protected URL appUrl;

	@Inject
	protected BankService bankService;

	@Inject
	protected AccountService accountService;

	@Inject
	protected CategoryMappingService categoryMappingService;

	@Inject
	protected TransactionService transactionService;

	@Inject
	protected TestDataResource testDataResource;

	@BeforeAll
	void seedDatabase() {
		testDataResource.seedDatabase();
		// Ensure seeding completes and database is ready
		// Small delay to ensure all database operations are committed
		try {
			Thread.sleep(100);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
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
